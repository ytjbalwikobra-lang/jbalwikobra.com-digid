/**
 * Global Confirm Dialog Context
 * Provides a simple, reliable confirmation dialog across the entire app
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Info, CheckCircle, XCircle, X, Loader2 } from 'lucide-react';

// Types
export type ConfirmType = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmOptions {
  title: string;
  message: string;
  type?: ConfirmType;
  confirmText?: string;
  cancelText?: string;
}

interface ConfirmDialogState {
  isOpen: boolean;
  options: ConfirmOptions;
  onConfirm: () => void;
  onCancel: () => void;
}

interface ConfirmDialogContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | null>(null);

// Icon component based on type
const TypeIcon: React.FC<{ type: ConfirmType }> = ({ type }) => {
  const iconClass = "w-6 h-6";
  switch (type) {
    case 'danger':
      return <XCircle className={`${iconClass} text-red-500`} />;
    case 'warning':
      return <AlertTriangle className={`${iconClass} text-yellow-500`} />;
    case 'success':
      return <CheckCircle className={`${iconClass} text-green-500`} />;
    case 'info':
    default:
      return <Info className={`${iconClass} text-blue-500`} />;
  }
};

// The actual dialog component
const ConfirmDialog: React.FC<ConfirmDialogState> = ({
  isOpen,
  options,
  onConfirm,
  onCancel,
}) => {
  const [isConfirming, setIsConfirming] = useState(false);

  if (!isOpen) return null;

  const { title, message, type = 'info', confirmText = 'Confirm', cancelText = 'Cancel' } = options;

  const handleConfirm = async () => {
    setIsConfirming(true);
    onConfirm();
    setIsConfirming(false);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const getConfirmButtonClass = () => {
    const base = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 min-w-[100px] justify-center";
    switch (type) {
      case 'danger':
        return `${base} bg-red-600 hover:bg-red-700 text-white`;
      case 'warning':
        return `${base} bg-yellow-600 hover:bg-yellow-700 text-white`;
      case 'success':
        return `${base} bg-green-600 hover:bg-green-700 text-white`;
      case 'info':
      default:
        return `${base} bg-blue-600 hover:bg-blue-700 text-white`;
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div 
        className="w-full max-w-md bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2a2a4a]">
          <div className="flex items-center gap-3">
            <TypeIcon type={type} />
            <h2 id="confirm-dialog-title" className="text-lg font-semibold text-white">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          <p className="text-gray-300 whitespace-pre-wrap">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-[#2a2a4a]">
          <button
            type="button"
            onClick={onCancel}
            disabled={isConfirming}
            className="px-4 py-2 rounded-lg font-medium bg-[#2a2a4a] hover:bg-[#3a3a5a] text-white transition-all duration-200 min-w-[100px]"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirming}
            className={getConfirmButtonClass()}
          >
            {isConfirming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Provider component
export const ConfirmDialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dialogState, setDialogState] = useState<ConfirmDialogState>({
    isOpen: false,
    options: { title: '', message: '' },
    onConfirm: () => {},
    onCancel: () => {},
  });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        options,
        onConfirm: () => {
          setDialogState(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setDialogState(prev => ({ ...prev, isOpen: false }));
          resolve(false);
        },
      });
    });
  }, []);

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}
      <ConfirmDialog {...dialogState} />
    </ConfirmDialogContext.Provider>
  );
};

// Hook to use the confirm dialog
export const useConfirmDialog = (): ((options: ConfirmOptions) => Promise<boolean>) => {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error('useConfirmDialog must be used within a ConfirmDialogProvider');
  }
  return context.confirm;
};

export default ConfirmDialogProvider;
