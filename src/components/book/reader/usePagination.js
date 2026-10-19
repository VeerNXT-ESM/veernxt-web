import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Packs rendered items into fixed-height pages — no scrolling inside a page.
 * Items flow naturally across pages with line-level snapping for text.
 */
export function usePagination(items, contentHeight, depsKey) {
  const measureRef = useRef(null);
  const [pages, setPages] = useState([]);
  const lastSig = useRef('');
  const itemsRef = useRef(items);
  useLayoutEffect(() => { itemsRef.current = items; });
  const itemCount = items.length;

  const MIN_SPLIT = 60; // minimum space needed to place a split fragment

  const lineTops = (node) => {
    const base = node.getBoundingClientRect().top;
    const tops = new Set();
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    let t = walker.nextNode();
    while (t) {
      if (t.nodeValue && t.nodeValue.trim()) {
        range.selectNodeContents(t);
        Array.from(range.getClientRects()).forEach((r) => {
          if (r.height > 2) tops.add(Math.round(r.top - base));
        });
      }
      t = walker.nextNode();
    }
    return Array.from(tops).sort((a, b) => a - b);
  };

  const compute = useCallback(() => {
    const root = measureRef.current;
    if (!root || !contentHeight || itemCount === 0) {
      if (lastSig.current !== 'empty') {
        lastSig.current = 'empty';
        setPages([]);
      }
      return;
    }
    const nodes = root.children;
    const result = [];
    let cur = [];
    let used = 0;
    const flush = () => { if (cur.length) result.push(cur); cur = []; used = 0; };

    for (let i = 0; i < nodes.length; i++) {
      const nh = nodes[i].offsetHeight;
      const itemData = itemsRef.current[i] || {};
      const canSplit = !!itemData.splittable;
      const isHeading = !!itemData.isHeading;

      // Avoid orphan heading: don't start a heading if less than 95px room left
      if (isHeading && cur.length && (contentHeight - used < 95)) {
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
          flush();
          avail = contentHeight;
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
            // If we have items on the current page, push this whole paragraph to a fresh page
            if (cur.length) {
              flush();
              avail = contentHeight;
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

      // Block doesn't fit in remaining space: flush to start fresh page
      if (cur.length) {
        flush();
      }

      // If larger than a whole page, scale down to fit cleanly without scroll
      if (nh > contentHeight) {
        result.push([{ i, h: nh, start: 0, end: nh, scale: contentHeight / nh }]);
      } else {
        cur.push({ i, h: nh, start: 0, end: nh, scale: 1 });
        used += nh;
      }
    }
    flush();

    const sig = result.map((p) => p.map((e) => `${e.i}:${e.start}-${e.end}:${e.scale.toFixed(2)}`).join(',')).join('|');
    if (sig !== lastSig.current) {
      lastSig.current = sig;
      setPages(result);
    }
  }, [itemCount, contentHeight]);

  useLayoutEffect(() => {
    lastSig.current = '';
    compute();
  }, [compute, depsKey]);

  useEffect(() => {
    const root = measureRef.current;
    if (!root || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => compute());
    ro.observe(root);
    return () => ro.disconnect();
  }, [compute, depsKey]);

  useEffect(() => {
    if (document.fonts?.ready) document.fonts.ready.then(() => compute());
  }, [compute, depsKey]);

  return { measureRef, pages };
}
