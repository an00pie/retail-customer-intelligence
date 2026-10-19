import React, { useState, useEffect, useRef } from 'react';

interface CinematicIntroProps {
  onComplete?: () => void;
}

export const CinematicIntro: React.FC<CinematicIntroProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [isFading, setIsFading] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const completedRef = useRef<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const STORAGE_KEY = 'insight_arc_intro_viewed';
    let alreadySeen = false;
    try {
      alreadySeen = sessionStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      alreadySeen = false;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (alreadySeen || prefersReducedMotion) {
      setIsVisible(false);
      if (onComplete) onComplete();
      return;
    }

    // Lock body scroll
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    const finish = () => {
      if (completedRef.current) return;
      completedRef.current = true;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      try {
        sessionStorage.setItem(STORAGE_KEY, 'true');
      } catch {}

      setIsFading(true);

      setTimeout(() => {
        setIsVisible(false);
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        if (onComplete) onComplete();
      }, 800);
    };

    // Exactly 10 seconds timeout safety guard
    timerRef.current = setTimeout(finish, 10000);

    const video = videoRef.current;
    if (video) {
      video.play().catch((err) => {
        console.warn('React intro autoplay prevented:', err);
      });
      video.addEventListener('ended', finish);
      video.addEventListener('error', finish);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div
      className={`cinematic-intro-overlay ${isFading ? 'intro-fading' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="INSIGHT.arc Cinematic Intro"
    >
      <div className="cinematic-intro-frame">
        <video
          ref={videoRef}
          className="cinematic-intro-video"
          src="/static/videos/insight_arc_intro.mp4"
          muted
          playsInline
          autoPlay
          preload="auto"
        />
      </div>
      <button
        type="button"
        className="cinematic-intro-skip-btn"
        onClick={() => {
          if (completedRef.current) return;
          completedRef.current = true;
          try {
            sessionStorage.setItem('insight_arc_intro_viewed', 'true');
          } catch {}
          setIsFading(true);
          setTimeout(() => {
            setIsVisible(false);
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
            if (onComplete) onComplete();
          }, 800);
        }}
        aria-label="Skip Introduction"
      >
        Skip Intro &rarr;
      </button>
    </div>
  );
};
