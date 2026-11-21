import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Packs rendered items into fixed-height pages — no scrolling inside a page.
 * Items flow naturally across pages with line-level snapping for text.
 */
export function usePagination(items, contentHeight, depsKey) {
  const measureRef = useRef(null);
  const [pages, setPages] = useState([]);
  const [sig, setSig] = useState('');
  const lastSig = useRef('');
  const itemsRef = useRef(items);
  useLayoutEffect(() => { itemsRef.current = items; });
  const itemCount = items.length;

  const MIN_SPLIT = 60; // minimum space needed to place a split fragment

  const ROW_CONTAINER_SELECTOR =
    '.bk-q-row, .bk-option-line, .bk-options-inline-grid, .bk-section-banner, .bk-explanation-row, .bk-stmt-heading, .bk-conclusion-heading, .bk-roman-stmt, .bk-num-stmt, .bk-bullet-stmt, .bk-plain-stmt, .bk-topic-bar, li';

  const lineTops = (node) => {
    const base = node.getBoundingClientRect().top;
    const rawTops = [];
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    let t = walker.nextNode();
    while (t) {
      if (t.nodeValue && t.nodeValue.trim()) {
        range.selectNodeContents(t);
        const parentEl = t.parentElement;
        const rowEl = parentEl?.closest ? parentEl.closest(ROW_CONTAINER_SELECTOR) : null;
        const rowTop = rowEl && node.contains(rowEl)
          ? Math.max(0, Math.round(rowEl.getBoundingClientRect().top - base))
          : null;

        Array.from(range.getClientRects()).forEach((r) => {
          if (r.height > 2) {
            let top = Math.max(0, Math.round(r.top - base));
            // If this text rect is on the first visual line of a styled row container,
            // snap the cut point to the top of the row container so its border/padding/badge is never sliced.
            if (rowTop !== null && Math.abs(top - rowTop) <= 14) {
              top = Math.min(top, rowTop);
            }
            rawTops.push(top);
          }
        });
      }
      t = walker.nextNode();
    }
    rawTops.sort((a, b) => a - b);
    // Merge rects that belong to the same visual line (within 8px vertically)
    const merged = [];
    for (const top of rawTops) {
      if (merged.length === 0 || top - merged[merged.length - 1] > 8) {
        merged.push(top);
      }
    }
    return merged;
  };

  const compute = useCallback(() => {
    const root = measureRef.current;
    if (!root || !contentHeight || itemCount === 0) {
      if (lastSig.current !== 'empty') {
        lastSig.current = 'empty';
        setSig('empty');
        setPages([]);
      }
      return;
    }
    const nodes = root.children;
    const result = [];
    let cur = [];
    let used = 0;
    const flush = () => { if (cur.length) result.push(cur); cur = []; used = 0; };

    // Flush current page while keeping any trailing headings attached to the next block on the new page
    const flushKeepingTrailingHeadings = () => {
      if (!cur.length) return;
      let trailingHeadings = [];
      while (cur.length > 0 && itemsRef.current[cur[cur.length - 1].i]?.isHeading) {
        trailingHeadings.unshift(cur.pop());
      }
      if (cur.length === 0) {
        // The page only had headings; keep them if there's still room, otherwise flush them
        cur = trailingHeadings;
        flush();
        return;
      }
      flush();
      for (const hEntry of trailingHeadings) {
        cur.push(hEntry);
        used += (hEntry.end - hEntry.start);
      }
    };

    for (let i = 0; i < nodes.length; i++) {
      const nh = nodes[i].offsetHeight;
      const itemData = itemsRef.current[i] || {};
      const canSplit = !!itemData.splittable;
      const isHeading = !!itemData.isHeading;

      // Avoid orphan heading: don't start a heading if less than 110px room left
      if (isHeading && cur.length && (contentHeight - used < 110)) {
        flush();
      }

      // Fits completely in remaining page space
      if (used + nh <= contentHeight) {
        cur.push({ i, h: nh, start: 0, end: nh, scale: 1 });
        used += nh;
        continue;
      }

      // Can be split at a line boundary
      if (canSplit && nh > MIN_SPLIT) {
        const tops = lineTops(nodes[i]);
        let start = 0;
        let avail = contentHeight - used;
        if (avail < MIN_SPLIT && cur.length) {
          flushKeepingTrailingHeadings();
          avail = contentHeight - used;
          if (avail < MIN_SPLIT && cur.length) {
            flush();
            avail = contentHeight;
          }
        }

        // If the entire block now fits on the new page (below any carried-over heading), place it whole
        if (nh - start <= avail) {
          cur.push({ i, h: nh, start: 0, end: nh, scale: 1 });
          used += nh;
          continue;
        }

        let guard = 0;
        while (nh - start > avail && guard++ < 150) {
          let cut = -1;
          // Look for a cut that leaves at least 2 lines on the next page
          for (let k = tops.length - 1; k >= 0; k--) {
            const linesRemaining = tops.length - k;
            if (tops[k] > start + 12 && tops[k] <= start + avail && linesRemaining >= 2) {
              cut = tops[k];
              break;
            }
          }
          if (cut < 0) {
            // If we have items on the current page, push this paragraph (and any trailing heading above it) to a fresh page
            if (cur.length) {
              const prevUsed = used;
              if (start === 0) {
                flushKeepingTrailingHeadings();
              } else {
                flush();
              }
              // If cur still has carried-over headings and we didn't free any space, flush the headings too
              if (used === prevUsed && cur.length) {
                flush();
              }
              avail = contentHeight - used;
              if (nh - start <= avail) {
                break;
              }
              continue;
            }
            // On an empty page, fallback to whatever fits
            for (let k = tops.length - 1; k >= 0; k--) {
              if (tops[k] > start + 12 && tops[k] <= start + avail) {
                cut = tops[k];
                break;
              }
            }
            if (cut < 0) cut = Math.min(nh, start + avail);
          }
          cur.push({ i, h: nh, start, end: cut, scale: 1 });
          flush();
          start = cut;
          avail = contentHeight;
        }

        if (start < nh) {
          cur.push({ i, h: nh, start, end: nh, scale: 1 });
          used += (nh - start);
        }
        continue;
      }

      // Block doesn't fit in remaining space: flush to start fresh page (carrying over any orphan heading)
      if (cur.length) {
        if (!isHeading) {
          flushKeepingTrailingHeadings();
          if (used + nh > contentHeight && cur.length) {
            flush();
          }
        } else {
          flush();
        }
      }

      // If larger than a whole page, scale down to fit cleanly without scroll
      if (nh > contentHeight) {
        if (cur.length) flush();
        result.push([{ i, h: nh, start: 0, end: nh, scale: contentHeight / nh }]);
      } else {
        cur.push({ i, h: nh, start: 0, end: nh, scale: 1 });
        used += nh;
      }
    }
    flush();

    const nextSig = result.map((p) => p.map((e) => `${e.i}:${e.start}-${e.end}:${e.scale.toFixed(2)}`).join(',')).join('|');
    if (nextSig !== lastSig.current) {
      lastSig.current = nextSig;
      setSig(nextSig);
      setPages(result);
    }
  }, [itemCount, contentHeight]);

  useLayoutEffect(() => {
    lastSig.current = '';
    compute();
  }, [compute, depsKey]);

  useEffect(() => {
    const root = measureRef.current;
    if (!root) return undefined;
    const onImgEvent = (e) => {
      if (e.target && e.target.tagName === 'IMG') {
        compute();
      }
    };
    root.addEventListener('load', onImgEvent, true);
    root.addEventListener('error', onImgEvent, true);
    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => compute());
      ro.observe(root);
    }
    return () => {
      root.removeEventListener('load', onImgEvent, true);
      root.removeEventListener('error', onImgEvent, true);
      if (ro) ro.disconnect();
    };
  }, [compute, depsKey]);

  useEffect(() => {
    if (document.fonts?.ready) document.fonts.ready.then(() => compute());
  }, [compute, depsKey]);

  return { measureRef, pages, sig };
}
