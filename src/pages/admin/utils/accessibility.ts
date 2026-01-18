/**
 * Accessibility Utilities for Admin Panel
 * Provides helpers for improving WCAG 2.1 AA compliance
 */

import React from 'react';

/**
 * Announce to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Trap focus within a modal or dialog
 */
export function trapFocus(element: HTMLElement) {
  const focusableElements = element.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable?.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable?.focus();
      }
    }
  };

  element.addEventListener('keydown', handleKeyDown);
  
  // Focus first element
  firstFocusable?.focus();

  // Return cleanup function
  return () => {
    element.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Check color contrast ratio (WCAG AA requires 4.5:1 for normal text)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const getLuminance = (color: string): number => {
    // Simple hex color parser (supports #RRGGBB format)
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const [rs, gs, bs] = [r, g, b].map(c =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    );

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Generate unique ID for accessibility labels
 */
let idCounter = 0;
export function generateA11yId(prefix: string = 'a11y'): string {
  return `${prefix}-${Date.now()}-${++idCounter}`;
}

/**
 * Keyboard event handler helper
 */
export function handleKeyboardClick(callback: () => void) {
  return (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback();
    }
  };
}

/**
 * Check if element is visible to screen readers
 */
export function isVisibleToScreenReader(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    element.getAttribute('aria-hidden') !== 'true'
  );
}

/**
 * Get accessible name for an element
 */
export function getAccessibleName(element: HTMLElement): string {
  // Check aria-label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;

  // Check aria-labelledby
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelElement = document.getElementById(labelledBy);
    if (labelElement) return labelElement.textContent || '';
  }

  // Check for associated label element
  const id = element.id;
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label) return label.textContent || '';
  }

  // Fall back to text content
  return element.textContent || '';
}

/**
 * Manage focus restoration after modal closes
 */
export class FocusManager {
  private previousFocus: HTMLElement | null = null;

  save() {
    this.previousFocus = document.activeElement as HTMLElement;
  }

  restore() {
    if (this.previousFocus && typeof this.previousFocus.focus === 'function') {
      this.previousFocus.focus();
    }
    this.previousFocus = null;
  }
}

/**
 * Skip to content link functionality
 */
export function createSkipLink(targetId: string, text: string = 'Skip to main content') {
  const skipLink = document.createElement('a');
  skipLink.href = `#${targetId}`;
  skipLink.textContent = text;
  skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-black focus:p-4 focus:rounded';
  
  skipLink.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.tabIndex = -1;
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });

  return skipLink;
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * React hook for focus management
 */
export function useFocusManagement() {
  const focusManager = React.useMemo(() => new FocusManager(), []);

  React.useEffect(() => {
    return () => {
      focusManager.restore();
    };
  }, [focusManager]);

  return focusManager;
}

/**
 * React hook for announcing changes to screen readers
 */
export function useAnnouncement() {
  return React.useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    announceToScreenReader(message, priority);
  }, []);
}

/**
 * Keyboard shortcut definition
 */
export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  description: string;
  action: () => void;
  /** Only active when this returns true (e.g., when a panel is open) */
  condition?: () => boolean;
}

/**
 * React hook for registering keyboard shortcuts
 * Supports modifier keys (Ctrl, Shift, Alt, Meta)
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled: boolean = true) {
  React.useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const keyMatches = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = !!shortcut.ctrlKey === e.ctrlKey;
        const shiftMatches = !!shortcut.shiftKey === e.shiftKey;
        const altMatches = !!shortcut.altKey === e.altKey;
        const metaMatches = !!shortcut.metaKey === e.metaKey;
        const conditionMet = !shortcut.condition || shortcut.condition();

        if (keyMatches && ctrlMatches && shiftMatches && altMatches && metaMatches && conditionMet) {
          e.preventDefault();
          shortcut.action();
          announceToScreenReader(shortcut.description, 'polite');
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}

/**
 * React hook for navigating a list with arrow keys
 * Returns current focused index and handlers
 */
export function useArrowNavigation(
  itemCount: number,
  onSelect?: (index: number) => void,
  options: { loop?: boolean; initialIndex?: number } = {}
) {
  const { loop = true, initialIndex = -1 } = options;
  const [focusedIndex, setFocusedIndex] = React.useState(initialIndex);

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (itemCount === 0) return;

    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = prev + 1;
          if (next >= itemCount) {
            return loop ? 0 : prev;
          }
          return next;
        });
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = prev - 1;
          if (next < 0) {
            return loop ? itemCount - 1 : 0;
          }
          return next;
        });
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(itemCount - 1);
        break;
      case 'Enter':
      case ' ':
        if (focusedIndex >= 0 && onSelect) {
          e.preventDefault();
          onSelect(focusedIndex);
        }
        break;
    }
  }, [itemCount, loop, focusedIndex, onSelect]);

  const reset = React.useCallback(() => setFocusedIndex(initialIndex), [initialIndex]);

  return { focusedIndex, setFocusedIndex, handleKeyDown, reset };
}

export default {
  announceToScreenReader,
  trapFocus,
  getContrastRatio,
  generateA11yId,
  handleKeyboardClick,
  isVisibleToScreenReader,
  getAccessibleName,
  FocusManager,
  createSkipLink,
  prefersReducedMotion,
  useKeyboardShortcuts,
  useArrowNavigation,
};
