"use client";

import React, { useState, useRef, useEffect, useLayoutEffect, ReactNode } from 'react';
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

  // --- Additions for dynamic height ---
  const [cardHeight, setCardHeight] = useState<string>('auto');
  const cardRef = useRef<HTMLDivElement>(null); // Ref for the main .flip-card element
  const frontRef = useRef<HTMLDivElement>(null); // Ref for the front face
  const backRef = useRef<HTMLDivElement>(null); // Ref for the back face

  // Set the initial height to the front's height
  useLayoutEffect(() => {
    if (frontRef.current) {
      setCardHeight(`${frontRef.current.offsetHeight}px`);
    }
  }, []);

  // Update the height when isFlipped changes
  useEffect(() => {
    if (isFlipped) {
      // Set height to the back's height
      if (backRef.current) {
        setCardHeight(`${backRef.current.offsetHeight}px`);
      }
    } else {
      // Set height to the front's height
      if (frontRef.current) {
        setCardHeight(`${frontRef.current.offsetHeight}px`);
      }
    }
  }, [isFlipped]);
  // --- End of additions ---

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div className={`flip-card-scene ${className}`} onClick={handleFlip}>
      <div
        ref={cardRef}
        className={`flip-card ${isFlipped ? 'is-flipped' : ''}`}
        style={{ height: cardHeight }}
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
