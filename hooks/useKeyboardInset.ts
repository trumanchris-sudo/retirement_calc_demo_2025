import { useEffect, useState } from 'react';

/**
 * Hook to detect iOS keyboard height using Visual Viewport API
 * Returns the keyboard height in pixels
 *
 * This is critical for iOS Safari where the keyboard covers the viewport
 * and we need to add padding to ensure inputs remain visible.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    // Check if Visual Viewport API is available (not in all browsers)
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      // Keyboard height = layout viewport height - visual viewport height - visual viewport offsetTop
      // On iOS, when keyboard opens:
      // - visualViewport.height shrinks (viewport gets smaller)
      // - visualViewport.offsetTop may increase (if page scrolls)
      // - window.innerHeight stays the same (layout viewport)
      const keyboardHeight = Math.max(
        0,
        window.innerHeight - vv.height - vv.offsetTop
      );
      setInset(keyboardHeight);
    };

    // Update on initial mount
    update();

    // Listen for viewport changes (keyboard open/close, rotation, etc.)
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return inset;
}
