/* eslint-disable react/prop-types */
/**
 * useKeyboardShortcuts Hook - Power User Keyboard Navigation
 * 
 * Purpose: Centralized keyboard shortcuts for admin panel
 * - Improves productivity for power users
 * - Consistent shortcuts across all admin pages
 * - ISO Standard: WCAG 2.1 AA keyboard navigation requirements
 * 
 * Common shortcuts:
 * - Ctrl/Cmd + S: Save
 * - Escape: Cancel/Close
 * - Ctrl/Cmd + K: Quick search
 * - Ctrl/Cmd + N: New item
 * - Ctrl/Cmd + R: Refresh
 */

import { useEffect, useCallback, useRef } from 'react';

export type KeyboardShortcut = {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean; // Cmd on Mac
  description: string;
  action: () => void;
  preventDefault?: boolean;
};

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  shortcuts: KeyboardShortcut[];
}

export const useKeyboardShortcuts = (options: UseKeyboardShortcutsOptions) => {
  const { enabled = true, shortcuts } = options;
  const shortcutsRef = useRef(shortcuts);

  // Update ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger if user is typing in an input/textarea (unless it's Escape)
    const target = event.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
    
    if (isInput && event.key !== 'Escape') {
      // Allow Ctrl+S even in inputs for save
      if (!(event.key === 's' && (event.ctrlKey || event.metaKey))) {
        return;
      }
    }

    for (const shortcut of shortcutsRef.current) {
      const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatches = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey;
      const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const altMatches = shortcut.alt ? event.altKey : !event.altKey;

      if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
        if (shortcut.preventDefault !== false) {
          event.preventDefault();
        }
        shortcut.action();
        break;
      }
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [enabled, handleKeyDown]);

  return {
    shortcuts: shortcutsRef.current
  };
};

// ============================================================================
// Pre-built Shortcut Configurations
// ============================================================================

export const createModalShortcuts = (options: {
  onSave?: () => void;
  onCancel?: () => void;
}) => {
  const shortcuts: KeyboardShortcut[] = [];

  if (options.onSave) {
    shortcuts.push({
      key: 's',
      ctrl: true,
      description: 'Simpan',
      action: options.onSave
    });
  }

  if (options.onCancel) {
    shortcuts.push({
      key: 'Escape',
      description: 'Batal / Tutup',
      action: options.onCancel
    });
  }

  return shortcuts;
};

export const createListShortcuts = (options: {
  onCreate?: () => void;
  onRefresh?: () => void;
  onSearch?: () => void;
}) => {
  const shortcuts: KeyboardShortcut[] = [];

  if (options.onCreate) {
    shortcuts.push({
      key: 'n',
      ctrl: true,
      description: 'Buat baru',
      action: options.onCreate
    });
  }

  if (options.onRefresh) {
    shortcuts.push({
      key: 'r',
      ctrl: true,
      description: 'Refresh',
      action: options.onRefresh
    });
  }

  if (options.onSearch) {
    shortcuts.push({
      key: 'k',
      ctrl: true,
      description: 'Cari',
      action: options.onSearch
    });
  }

  return shortcuts;
};

// ============================================================================
// Shortcut Helper Component
// ============================================================================

interface ShortcutHintProps {
  shortcuts: KeyboardShortcut[];
  className?: string;
}

export const ShortcutHints: React.FC<ShortcutHintProps> = ({ shortcuts, className = '' }) => {
  const formatShortcut = (shortcut: KeyboardShortcut): string => {
    const keys: string[] = [];
    
    if (shortcut.ctrl || shortcut.meta) {
      keys.push(navigator.platform.includes('Mac') ? '⌘' : 'Ctrl');
    }
    if (shortcut.shift) keys.push('Shift');
    if (shortcut.alt) keys.push('Alt');
    keys.push(shortcut.key.toUpperCase());
    
    return keys.join(' + ');
  };

  return (
    <div className={`text-xs text-gray-400 space-y-1 ${className}`}>
      <div className="font-semibold text-gray-400 mb-2">Keyboard Shortcuts:</div>
      {shortcuts.map((shortcut, index) => (
        <div key={index} className="flex items-center justify-between gap-4">
          <span className="text-gray-400">{shortcut.description}</span>
          <kbd className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-gray-300 font-mono text-xs">
            {formatShortcut(shortcut)}
          </kbd>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// Global Admin Shortcuts
// ============================================================================

export const useGlobalAdminShortcuts = (options: {
  onDashboard?: () => void;
  onProducts?: () => void;
  onOrders?: () => void;
  onUsers?: () => void;
}) => {
  const shortcuts: KeyboardShortcut[] = [];

  if (options.onDashboard) {
    shortcuts.push({
      key: 'd',
      ctrl: true,
      shift: true,
      description: 'Go to Dashboard',
      action: options.onDashboard
    });
  }

  if (options.onProducts) {
    shortcuts.push({
      key: 'p',
      ctrl: true,
      shift: true,
      description: 'Go to Products',
      action: options.onProducts
    });
  }

  if (options.onOrders) {
    shortcuts.push({
      key: 'o',
      ctrl: true,
      shift: true,
      description: 'Go to Orders',
      action: options.onOrders
    });
  }

  if (options.onUsers) {
    shortcuts.push({
      key: 'u',
      ctrl: true,
      shift: true,
      description: 'Go to Users',
      action: options.onUsers
    });
  }

  useKeyboardShortcuts({ shortcuts });
};
