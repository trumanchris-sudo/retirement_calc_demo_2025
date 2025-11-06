"use client";

import React, { useState, ReactNode } from 'react';
import './FlippingCard.css';

/**
 * A React component for a 3D flipping card.
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

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div className={`flip-card-scene ${className}`} onClick={handleFlip}>
      <div className={`flip-card ${isFlipped ? 'is-flipped' : ''}`}>
        <div className="flip-card-face flip-card-front">
          {frontContent}
        </div>
        <div className="flip-card-face flip-card-back">
          {backContent}
        </div>
      </div>
    </div>
  );
};
