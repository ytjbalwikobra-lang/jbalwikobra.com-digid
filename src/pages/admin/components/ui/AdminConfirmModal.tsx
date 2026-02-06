/**
 * Admin Confirmation Modal Component - V3 Design System
 * Modal for confirming delete, update, and critical actions
 * WCAG 2.1 AA Compliant with keyboard navigation
 */

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Info, CheckCircle, XCircle, X } from 'lucide-react';

export type ConfirmationType = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  type?: ConfirmationType;
  confirmText?: string;
  cancelText?: string;
  confirmLoading?: boolean;
}

export const AdminConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'danger',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmLoading = false,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap and keyboard navigation
  useEffect(() => {
    if (isOpen) {
      // Focus the cancel button when modal opens (prevent scroll jump)
      cancelButtonRef.current?.focus({ preventScroll: true });

      // Prevent body scroll
      document.body.style.overflow = 'hidden';

      // Handle escape key
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscape);

      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <XCircle className="admin-confirm-icon admin-confirm-icon-danger" />;
      case 'warning':
        return <AlertTriangle className="admin-confirm-icon admin-confirm-icon-warning" />;
      case 'success':
        return <CheckCircle className="admin-confirm-icon admin-confirm-icon-success" />;
      case 'info':
        return <Info className="admin-confirm-icon admin-confirm-icon-info" />;
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleConfirm = () => {
    if (!confirmLoading) {
      onConfirm();
    }
  };

  // Use portal to render at document root to avoid scroll issues from nested modals
  return createPortal(
    <div
      className="admin-confirm-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-description"
    >
      <div className={`admin-confirm-modal admin-confirm-${type}`} ref={modalRef}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="admin-confirm-close"
          aria-label="Close modal"
          disabled={confirmLoading}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="admin-confirm-icon-wrapper">
          {getIcon()}
        </div>

        {/* Content */}
        <div className="admin-confirm-content">
          <h3 id="confirm-modal-title" className="admin-confirm-title">
            {title}
          </h3>
          <p id="confirm-modal-description" className="admin-confirm-message">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="admin-confirm-actions">
          <button
            ref={cancelButtonRef}
            onClick={onClose}
            className="admin-confirm-button admin-confirm-button-cancel"
            disabled={confirmLoading}
            type="button"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`admin-confirm-button admin-confirm-button-confirm admin-confirm-button-${type}`}
            disabled={confirmLoading}
            type="button"
          >
            {confirmLoading ? (
              <>
                <span className="admin-confirm-spinner" />
                Processing...
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

/**
 * Hook for using confirmation modal
 * Usage:
 * const { showConfirm, ConfirmModal } = useAdminConfirm();
 * 
 * // In JSX
 * <ConfirmModal />
 * 
 * // To show modal
 * const handleDelete = async () => {
 *   const confirmed = await showConfirm({
 *     title: 'Delete Product',
 *     message: 'Are you sure you want to delete this product?',
 *     type: 'danger'
 *   });
 *   if (confirmed) {
 *     // Do delete
 *   }
 * };
 */
export const useAdminConfirm = () => {
  const [modalState, setModalState] = React.useState<{
    isOpen: boolean;
    props: Omit<ConfirmModalProps, 'isOpen' | 'onClose' | 'onConfirm'>;
    resolve: ((value: boolean) => void) | null;
  }>({
    isOpen: false,
    props: {
      title: '',
      message: '',
    },
    resolve: null,
  });

  const showConfirm = (
    props: Omit<ConfirmModalProps, 'isOpen' | 'onClose' | 'onConfirm' | 'confirmLoading'>
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        props,
        resolve,
      });
    });
  };

  const handleClose = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
    if (modalState.resolve) {
      modalState.resolve(false);
    }
  };

  const handleConfirm = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
    if (modalState.resolve) {
      modalState.resolve(true);
    }
  };

  const ConfirmModal = () => (
    <AdminConfirmModal
      isOpen={modalState.isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
      {...modalState.props}
    />
  );

  return {
    showConfirm,
    ConfirmModal,
  };
};
