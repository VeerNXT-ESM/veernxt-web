import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { ChevronLeft, ChevronRight, Volume2, VolumeX, Gauge, CheckCircle2, BookOpen, Sparkles } from 'lucide-react';
import { useReaderTheme } from '../theme/useReaderTheme';
import { usePagination } from './usePagination';
import { playFlipSound, unlockAudio } from './pageSound';
import './PaginatedReader.css';

const SPEEDS = { slow: 1050, normal: 700, fast: 380 };
const PAD_X = 42;
const PAD_TOP = 46; // running header
const PAD_BOTTOM = 48; // page folio
const COVER = 14; // hardcover thickness

const Page = forwardRef(function Page({ children, number, side, runHead }, ref) {
  return (
    <div className={`pr-page pr-paper-vars pr-side-${side}`} ref={ref}>
      <div className="pr-run">{runHead}</div>
      <div className="pr-page-inner">{children}</div>
      <div className="pr-foot">
        <span className="pr-orn">·</span>
        <span className="pr-folio">{number}</span>
        <span className="pr-orn">·</span>
      </div>
    </div>
  );
});

function useViewport() {
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return vp;
}

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

/**
 * Paged reading for one chapter.
 * `mode`: 'normal' (PDF-style single page) or 'book' (traditional hardcover book).
 */
