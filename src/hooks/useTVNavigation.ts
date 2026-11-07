import { useEffect, useState, useCallback, useRef } from 'react';
import { playFocusSound, playSelectSound, playBackSound } from '../utils/sound';

interface NavigationOptions {
  onBack?: () => void;
  onEnter?: (focusedId: string | null) => void;
  enabled?: boolean;
}

export function useTVNavigation(options: NavigationOptions = {}) {
  const { onBack, onEnter, enabled = true } = options;
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const getAllFocusables = useCallback((): HTMLElement[] => {
    return Array.from(
      document.querySelectorAll<HTMLElement>('[data-tv-focusable="true"]:not([disabled])')
    ).filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none';
    });
  }, []);

  const moveFocus = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    const focusables = getAllFocusables();
    if (focusables.length === 0) return;

    const currentEl = focusedId
      ? document.getElementById(focusedId)
      : (document.activeElement as HTMLElement);

    if (!currentEl || !focusables.includes(currentEl)) {
      // Focus first element
      const first = focusables[0];
      if (first) {
        first.focus();
        setFocusedId(first.id || null);
        playFocusSound();
      }
      return;
    }

    const currentRect = currentEl.getBoundingClientRect();
    const currentCenter = {
      x: currentRect.left + currentRect.width / 2,
      y: currentRect.top + currentRect.height / 2,
    };

    let bestCandidate: HTMLElement | null = null;
    let shortestDistance = Infinity;

    for (const candidate of focusables) {
      if (candidate === currentEl) continue;

      const candRect = candidate.getBoundingClientRect();
      const candCenter = {
        x: candRect.left + candRect.width / 2,
        y: candRect.top + candRect.height / 2,
      };

      const dx = candCenter.x - currentCenter.x;
      const dy = candCenter.y - currentCenter.y;

      let isValidDirection = false;
      let primaryDistance = 0;
      let secondaryDistance = 0;

      switch (direction) {
        case 'right':
          if (dx > 8 && Math.abs(dy) < candRect.height * 2) {
            isValidDirection = true;
            primaryDistance = dx;
            secondaryDistance = Math.abs(dy);
          }
          break;
        case 'left':
          if (dx < -8 && Math.abs(dy) < candRect.height * 2) {
            isValidDirection = true;
            primaryDistance = -dx;
            secondaryDistance = Math.abs(dy);
          }
          break;
        case 'down':
          if (dy > 8) {
            isValidDirection = true;
            primaryDistance = dy;
            secondaryDistance = Math.abs(dx);
          }
          break;
        case 'up':
          if (dy < -8) {
            isValidDirection = true;
            primaryDistance = -dy;
            secondaryDistance = Math.abs(dx);
          }
          break;
      }

      if (isValidDirection) {
        // Weighted distance penalizes perpendicular deviation
        const score = primaryDistance + secondaryDistance * 2.2;
        if (score < shortestDistance) {
          shortestDistance = score;
          bestCandidate = candidate;
        }
      }
    }

    // Fallback circular next/previous if spatial didn't find adjacent
    if (!bestCandidate) {
      const currentIndex = focusables.indexOf(currentEl);
      if (direction === 'right' || direction === 'down') {
        bestCandidate = focusables[(currentIndex + 1) % focusables.length];
      } else if (direction === 'left' || direction === 'up') {
        bestCandidate = focusables[(currentIndex - 1 + focusables.length) % focusables.length];
      }
    }

    if (bestCandidate) {
      bestCandidate.focus();
      // 'auto' avoids JS animation frame stalls on budget TV chips (instant GPU scroll)
      bestCandidate.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
      setFocusedId(bestCandidate.id || null);
      playFocusSound();
    }
  }, [focusedId, getAllFocusables]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      // Exception: Enter or Escape on input
      if (isInput && e.key !== 'Escape' && e.key !== 'Enter') {
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          moveFocus('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          moveFocus('down');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          moveFocus('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          moveFocus('right');
          break;
        case 'Enter':
          if (!isInput) {
            e.preventDefault();
            playSelectSound();
            if (optionsRef.current.onEnter) {
              optionsRef.current.onEnter(focusedId);
            }
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.click();
            }
          }
          break;
        case 'Escape':
        case 'Backspace':
          if (!isInput) {
            e.preventDefault();
            playBackSound();
            if (optionsRef.current.onBack) {
              optionsRef.current.onBack();
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, focusedId, moveFocus]);

  // Keep state synced with browser focus changes
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      if (el && el.getAttribute('data-tv-focusable') === 'true') {
        setFocusedId(el.id || null);
      }
    };

    window.addEventListener('focusin', handleFocusIn);
    return () => window.removeEventListener('focusin', handleFocusIn);
  }, []);

  return {
    focusedId,
    moveFocus,
    setFocusedId,
  };
}
