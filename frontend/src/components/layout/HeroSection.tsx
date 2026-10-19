import React, { useRef, useState } from 'react';
import { InteractiveGlobe } from '../globe/InteractiveGlobe';

interface HeroSectionProps {
  onExploreClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onExploreClick }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const toggleVideo = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPaused(false);
      } else {
        videoRef.current.pause();
        setIsPaused(true);
      }
    }
  };

  return (
    <section className="hero-section" style={{ position: 'relative', overflow: 'hidden', padding: '24px 16px 40px' }}>
      {/* Full-bleed cinematic video background */}
      <div
        className="hero-video-backdrop"
        style={{
          position: 'absolute',
          top: '-84px',
          left: 0,
          width: '100%',
          height: '660px',
          overflow: 'hidden',
          background: '#000000',
          zIndex: -1,
          pointerEvents: 'none',
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.55,
            filter: 'grayscale(1)',
            pointerEvents: 'none',
          }}
        >
          <source
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260809_012548_ef22562c-c0ae-4816-ad9d-f8922af4e6a7.mp4"
            type="video/mp4"
          />
        </video>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.4) 50%, #000000 100%)',
          }}
        />
      </div>

      <div
        className="hero-stage-split"
        style={{
          position: 'relative',
          maxWidth: '1280px',
          margin: '0 auto',
          minHeight: '410px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '40px 12px 50px',
        }}
      >
        {/* Centered 3D Wireframe Globe crowning gracefully behind headline */}
        <InteractiveGlobe />

        {/* Content Header (Elevated with z-index above globe) */}
        <div
          className="dash-hero-header"
          style={{
            position: 'relative',
            zIndex: 2,
            maxWidth: '840px',
            margin: '0 auto',
          }}
        >
          {/* Pill Tag */}
          <div
            className="hero-tag"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(34, 37, 38, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.20)',
              borderRadius: '999px',
              padding: '6px 14px',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.1em',
              color: '#d4d8d6',
              marginBottom: '20px',
              textTransform: 'uppercase',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ffffff', display: 'inline-block' }} />
            <span>Retail Customer Analytics</span>
          </div>

          {/* Retro Dot-Matrix Headline */}
          <h1
            className="hero-title"
            style={{
              fontFamily: "'BubbledotICG-FinePos', 'Geist Pixel Circle', monospace",
              fontSize: 'clamp(28px, 5.2vw, 68px)',
              fontWeight: 400,
              letterSpacing: '-0.045em',
              lineHeight: 1.15,
              color: '#ffffff',
              margin: '0 auto 20px',
            }}
          >
            <span style={{ display: 'block' }}>Customer Intelligence</span>
            <span style={{ display: 'block' }}>Command Center</span>
          </h1>

          {/* Subtitle */}
          <p
            className="hero-subtitle"
            style={{
              fontSize: '14.5px',
              lineHeight: 1.65,
              color: '#c5c8c7',
              maxWidth: '540px',
              margin: '0 auto 28px',
            }}
          >
            Understand customer behavior with RFM segmentation, lifetime value predictions, and churn insights.
          </p>

          {/* Actions */}
          <div
            className="hero-actions"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              className="btn-pill-primary"
              onClick={onExploreClick}
              style={{
                background: '#f5f7f6',
                color: '#141817',
                border: '1px solid #ffffff',
                borderRadius: '999px',
                padding: '12px 24px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 0 20px rgba(255, 255, 255, 0.12)',
                transition: 'all 0.2s ease',
              }}
            >
              <span>Explore Dashboard</span>
              <span>→</span>
            </button>

            <button
              type="button"
              className="hero-motion-control"
              onClick={toggleVideo}
              style={{
                background: 'rgba(0, 0, 0, 0.5)',
                color: '#c8ccca',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                borderRadius: '999px',
                padding: '12px 18px',
                fontSize: '11px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {isPaused ? 'Resume background' : 'Pause background'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
