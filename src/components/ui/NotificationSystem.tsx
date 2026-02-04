import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Check, X, AlertTriangle, Info } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface NotificationProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  onClose?: (id: string) => void;
}

export const Notification: React.FC<NotificationProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.(id);
    }, 300);
  };

  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <Check className="w-5 h-5" />;
      case 'error':
        return <X className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'info':
        return <Info className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-gradient-to-r from-[var(--cyber-success)]/20 to-[var(--cyber-success)]/20',
          border: 'border-[var(--cyber-success)]/30',
          icon: 'text-[var(--cyber-success)]',
          title: 'text-[var(--cyber-success)]'
        };
      case 'error':
        return {
          bg: 'bg-gradient-to-r from-[var(--cyber-error)]/20 to-[var(--cyber-pink-muted)]',
          border: 'border-[var(--cyber-error)]/30',
          icon: 'text-[var(--cyber-error)]',
          title: 'text-[var(--cyber-error)]'
        };
      case 'warning':
        return {
          bg: 'bg-gradient-to-r from-[var(--cyber-warning)]/20 to-[var(--cyber-warning)]/20',
          border: 'border-[var(--cyber-warning)]/30',
          icon: 'text-[var(--cyber-warning)]',
          title: 'text-[var(--cyber-warning)]'
        };
      case 'info':
        return {
          bg: 'bg-gradient-to-r from-[var(--cyber-info)]/20 to-[var(--cyber-info)]/20',
          border: 'border-[var(--cyber-info)]/30',
          icon: 'text-[var(--cyber-info)]',
          title: 'text-[var(--cyber-info)]'
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-50 max-w-sm w-full backdrop-blur-xl rounded-cyber-2xl border shadow-2xl transform transition-all duration-300 ease-out',
        styles.bg,
        styles.border,
        isExiting ? 'translate-x-full opacity-0 scale-95' : 'translate-x-0 opacity-100 scale-100'
      )}
    >
      <div className="p-4">
        <div className="flex items-start space-x-3">
          <div className={cn('flex-shrink-0', styles.icon)}>
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className={cn('text-sm font-semibold', styles.title)}>
              {title}
            </h4>
            {message && (
              <p className="text-xs text-white/70 mt-1">
                {message}
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="flex-shrink-0 text-white/50 hover:text-white/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Notification Container Component
export const NotificationContainer: React.FC<{
  notifications: NotificationProps[];
  onRemove: (id: string) => void;
}> = ({ notifications, onRemove }) => {
  return (
    <div className="fixed top-0 right-0 z-50 p-4 space-y-2">
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          {...notification}
          onClose={onRemove}
        />
      ))}
    </div>
  );
};

// Hook for managing notifications
interface NotificationContextValue {
  notifications: NotificationProps[];
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationProps[]>([]);

  const addNotification = useCallback((notification: Omit<NotificationProps, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { ...notification, id }]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const showSuccess = useCallback((title: string, message?: string) => addNotification({ type: 'success', title, message }), [addNotification]);
  const showError = useCallback((title: string, message?: string) => addNotification({ type: 'error', title, message }), [addNotification]);
  const showWarning = useCallback((title: string, message?: string) => addNotification({ type: 'warning', title, message }), [addNotification]);
  const showInfo = useCallback((title: string, message?: string) => addNotification({ type: 'info', title, message }), [addNotification]);

  return (
    <NotificationContext.Provider value={{ notifications, showSuccess, showError, showWarning, showInfo, removeNotification }}>
      {children}
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextValue => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return ctx;
};
