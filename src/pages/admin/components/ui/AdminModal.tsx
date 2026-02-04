import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  actions?: React.ReactNode;
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  actions,
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, closeOnEscape, onClose]);

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (closeOnBackdropClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'max-w-md';
      case 'md':
        return 'max-w-lg';
      case 'lg':
        return 'max-w-2xl';
      case 'xl':
        return 'max-w-4xl';
      case 'full':
        return 'max-w-none m-4';
      default:
        return 'max-w-lg';
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalRef}
        className={`w-full ${getSizeClasses()} max-h-[90vh] flex flex-col animate-in fade-in-0 zoom-in-95 duration-200`}
      >
        <div className="admin-card flex flex-col max-h-full overflow-hidden" style={{background: 'var(--admin-primary-light)', border: '1px solid var(--admin-border)'}}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{borderColor: 'var(--admin-border)'}}>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="admin-btn-ghost p-2 rounded-cyber-lg hover:bg-[var(--cyber-bg-elevated)] transition-colors"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {children}
          </div>

          {/* Actions */}
          {actions && (
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t" style={{borderColor: 'var(--admin-border)'}}>
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Preset action configurations for common use cases
export const ModalActions = {
  Save: ({ onSave, onCancel, loading = false }: {
    onSave: () => void;
    onCancel: () => void;
    loading?: boolean;
  }) => (
    <>
      <button className="admin-btn admin-btn-secondary" onClick={onCancel} disabled={loading}>Cancel</button>
      <button className="admin-btn admin-btn-primary" onClick={onSave} disabled={loading}>Save</button>
    </>
  ),

  Delete: ({ onDelete, onCancel, loading = false }: {
    onDelete: () => void;
    onCancel: () => void;
    loading?: boolean;
  }) => (
    <>
      <button className="admin-btn admin-btn-secondary" onClick={onCancel} disabled={loading}>Cancel</button>
      <button className="admin-btn admin-btn-danger" onClick={onDelete} disabled={loading}>Delete</button>
    </>
  ),

  Confirm: ({ onConfirm, onCancel, loading = false, confirmText = "Confirm" }: {
    onConfirm: () => void;
    onCancel: () => void;
    loading?: boolean;
    confirmText?: string;
  }) => (
    <>
      <button className="admin-btn admin-btn-secondary" onClick={onCancel} disabled={loading}>Cancel</button>
      <button className="admin-btn admin-btn-primary" onClick={onConfirm} disabled={loading}>{confirmText}</button>
    </>
  )
};
