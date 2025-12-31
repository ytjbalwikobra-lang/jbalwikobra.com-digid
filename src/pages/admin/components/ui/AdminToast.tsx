/**
 * Admin Toast Notification Component - V3 Design System
 * Floating notifications for order updates and system messages
 * WCAG 2.1 AA Compliant
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useAdminToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useAdminToast must be used within AdminToastProvider');
  }
  return context;
};

interface AdminToastProviderProps {
  children: React.ReactNode;
}

export const AdminToastProvider: React.FC<AdminToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const duration = toast.duration !== undefined ? toast.duration : 5000;
    const newToast: ToastMessage = {
      ...toast,
      id,
      duration,
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const success = useCallback((message: string, title?: string) => {
    showToast({ type: 'success', message, title });
  }, [showToast]);

  const error = useCallback((message: string, title?: string) => {
    showToast({ type: 'error', message, title });
  }, [showToast]);

  const warning = useCallback((message: string, title?: string) => {
    showToast({ type: 'warning', message, title });
  }, [showToast]);

  const info = useCallback((message: string, title?: string) => {
    showToast({ type: 'info', message, title });
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info, removeToast }}>
      {children}
      <AdminToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

interface AdminToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

const AdminToastContainer: React.FC<AdminToastContainerProps> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="admin-toast-container">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

interface ToastProps {
  toast: ToastMessage;
  onRemove: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleRemove = () => {
    setIsExiting(true);
    setTimeout(() => {
      onRemove(toast.id);
    }, 300); // Match animation duration
  };

  useEffect(() => {
    // Trigger enter animation
    const timer = setTimeout(() => {
      // Toast is now visible
    }, 10);
    return () => clearTimeout(timer);
  }, []);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="admin-toast-icon" />;
      case 'error':
        return <XCircle className="admin-toast-icon" />;
      case 'warning':
        return <AlertCircle className="admin-toast-icon" />;
      case 'info':
        return <Info className="admin-toast-icon" />;
    }
  };

  const getToastClass = () => {
    const baseClass = `admin-toast admin-toast-${toast.type}`;
    return isExiting ? `${baseClass} admin-toast-exit` : baseClass;
  };

  return (
    <div className={getToastClass()} role="alert" aria-live="polite">
      <div className="admin-toast-icon-wrapper">
        {getIcon()}
      </div>
      
      <div className="admin-toast-content">
        {toast.title && (
          <div className="admin-toast-title">{toast.title}</div>
        )}
        <div className="admin-toast-message">{toast.message}</div>
        
        {toast.action && (
          <button
            onClick={() => {
              toast.action?.onClick();
              handleRemove();
            }}
            className="admin-toast-action"
          >
            {toast.action.label}
          </button>
        )}
      </div>

      <button
        onClick={handleRemove}
        className="admin-toast-close"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
