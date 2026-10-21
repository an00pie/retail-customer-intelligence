import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDialog } from '../../lib/useDialog';

interface CinematicIntroProps {
  onComplete?: () => void;
}

const STORAGE_KEY = 'insight_arc_intro_viewed';
let viewedThisSession = false;

export const CinematicIntro: React.FC<CinematicIntroProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(() => {
    let seen = viewedThisSession;
    try { seen ||= sessionStorage.getItem(STORAGE_KEY) === 'true'; } catch {}
    return !seen && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    viewedThisSession = true;
    try { sessionStorage.setItem(STORAGE_KEY, 'true'); } catch {}
    videoRef.current?.pause();
    setIsVisible(false);
  }, []);
  const dialogRef = useDialog(isVisible, finish);

  // Notify only after the dialog's layout cleanup has restored scrolling/focus.
  const notifiedRef = useRef(false);
  useEffect(() => {
    if (!isVisible && !notifiedRef.current) {
      notifiedRef.current = true;
      finish();
      onCompleteRef.current?.();
    }
  }, [isVisible, finish]);

  useEffect(() => {
    if (!isVisible) return;
    const video = videoRef.current;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let active = true;
    let inView = false;
    let playAttempt = 0;
    const sync = () => {
      const attempt = ++playAttempt;
      if (motion.matches) { finish(); return; }
      if (!video || document.hidden || !inView) { video?.pause(); return; }
      void video.play().catch(() => {
        if (active && attempt === playAttempt) finish();
      });
    };
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); });
    if (video) observer.observe(video);
    // Safety limit for stalled media, matching the existing approximately 10s intro.
    const timer = window.setTimeout(finish, 10000);
    video?.addEventListener('ended', finish);
    video?.addEventListener('error', finish);
    document.addEventListener('visibilitychange', sync);
    motion.addEventListener('change', sync);
    sync();
    return () => {
      active = false;
      clearTimeout(timer);
      observer.disconnect();
      video?.pause();
      video?.removeEventListener('ended', finish);
      video?.removeEventListener('error', finish);
      document.removeEventListener('visibilitychange', sync);
      motion.removeEventListener('change', sync);
    };
  }, [isVisible, finish]);

  if (!isVisible) return null;

  return (
    <div
      ref={dialogRef}
      className="cinematic-intro-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="INSIGHT.arc Cinematic Intro"
      tabIndex={-1}
    >
      <div className="cinematic-intro-frame">
        <video
          ref={videoRef}
          className="cinematic-intro-video"
          src="/static/videos/insight_arc_intro.mp4"
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
        />
      </div>
      <button
        type="button"
        className="cinematic-intro-skip-btn"
        onClick={finish}
        aria-label="Skip Introduction"
      >
        Skip Intro &rarr;
      </button>
    </div>
  );
};
