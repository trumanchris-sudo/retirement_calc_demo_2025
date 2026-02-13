"use client";

import React, { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import './FlippingCard.css';

/**
 * Premium 3D flipping card component with modern effects
 * Features:
 * - Smooth 3D perspective transforms
 * - Dynamic shadows that change during flip
 * - Reflection/shine effect on hover
 * - Multiple flip directions (horizontal, vertical)
 * - Optional sound effects
 * - Touch gesture support for mobile
 */

type FlipDirection = 'horizontal' | 'vertical';

interface FlippingCardProps {
  frontContent: ReactNode;
  backContent: ReactNode;
  className?: string;
  ariaLabel?: string;
  /** Direction of the flip animation */
  flipDirection?: FlipDirection;
  /** Enable subtle click sound effect */
  enableSound?: boolean;
  /** Custom flip duration in milliseconds */
  flipDuration?: number;
  /** Enable 3D tilt effect on hover/touch */
  enableTilt?: boolean;
  /** Disable the card flip interaction */
  disabled?: boolean;
}

// Subtle click sound as base64 (very short, satisfying click)
const CLICK_SOUND_DATA = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQUMb7Pv6phtBwZKotrhqXQZEmOr4+GjeAcLTqbd36F0HAdbpd/gpngIDUak3d6fcRkJXKbi4KN0DQRNpN3eoXURCV+l4eKmdg0LUKTd3qBzGQlbpOHio3YQClSk3t6gcxwGXKTh4qR2EAhWpN7eoHUcCV2l4eOkdRIHWaXe3qB2HAldpeLipXYTC1ql3t6gdhwKW6Xi4qV2EgxcpN7eoHYcC1yl4uKldhMMXaXe3qF2HAtcpeLipXYUDF2l3t6hdhwLXKXi4qV2';

export const FlippingCard: React.FC<FlippingCardProps> = ({
  frontContent,
  backContent,
  className = "",
  ariaLabel = "Flip card to see more details",
  flipDirection = 'horizontal',
  enableSound = false,
  flipDuration = 600,
  enableTilt = true,
  disabled = false,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardHeight, setCardHeight] = useState<number | undefined>(undefined);
  const [isFlipping, setIsFlipping] = useState(false);
  const [tiltStyle, setTiltStyle] = useState<React.CSSProperties>({});
  const [shineStyle, setShineStyle] = useState<React.CSSProperties>({});

  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Touch gesture state
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const isTouchDevice = useRef(false);

  // Initialize audio element for sound effects
  useEffect(() => {
    if (enableSound && typeof window !== 'undefined') {
      audioRef.current = new Audio(CLICK_SOUND_DATA);
      audioRef.current.volume = 0.3;
    }
    return () => {
      audioRef.current = null;
    };
  }, [enableSound]);

  // Detect touch device
  useEffect(() => {
    if (typeof window !== 'undefined') {
      isTouchDevice.current = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }
  }, []);

  const playClickSound = useCallback(() => {
    if (enableSound && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Silently fail if audio playback is blocked
      });
    }
  }, [enableSound]);

  const handleFlip = useCallback(() => {
    if (disabled || isFlipping) return;

    setIsFlipping(true);
    playClickSound();
    setIsFlipped(prev => !prev);

    // Reset flipping state after animation completes
    setTimeout(() => {
      setIsFlipping(false);
    }, flipDuration);
  }, [disabled, isFlipping, playClickSound, flipDuration]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleFlip();
    }
  };

  // 3D tilt effect on mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!enableTilt || isFlipping || isTouchDevice.current) return;

    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;

    // Calculate rotation (max 10 degrees)
    const rotateX = (mouseY / (rect.height / 2)) * -10;
    const rotateY = (mouseX / (rect.width / 2)) * 10;

    // Calculate shine position
    const shineX = ((e.clientX - rect.left) / rect.width) * 100;
    const shineY = ((e.clientY - rect.top) / rect.height) * 100;

    setTiltStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`,
    });

    setShineStyle({
      background: `radial-gradient(circle at ${shineX}% ${shineY}%, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 40%, transparent 60%)`,
      opacity: 1,
    });
  }, [enableTilt, isFlipping]);

  const handleMouseLeave = useCallback(() => {
    setTiltStyle({});
    setShineStyle({ opacity: 0 });
  }, []);

  // Touch gesture handlers for swipe-to-flip
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current || !enableTilt || isFlipping) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    // Create a subtle tilt effect during touch drag
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const maxDelta = Math.max(rect.width, rect.height) / 2;

    const rotateY = (deltaX / maxDelta) * 15;
    const rotateX = (deltaY / maxDelta) * -15;

    setTiltStyle({
      transform: `perspective(1000px) rotateX(${Math.max(-15, Math.min(15, rotateX))}deg) rotateY(${Math.max(-15, Math.min(15, rotateY))}deg)`,
      transition: 'none',
    });
  }, [enableTilt, isFlipping]);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;

    // Reset tilt
    setTiltStyle({});

    // Detect swipe gesture (minimum 50px movement in less than 300ms)
    const swipeThreshold = 50;
    const timeThreshold = 300;

    if (deltaTime < timeThreshold) {
      const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > swipeThreshold;
      const isVerticalSwipe = Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > swipeThreshold;

      if ((flipDirection === 'horizontal' && isHorizontalSwipe) ||
          (flipDirection === 'vertical' && isVerticalSwipe) ||
          isHorizontalSwipe || isVerticalSwipe) {
        handleFlip();
      }
    }

    touchStartRef.current = null;
  }, [flipDirection, handleFlip]);

  // Update height when flip state changes
  useEffect(() => {
    const updateHeight = () => {
      if (isFlipped && backRef.current) {
        setCardHeight(backRef.current.offsetHeight);
      } else if (!isFlipped && frontRef.current) {
        setCardHeight(frontRef.current.offsetHeight);
      }
    };

    const timer = setTimeout(updateHeight, 50);
    return () => clearTimeout(timer);
  }, [isFlipped, frontContent, backContent]);

  // CSS custom properties for dynamic styling
  const cardStyle: React.CSSProperties = {
    '--flip-duration': `${flipDuration}ms`,
    height: cardHeight ? `${cardHeight}px` : undefined,
  } as React.CSSProperties;

  const flipDirectionClass = flipDirection === 'vertical' ? 'flip-vertical' : 'flip-horizontal';
  const flippedClass = isFlipped ? 'is-flipped' : '';
  const flippingClass = isFlipping ? 'is-flipping' : '';
  const disabledClass = disabled ? 'is-disabled' : '';

  return (
    <div
      ref={cardRef}
      className={`flip-card-scene ${flipDirectionClass} ${flippingClass} ${disabledClass} ${className}`}
      onClick={handleFlip}
      onKeyDown={handleKeyDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={ariaLabel}
      aria-pressed={isFlipped}
      aria-disabled={disabled}
      style={!isFlipping ? tiltStyle : undefined}
    >
      <div
        className={`flip-card ${flipDirectionClass} ${flippedClass}`}
        style={cardStyle}
      >
        {/* Shine overlay for reflection effect */}
        <div
          className="flip-card-shine"
          style={shineStyle}
          aria-hidden="true"
        />

        <div
          ref={frontRef}
          className={`flip-card-face flip-card-front ${flipDirectionClass}`}
        >
          <div className="flip-card-content">
            {frontContent}
          </div>
          <div className="flip-card-edge" aria-hidden="true" />
        </div>

        <div
          ref={backRef}
          className={`flip-card-face flip-card-back ${flipDirectionClass}`}
        >
          <div className="flip-card-content">
            {backContent}
          </div>
          <div className="flip-card-edge" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
};
