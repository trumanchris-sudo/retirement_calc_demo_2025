"use client";

import React, { useRef, useImperativeHandle, forwardRef, useCallback } from "react";

export interface CyberpunkSplashHandle {
  play: () => void;
}

/**
 * CyberpunkSplash - "WORK · DIE · RETIRE" text overlay
 *
 * Displays centered neon text with glitch flicker effect
 * - Flicker animation: 700ms
 * - Fade out: 400ms
 * - Total duration: 1100ms
 *
 * Imperative API:
 * - play(): Starts the animation sequence
 */
const CyberpunkSplash = forwardRef<CyberpunkSplashHandle>((props, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number>();

  // Play animation sequence
  const play = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // Show container
    container.style.display = 'flex';
    container.style.opacity = '1';

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // After 700ms (flicker duration), start fade out
    timeoutRef.current = window.setTimeout(() => {
      if (container) {
        container.style.opacity = '0';

        // After 400ms fade out, hide completely
        timeoutRef.current = window.setTimeout(() => {
          if (container) {
            container.style.display = 'none';
          }
        }, 400);
      }
    }, 700);
  }, []);

  // Expose imperative handle
  useImperativeHandle(ref, () => ({
    play
  }), [play]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000, // Above FullScreenVisualizer (9999)
          pointerEvents: 'none',
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0,
          transition: 'opacity 400ms ease-out',
        }}
      >
        <div
          className="cyberpunk-text"
          style={{
            fontSize: 'clamp(48px, 8vw, 120px)',
            fontWeight: 800,
            letterSpacing: '0.15em',
            color: 'rgba(255, 255, 255, 0.95)',
            textShadow: `
              0 0 30px rgba(79, 237, 245, 0.6),
              0 0 60px rgba(179, 79, 245, 0.4),
              0 0 90px rgba(79, 237, 245, 0.3)
            `,
            lineHeight: 1.2,
            textAlign: 'center',
            animation: 'glitchFlicker 700ms ease-in-out',
          }}
        >
          WORK
          <br />
          <span style={{ margin: '0 0.3em' }}>·</span>
          <br />
          DIE
          <br />
          <span style={{ margin: '0 0.3em' }}>·</span>
          <br />
          RETIRE
        </div>
      </div>

      {/* Glitch flicker animation */}
      <style jsx>{`
        @keyframes glitchFlicker {
          0%, 100% {
            opacity: 1;
            text-shadow:
              0 0 30px rgba(79, 237, 245, 0.6),
              0 0 60px rgba(179, 79, 245, 0.4),
              0 0 90px rgba(79, 237, 245, 0.3);
          }
          10%, 30%, 50%, 70%, 90% {
            opacity: 0.9;
            text-shadow:
              0 0 20px rgba(79, 237, 245, 0.8),
              0 0 40px rgba(179, 79, 245, 0.6),
              2px 2px 0px rgba(79, 237, 245, 0.5),
              -2px -2px 0px rgba(179, 79, 245, 0.5);
            transform: translate(2px, 0);
          }
          15%, 35%, 55%, 75%, 95% {
            opacity: 1;
            text-shadow:
              0 0 35px rgba(79, 237, 245, 0.7),
              0 0 70px rgba(179, 79, 245, 0.5),
              -2px 0px 0px rgba(79, 237, 245, 0.6),
              2px 0px 0px rgba(179, 79, 245, 0.6);
            transform: translate(-2px, 0);
          }
          20%, 40%, 60%, 80% {
            opacity: 0.95;
            text-shadow:
              0 0 25px rgba(79, 237, 245, 0.5),
              0 0 50px rgba(179, 79, 245, 0.3);
            transform: translate(0, 0);
          }
        }

        .cyberpunk-text {
          position: relative;
        }

        /* Chromatic aberration effect */
        .cyberpunk-text::before {
          content: 'WORK · DIE · RETIRE';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          color: rgba(79, 237, 245, 0.3);
          animation: glitchShift1 700ms ease-in-out;
          pointer-events: none;
          white-space: pre-line;
          line-height: inherit;
          letter-spacing: inherit;
        }

        .cyberpunk-text::after {
          content: 'WORK · DIE · RETIRE';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          color: rgba(179, 79, 245, 0.3);
          animation: glitchShift2 700ms ease-in-out;
          pointer-events: none;
          white-space: pre-line;
          line-height: inherit;
          letter-spacing: inherit;
        }

        @keyframes glitchShift1 {
          0%, 100% {
            transform: translate(0, 0);
            opacity: 0;
          }
          10%, 30%, 50%, 70%, 90% {
            transform: translate(-3px, 2px);
            opacity: 0.3;
          }
          15%, 35%, 55%, 75%, 95% {
            transform: translate(-2px, -2px);
            opacity: 0.25;
          }
        }

        @keyframes glitchShift2 {
          0%, 100% {
            transform: translate(0, 0);
            opacity: 0;
          }
          10%, 30%, 50%, 70%, 90% {
            transform: translate(3px, -2px);
            opacity: 0.3;
          }
          15%, 35%, 55%, 75%, 95% {
            transform: translate(2px, 2px);
            opacity: 0.25;
          }
        }

        /* Screen reader only (hide visually, keep for accessibility) */
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border-width: 0;
        }
      `}</style>

      {/* Screen reader announcement */}
      <div role="status" aria-live="polite" className="sr-only">
        Running Monte Carlo simulation...
      </div>
    </>
  );
});

CyberpunkSplash.displayName = 'CyberpunkSplash';

export default CyberpunkSplash;
