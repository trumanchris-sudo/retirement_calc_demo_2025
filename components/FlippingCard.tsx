"use client";

import React, { useState, useEffect, useRef, ReactNode } from 'react';
import './FlippingCard.css';

/**
 * A React component for a 3D flipping card that
 * dynamically resizes to fit its content.
 *
 * @param {object} props
 * @param {React.ReactNode} props.frontContent - The content for the front of the card.
 * @param {React.ReactNode} props.backContent - The content for the back of the card.
 * @param {string} props.className - Additional CSS classes for the scene container.
 */
interface FlippingCardProps {
  frontContent: ReactNode;
  backContent: ReactNode;
  className?: string;
}

export const FlippingCard: React.FC<FlippingCardProps> = ({
  frontContent,
  backContent,
  className = ""
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardHeight, setCardHeight] = useState<number | undefined>(undefined);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  // Update height when flip state changes
  useEffect(() => {
    const updateHeight = () => {
      if (isFlipped && backRef.current) {
        setCardHeight(backRef.current.offsetHeight);
      } else if (!isFlipped && frontRef.current) {
        setCardHeight(frontRef.current.offsetHeight);
      }
    };

    // Small delay to ensure DOM has updated
    const timer = setTimeout(updateHeight, 50);
    return () => clearTimeout(timer);
  }, [isFlipped, frontContent, backContent]);

  return (
    <div className={`flip-card-scene ${className}`} onClick={handleFlip}>
      <div
        className={`flip-card ${isFlipped ? 'is-flipped' : ''}`}
        style={cardHeight ? { height: `${cardHeight}px` } : undefined}
      >
        <div
          ref={frontRef}
          className="flip-card-face flip-card-front"
        >
          {frontContent}
        </div>
        <div
          ref={backRef}
          className="flip-card-face flip-card-back"
        >
          {backContent}
        </div>
      </div>
    </div>
  );
};
