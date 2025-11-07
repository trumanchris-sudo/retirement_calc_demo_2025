"use client";

import React, { useState, useRef, useEffect, ReactNode } from 'react';
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

  // --- Dynamic height management ---
  const [cardHeight, setCardHeight] = useState<string>('auto');
  const cardRef = useRef<HTMLDivElement>(null); // Ref for the main .flip-card element
  const frontRef = useRef<HTMLDivElement>(null); // Ref for the front face
  const backRef = useRef<HTMLDivElement>(null); // Ref for the back face

  // Function to set height based on the visible face
  const updateHeight = () => {
    if (typeof window === 'undefined') return; // Guard for SSR
    if (isFlipped) {
      if (backRef.current) {
        setCardHeight(`${backRef.current.offsetHeight}px`);
      }
    } else {
      if (frontRef.current) {
        setCardHeight(`${frontRef.current.offsetHeight}px`);
      }
    }
  };

  // Set initial height on mount
  useEffect(() => {
    // Use useEffect instead of useLayoutEffect to avoid SSR issues
    updateHeight();
    // Re-check height after a short delay to ensure images/fonts have loaded
    const timer = setTimeout(updateHeight, 100);
    return () => clearTimeout(timer);
  }, []);

  // Update height when flip state changes
  useEffect(() => {
    updateHeight();
  }, [isFlipped]);
  // --- End of dynamic height management ---

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