export default function PaginatedReader({
  mode, items, bookTitle, chapterIndex, chapterCount, chapterTitle, chapters,
  initialPage, onPageChange, onChapterStep, onChapterSelect,
  soundOn, onSoundChange, speed, onSpeedChange, activeBlockId,
}) {
  const { fontScale, themeId } = useReaderTheme();
  const fontKey = `${fontScale}-${themeId}`;
  const vp = useViewport();
  const isBook = mode === 'book';
  const isSpread = isBook && vp.w >= 1000;

  const pageH = clamp(vp.h - 170, 520, 920);
  const pageW = isBook
    ? (isSpread ? clamp((vp.w - 180) / 2, 380, 580) : clamp(vp.w - 48, 300, 560))
    : clamp(vp.w - 48, 300, 780);
  const contentW = pageW - PAD_X * 2;
  const contentH = pageH - PAD_TOP - PAD_BOTTOM;

  const { measureRef, pages: rawPages } = usePagination(items, contentH, `${contentW}|${fontKey}|${chapterIndex}`);

  const canPrevChapter = chapterIndex > 0;
  const canNextChapter = chapterIndex < chapterCount - 1;

  // Build the complete book page array.
  // In spread mode, pages must always form complete pairs.
  // We ALWAYS add an elegant Chapter Conclusion spread so content never ends abruptly,
  // and we add transition pages when a next chapter exists so the user can FLIP forward.
  const pages = useMemo(() => {
    if (!rawPages || rawPages.length === 0) return [];

    const result = [...rawPages];

    if (isSpread) {
      if (rawPages.length % 2 !== 0) {
        // Odd number of raw content pages (e.g. 9):
        // Page 9 is on the left.
        // Add 1 page on the right: the Chapter Conclusion leaf.
        result.push([{ isEndLeaf: true, subType: 'next' }]);
        // If there's a next chapter, add a 2-page preview spread so the right page CAN curl & flip!
        if (canNextChapter) {
          result.push([{ isNextChapterLeaf: true, side: 'left' }]);
          result.push([{ isNextChapterLeaf: true, side: 'right' }]);
        }
      } else {
        // Even number of raw content pages (e.g. 10, as in SSC Reasoning):
        // Spread (9, 10) is the last content spread.
        // Append a dedicated 2-page Chapter Conclusion spread:
        // Page 11 (left): Chapter summary & completion seal
        // Page 12 (right): Up Next Chapter & Continue button
        result.push([{ isEndLeaf: true, subType: 'summary' }]);
        result.push([{ isEndLeaf: true, subType: 'next' }]);
        // If there's a next chapter, add 2 transition pages so Page 12 CAN curl & flip into next chapter!
        if (canNextChapter) {
          result.push([{ isNextChapterLeaf: true, side: 'left' }]);
          result.push([{ isNextChapterLeaf: true, side: 'right' }]);
        }
      }
    } else {
      // Single page mode (PDF-style / portrait screen)
      result.push([{ isEndLeaf: true, subType: 'next' }]);
    }

    return result;
  }, [rawPages, isSpread, canNextChapter]);

  // Identify where content ends and where the chapter conclusion / transition spreads start
  const conclusionPageIndex = useMemo(() => {
    if (!rawPages || rawPages.length === 0) return 0;
    return rawPages.length;
  }, [rawPages]);

  const [pageIndex, setPageIndex] = useState(typeof initialPage === 'number' ? initialPage : 0);
  const [dir, setDir] = useState('next');
  const [isChapterTransitioning, setIsChapterTransitioning] = useState(false);
  const pendingEnd = useRef(initialPage === 'end');
  const flipRef = useRef(null);
  const total = pages.length;

  const soundRef = useRef(soundOn);
  useEffect(() => { soundRef.current = soundOn; }, [soundOn]);

  useEffect(() => {
    const unlock = () => unlockAudio();
    const evs = ['pointerdown', 'keydown', 'touchstart'];
    evs.forEach((e) => window.addEventListener(e, unlock, { passive: true }));
    unlockAudio();
    return () => evs.forEach((e) => window.removeEventListener(e, unlock));
  }, []);

  const sound = useCallback(() => {
    if (soundRef.current) playFlipSound();
  }, []);

  useEffect(() => {
    if (!total) return;
    if (pendingEnd.current) {
      pendingEnd.current = false;
      // In spread mode, jump to the last readable spread
      const endTarget = isSpread ? Math.max(0, total - 2) : total - 1;
      setPageIndex(endTarget);
    } else {
      setPageIndex((p) => clamp(p, 0, total - 1));
    }
  }, [total, isSpread]);

  useEffect(() => {
    if (total) onPageChange?.(pageIndex);
  }, [pageIndex, total, onPageChange]);

  // True end is reached when there is no next chapter AND we are on the final spread
  const maxSpreadIndex = isSpread ? Math.max(0, total - 2) : Math.max(0, total - 1);
  const atStart = pageIndex <= 0;
  const atEnd = pageIndex >= maxSpreadIndex;

  const handleAdvanceChapter = useCallback(() => {
    sound();
    setIsChapterTransitioning(true);
    setTimeout(() => {
      onChapterStep?.(1);
      setIsChapterTransitioning(false);
    }, 420);
  }, [sound, onChapterStep]);

  const handlePreviousChapter = useCallback(() => {
    sound();
    setIsChapterTransitioning(true);
    setTimeout(() => {
      onChapterStep?.(-1);
      setIsChapterTransitioning(false);
    }, 420);
  }, [sound, onChapterStep]);

  const next = useCallback(() => {
    if (!total || isChapterTransitioning) return;

    if (isBook) {
      // In book mode, if we're on the conclusion spread and can advance:
      if (canNextChapter && pageIndex >= conclusionPageIndex - (isSpread ? 1 : 0)) {
        // Try flipping the physical leaf forward
        const pf = flipRef.current?.pageFlip();
        if (pf && pf.getCurrentPageIndex() < total - 1) {
          pf.flipNext();
          return;
        }
        handleAdvanceChapter();
        return;
      }

      // Normal flip within chapter
      if (pageIndex < maxSpreadIndex) {
        flipRef.current?.pageFlip()?.flipNext();
        return;
      }

      if (canNextChapter) {
        handleAdvanceChapter();
      }
      return;
    }

    // Single page mode:
    if (pageIndex >= total - 1) {
      if (canNextChapter) {
        handleAdvanceChapter();
      }
      return;
    }
    sound();
    setDir('next');
    setPageIndex((p) => Math.min(total - 1, p + 1));
  }, [total, isChapterTransitioning, isBook, canNextChapter, pageIndex, conclusionPageIndex, isSpread, maxSpreadIndex, handleAdvanceChapter, sound]);

  const prev = useCallback(() => {
    if (!total || isChapterTransitioning) return;
    if (atStart) {
      if (canPrevChapter) {
        handlePreviousChapter();
      }
      return;
    }
    if (isBook) {
      flipRef.current?.pageFlip()?.flipPrev();
      return;
    }
    sound();
    setDir('prev');
    setPageIndex((p) => Math.max(0, p - 1));
  }, [total, atStart, canPrevChapter, isBook, isChapterTransitioning, handlePreviousChapter, sound]);

  const goTo = useCallback((n) => {
    const t = clamp(n, 0, Math.max(0, total - 1));
    if (isBook) {
      flipRef.current?.pageFlip()?.flip(t);
      return;
    }
    sound();
    setDir(t >= pageIndex ? 'next' : 'prev');
    setPageIndex(t);
  }, [total, isBook, pageIndex, sound]);

  // Auto-flip page when TTS advances to a block on a different page
  useEffect(() => {
    if (!activeBlockId || !pages || pages.length === 0) return;

    let targetPageIndex = -1;
    for (let p = 0; p < pages.length; p++) {
      const pageEntries = pages[p];
      if (Array.isArray(pageEntries)) {
        const found = pageEntries.some((e) => {
          const itemKey = items[e.i]?.key;
          return itemKey === activeBlockId || itemKey?.startsWith(activeBlockId);
        });
        if (found) {
          targetPageIndex = p;
          break;
        }
      }
    }

    if (targetPageIndex !== -1) {
      if (isSpread) {
        const currentSpreadStart = Math.floor(pageIndex / 2) * 2;
        const targetSpreadStart = Math.floor(targetPageIndex / 2) * 2;
        if (currentSpreadStart !== targetSpreadStart) {
          goTo(targetSpreadStart);
        }
      } else {
        if (pageIndex !== targetPageIndex) {
          goTo(targetPageIndex);
        }
      }
    }
  }, [activeBlockId, pages, items, isSpread, pageIndex, goTo]);

  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  // Touch / pointer swipe handling for normal mode
  const touch = useRef(null);
  const onPointerDown = (e) => { touch.current = { x: e.clientX, y: e.clientY }; };
  const onPointerUp = (e) => {
    const s = touch.current;
    touch.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      if (dx < 0) next(); else prev();
    }
  };

  const reduceMotion = useMemo(
    () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const renderEntry = (e, k) => {
    const it = items[e.i];
    if (!it) return null;
    const whole = e.start === 0 && e.end === e.h;
    if (e.scale === 1 && whole) return <div className={`pr-item ${it.cls || ''}`} key={k}>{it.el}</div>;
    const isActive = activeBlockId && (it.key === activeBlockId || it.key?.startsWith(activeBlockId));
    if (e.scale !== 1) {
      return (
        <div className={`pr-fit ${isActive ? 'bk-tts-active' : ''}`} key={k} style={{ height: Math.min(contentH, e.h * e.scale) }}>
          <div
            className={it.cls || ''}
            style={{ width: `${100 / e.scale}%`, transform: `scale(${e.scale})`, transformOrigin: 'top left' }}
          >{it.el}</div>
        </div>
      );
    }
    return (
      <div className={`pr-fit ${isActive ? 'bk-tts-active' : ''}`} key={k} style={{ height: e.end - e.start }}>
        <div className={it.cls || ''} style={{ transform: `translateY(${-e.start}px)` }}>{it.el}</div>
      </div>
    );
  };

  const nextChapNumber = chapterIndex + 2;
  const nextChapTitle = chapters?.[chapterIndex + 1]?.title || `Chapter ${nextChapNumber}`;

  const renderPage = (entries, n) => {
    const isEndLeaf = entries.length === 1 && entries[0].isEndLeaf;
    const isNextChapterLeaf = entries.length === 1 && entries[0].isNextChapterLeaf;
    const subType = entries[0]?.subType || 'next';
    const side = isSpread ? (n % 2 === 0 ? 'left' : 'right') : 'single';

    const runHead = isEndLeaf || isNextChapterLeaf
      ? 'CHAPTER CONCLUSION'
      : side === 'left' || (side === 'single' && n % 2 === 0)
        ? bookTitle
        : chapterTitle;

    return (
      <Page key={n} number={n + 1} side={side} runHead={runHead}>
        {isEndLeaf ? (
          <div className="pr-end-leaf">
            {subType === 'summary' ? (
              <div className="pr-end-summary-pane">
                <div className="pr-end-ornament">❦  ✦  ❦</div>
                <h3 className="pr-end-title">Chapter {chapterIndex + 1} Complete</h3>
                <p className="pr-end-chap-name">{chapterTitle}</p>
                <div className="pr-end-stats-card">
                  <div className="pr-end-stat-row">
                    <span className="pr-end-stat-lbl">Progress</span>
                    <span className="pr-end-stat-val">{Math.round(((chapterIndex + 1) / chapterCount) * 100)}%</span>
                  </div>
                  <div className="pr-end-stat-row">
                    <span className="pr-end-stat-lbl">Chapter</span>
                    <span className="pr-end-stat-val">{chapterIndex + 1} of {chapterCount}</span>
                  </div>
                </div>
                <p className="pr-end-subtext">You have completed all sections and practice exercises in this chapter.</p>
              </div>
            ) : (
              <div className="pr-end-action-pane">
                <div className="pr-end-ornament">❦  ✦  ❦</div>
                <h3 className="pr-end-title">End of Chapter {chapterIndex + 1}</h3>
                <p className="pr-end-chap-name">{chapterTitle}</p>
                {canNextChapter ? (
                  <div className="pr-end-next-box">
                    <span className="pr-end-next-tag">UP NEXT · CHAPTER {nextChapNumber}</span>
                    <h4 className="pr-end-next-title">{nextChapTitle}</h4>
                    <button
                      type="button"
                      className="pr-end-btn"
                      onClick={() => {
                        if (isBook) {
                          // Trigger physical page flip animation into next chapter
                          const pf = flipRef.current?.pageFlip();
                          if (pf && pf.getCurrentPageIndex() < total - 1) {
                            pf.flipNext();
                            return;
                          }
                        }
                        handleAdvanceChapter();
                      }}
                    >
                      <span>Continue to Next Chapter</span>
                      <ChevronRight size={18} />
                    </button>
                    <span className="pr-end-hint">Click button or turn page to continue →</span>
                  </div>
                ) : (
                  <div className="pr-end-complete-box">
                    <div className="pr-end-badge"><CheckCircle2 size={36} color="#166534" /></div>
                    <h4 className="pr-end-complete-title">Book Completed!</h4>
                    <p className="pr-end-complete-sub">You have successfully mastered all {chapterCount} chapters of this study material.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : isNextChapterLeaf ? (
          <div className="pr-next-chap-leaf">
            <div className="pr-next-chap-inner">
              <span className="pr-next-tag">UP NEXT</span>
              <h2 className="pr-next-head">Chapter {nextChapNumber}</h2>
              <h3 className="pr-next-subhead">{nextChapTitle}</h3>
              <div className="pr-next-loading-pill">
                <Sparkles size={14} className="pr-sparkle-anim" />
                <span>Turning to Chapter {nextChapNumber}…</span>
              </div>
            </div>
          </div>
        ) : (
          entries.map((e, k) => renderEntry(e, `${e.i}-${e.start}-${k}`))
        )}
      </Page>
    );
  };

  const flipKey = `${pageW}x${pageH}-${total}-${isSpread}-${chapterIndex}`;
  const shownLabel = isSpread && pageIndex + 2 <= total && pageIndex > 0
    ? `${pageIndex + 1}–${pageIndex + 2}` : `${pageIndex + 1}`;
  const percent = total > 1 ? Math.round(((pageIndex + 1) / total) * 100) : 100;

  return (
    <div className={`pr-desk pr-mode-${mode}`}>
      <div className="pr-measure-clip" aria-hidden="true">
        <div className="pr-measurer pr-paper-vars" ref={measureRef} style={{ width: contentW }}>
          {items.map((it) => <div className={`pr-item ${it.cls || ''}`} key={it.key}>{it.el}</div>)}
        </div>
      </div>

      <div className={`pr-stage ${isChapterTransitioning ? 'pr-stage-transitioning' : ''}`} style={{ minHeight: pageH + COVER * 2 + 18 }}>
        <button
          type="button"
          className="pr-arrow pr-arrow-l"
          onClick={prev}
          disabled={atStart && !canPrevChapter}
          aria-label="Previous page"
        >
          <ChevronLeft size={28} />
        </button>

        {!total ? (
          <div className="pr-empty" style={{ width: pageW, height: pageH }}>Preparing book pages…</div>
        ) : isBook ? (
          <div className="pr-cover" style={{ padding: COVER }}>
            <div className="pr-block" style={{ width: isSpread ? pageW * 2 : pageW, height: pageH }}>
              <HTMLFlipBook
                key={flipKey}
                ref={flipRef}
                width={pageW}
                height={pageH}
                size="fixed"
                minWidth={pageW}
                maxWidth={pageW}
                minHeight={pageH}
                maxHeight={pageH}
                startPage={pageIndex}
                showCover={false}
                usePortrait={!isSpread}
                drawShadow
                maxShadowOpacity={0.45}
                flippingTime={reduceMotion ? 1 : SPEEDS[speed] || SPEEDS.normal}
                useMouseEvents
                swipeDistance={25}
                showPageCorners
                mobileScrollSupport={false}
                clickEventForward={false}
                onFlip={(e) => {
                  const newPage = e.data;
                  setPageIndex(newPage);
                  // If user flipped onto the next-chapter transition spread, advance to next chapter
                  if (canNextChapter && newPage >= total - (isSpread ? 2 : 1)) {
                    handleAdvanceChapter();
                  }
                }}
                onChangeState={(e) => {
                  if (e.data === 'flipping') {
                    sound();
                  }
                }}
                className="pr-flipbook"
                style={{}}
              >
                {pages.map((p, n) => renderPage(p, n))}
              </HTMLFlipBook>
              {isSpread && <div className="pr-spine" />}
            </div>
          </div>
        ) : (
          <div
            className="pr-single"
            style={{ width: pageW, height: pageH }}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
          >
            <div
              key={pageIndex}
              className={`pr-single-anim ${reduceMotion ? 'pr-fade' : `pr-slide-${dir}`}`}
              style={{ animationDuration: `${Math.round((SPEEDS[speed] || 700) * 0.45)}ms` }}
            >
              {renderPage(pages[pageIndex] || [], pageIndex)}
            </div>
          </div>
        )}

        <button
          type="button"
          className="pr-arrow pr-arrow-r"
          onClick={next}
          disabled={atEnd && !canNextChapter}
          aria-label="Next page"
        >
          <ChevronRight size={28} />
        </button>
      </div>

      <div className="pr-controls">
        {chapters && chapters.length > 1 && (
          <select
            className="pr-chapsel"
            value={chapterIndex}
            aria-label="Chapter"
            onChange={(e) => onChapterSelect?.(parseInt(e.target.value, 10))}
          >
            {chapters.map((c, i) => <option key={c.id || i} value={i}>{i + 1}. {c.title}</option>)}
          </select>
        )}
        <span className="pr-count">Page {shownLabel} of {total || '…'}</span>
        <input
          className="pr-progress"
          type="range"
          min={0}
          max={Math.max(0, total - 1)}
          value={Math.min(pageIndex, Math.max(0, total - 1))}
          onChange={(e) => goTo(parseInt(e.target.value, 10))}
          aria-label="Page progress"
          style={{ '--pr-fill': total > 1 ? `${(pageIndex / (total - 1)) * 100}%` : '100%' }}
        />
        <span className="pr-pct">{percent}%</span>
        <button
          type="button"
          className="pr-ctl"
          onClick={() => {
            unlockAudio();
            onSoundChange(!soundOn);
            if (!soundOn) playFlipSound();
          }}
          title={soundOn ? 'Mute page flip sound' : 'Enable page flip sound'}
          aria-label="Toggle page sound"
        >
          {soundOn ? <Volume2 size={17} /> : <VolumeX size={17} />}
        </button>
        <label className="pr-speed" title="Page-turn animation speed">
          <Gauge size={15} />
          <select value={speed} onChange={(e) => onSpeedChange(e.target.value)} aria-label="Page turn speed">
            <option value="slow">Slow</option>
            <option value="normal">Normal</option>
            <option value="fast">Fast</option>
          </select>
        </label>
      </div>
    </div>
  );
}
