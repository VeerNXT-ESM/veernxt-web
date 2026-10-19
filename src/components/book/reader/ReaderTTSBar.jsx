import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, Headphones, X, Volume2, Mic } from 'lucide-react';
import { getRankedVoices } from './ttsService';
import './ReaderTTSBar.css';

const SPEED_OPTIONS = [
  { label: '0.85x', value: 0.85 },
  { label: '1.0x', value: 0.96 }, // 0.96 provides optimal articulate pacing
  { label: '1.25x', value: 1.25 },
];

export default function ReaderTTSBar({
  controller,
  isOpen,
  onClose,
  onBlockChange,
}) {
  const [ttsState, setTtsState] = useState('idle'); // 'idle' | 'playing' | 'paused'
  const [currentSegment, setCurrentSegment] = useState(null);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [totalSegments, setTotalSegments] = useState(0);
  const [rateIdx, setRateIdx] = useState(1); // default 1.0x
  const [voices, setVoices] = useState([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState('');

  // Update voices on mount
  useEffect(() => {
    const updateVoices = () => {
      const v = getRankedVoices();
      setVoices(v);
      if (v.length > 0 && !selectedVoiceURI) {
        setSelectedVoiceURI(v[0].voiceURI);
      }
    };
    updateVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, [selectedVoiceURI]);

  // Connect controller callbacks via subscribe
  useEffect(() => {
    if (!controller) return;

    const unsubscribe = controller.subscribe({
      onStateChange: (st) => setTtsState(st),
      onSegmentChange: (seg, idx, total) => {
        setCurrentSegment(seg);
        setSegmentIndex(idx);
        setTotalSegments(total);
        if (seg?.blockId && onBlockChange) {
          onBlockChange(seg.blockId);
        }
      },
    });

    return unsubscribe;
  }, [controller, onBlockChange]);

  const handleTogglePlay = useCallback(() => {
    if (!controller) return;
    if (ttsState === 'playing') {
      controller.pause();
    } else {
      controller.play();
    }
  }, [controller, ttsState]);

  const handleSkipNext = useCallback(() => {
    controller?.skipNext();
  }, [controller]);

  const handleSkipPrev = useCallback(() => {
    controller?.skipPrev();
  }, [controller]);

  const handleCycleSpeed = useCallback(() => {
    if (!controller) return;
    const nextIdx = (rateIdx + 1) % SPEED_OPTIONS.length;
    setRateIdx(nextIdx);
    controller.setRate(SPEED_OPTIONS[nextIdx].value);
  }, [controller, rateIdx]);

  const handleVoiceChange = useCallback((e) => {
    const uri = e.target.value;
    setSelectedVoiceURI(uri);
    controller?.setVoice(uri);
  }, [controller]);

  if (!isOpen && ttsState === 'idle') return null;

  const progressPercent = totalSegments > 1 ? Math.round(((segmentIndex + 1) / totalSegments) * 100) : 0;

  return (
    <div className="rtts-dock" role="region" aria-label="Text-to-Speech audio reader">
      <div className="rtts-inner">
        {/* Top Header Row */}
        <div className="rtts-top-row">
          <div className="rtts-status-group">
            <span className={`rtts-badge ${ttsState === 'paused' ? 'paused' : ''}`}>
              <span className="rtts-equalizer">
                <span className="rtts-eq-bar" />
                <span className="rtts-eq-bar" />
                <span className="rtts-eq-bar" />
              </span>
              <span>{ttsState === 'playing' ? 'Reading Aloud' : ttsState === 'paused' ? 'Paused' : 'Ready'}</span>
            </span>
          </div>

          <div className="rtts-top-actions">
            {voices.length > 0 && (
              <select
                className="rtts-voice-select"
                value={selectedVoiceURI}
                onChange={handleVoiceChange}
                aria-label="Select voice"
                title="Select narrator voice"
              >
                {voices.slice(0, 8).map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name.replace(/Microsoft |Google |English |United States|United Kingdom|\(.*?\)/gi, '').trim() || v.name} ({v.lang})
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              className="rtts-close-btn"
              onClick={() => {
                controller?.stop();
                onClose?.();
              }}
              title="Close audio reader"
              aria-label="Close audio reader"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Text Preview */}
        {currentSegment && (
          <div className="rtts-text-preview" title={currentSegment.text}>
            <span className="rtts-prefix">
              {currentSegment.type === 'heading' ? '§ ' : '“'}
            </span>
            <span>{currentSegment.display || currentSegment.text}</span>
            {currentSegment.type !== 'heading' && '”'}
          </div>
        )}

        {/* Playback Controls Row */}
        <div className="rtts-controls-row">
          <div className="rtts-play-group">
            <button
              type="button"
              className="rtts-btn"
              onClick={handleSkipPrev}
              disabled={segmentIndex <= 0}
              title="Previous sentence"
              aria-label="Previous sentence"
            >
              <SkipBack size={15} />
            </button>

            <button
              type="button"
              className="rtts-btn rtts-btn-play"
              onClick={handleTogglePlay}
              title={ttsState === 'playing' ? 'Pause' : 'Play'}
              aria-label={ttsState === 'playing' ? 'Pause' : 'Play'}
            >
              {ttsState === 'playing' ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: 2 }} />}
            </button>

            <button
              type="button"
              className="rtts-btn"
              onClick={handleSkipNext}
              disabled={segmentIndex >= totalSegments - 1}
              title="Next sentence"
              aria-label="Next sentence"
            >
              <SkipForward size={15} />
            </button>

            <button
              type="button"
              className="rtts-btn"
              onClick={() => controller?.stop()}
              title="Stop playback"
              aria-label="Stop playback"
            >
              <Square size={14} />
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="rtts-progress-group">
            <div className="rtts-progress-bar-bg">
              <div
                className="rtts-progress-bar-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="rtts-progress-text">
              {totalSegments > 0 ? `${segmentIndex + 1}/${totalSegments}` : ''}
            </span>
          </div>

          {/* Speed Toggle Pill */}
          <button
            type="button"
            className="rtts-rate-pill"
            onClick={handleCycleSpeed}
            title="Adjust reading speed"
            aria-label="Adjust reading speed"
          >
            {SPEED_OPTIONS[rateIdx].label}
          </button>
        </div>
      </div>
    </div>
  );
}
