/**
 * Format Utilities
 * Extracted from page.tsx — text formatting helpers for insight display.
 */
import React from 'react';

/**
 * Convert a string to title case
 */
export const toTitleCase = (str: string) => {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Format AI insight text to have bolded headers and proper paragraphs
 */
export const formatInsight = (text: string) => {
  const lines = text.split('\n');
  return lines.map((line, index) => {
    const isMarkdownHeader = line.startsWith('##') || line.startsWith('#');
    const isColonHeader = line.includes(':') && line.length < 80 && !line.includes('$') && index > 0 && lines[index - 1] === '';

    if (isMarkdownHeader) {
      const headerText = line.replace(/^#+\s*/, '');
      const titleCaseHeader = toTitleCase(headerText);
      return <h4 key={index} className="font-bold text-base mt-4 mb-2 first:mt-0">{titleCaseHeader}</h4>;
    } else if (isColonHeader) {
      const titleCaseHeader = toTitleCase(line);
      return <h5 key={index} className="font-semibold text-sm mt-3 mb-1">{titleCaseHeader}</h5>;
    } else if (line.trim() === '') {
      return <br key={index} />;
    } else {
      return <p key={index} className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-2">{line}</p>;
    }
  });
};
