/**
 * Admin User Modal Component
 * WCAG 2.1 AA Compliant Modal for Edit/View Users
 * Using unified AdminModal design system
 * 
 * PHASE 1 FIXES APPLIED:
 * - Name validation (block submit if empty)
 * - PhoneInput component integration
 * - Dirty state check (warn before closing if unsaved)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Save, Loader, User, Shield, ShieldOff, AlertTriangle } from 'lucide-react';
import { User as UserType } from '../../../services/adminService';
import { useToast } from '../../../components/Toast';
import { useConfirmDialog } from '../../../contexts/ConfirmDialogContext';
import { AdminModal } from './ui/AdminModal';
import { AdminButton } from './ui/AdminButton';
import PhoneInput from '../../../components/PhoneInput';

interface AdminUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: UserType | null;
  mode: 'view' | 'edit';
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  is_admin: boolean;
  is_active: boolean;
}

export const AdminUserModal: React.FC<AdminUserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  user,
  mode
}) => {
  const [loading, setLoading] = useState(false);
  const { push } = useToast();
  const confirm = useConfirmDialog();

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    is_admin: false,
    is_active: true
  });

  // Track initial form data for dirty state detection
  const initialFormData = useRef<FormData | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  // Handle close with dirty state check
  const handleCloseWithCheck = useCallback(async () => {
    if (isDirty && mode === 'edit') {
      const confirmed = await confirm({
        title: 'Unsaved Changes',
        message: 'You have unsaved changes. Are you sure you want to close without saving?',
        type: 'danger',
        confirmText: 'Discard Changes',
        cancelText: 'Keep Editing'
      });
      
      if (!confirmed) return;
    }
    onClose();
  }, [isDirty, mode, confirm, onClose]);

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen && user) {
      const initialData: FormData = {
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        is_admin: user.is_admin || false,
        is_active: user.is_active !== false
      };
      setFormData(initialData);
      initialFormData.current = initialData;
      setIsDirty(false);
      setNameError(null);
    }
  }, [isOpen, user]);

  // Check for dirty state whenever form data changes
  useEffect(() => {
    if (initialFormData.current && mode === 'edit') {
      const hasChanges = 
        formData.name !== initialFormData.current.name ||
        formData.phone !== initialFormData.current.phone ||
        formData.is_admin !== initialFormData.current.is_admin ||
        formData.is_active !== initialFormData.current.is_active;
      setIsDirty(hasChanges);
    }
  }, [formData, mode]);

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear name error when user types
    if (field === 'name') {
      setNameError(null);
    }
  };

  // Validate name field
  const validateName = (name: string): boolean => {
    if (!name.trim()) {
      setNameError('Name is required');
      return false;
    }
    if (name.trim().length < 2) {
      setNameError('Name must be at least 2 characters');
      return false;
    }
    setNameError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'view' || !user) return;

    // Strict name validation
    if (!validateName(formData.name)) {
      push('Please enter a valid name', 'error');
      return;
    }

    // Show confirmation for admin role changes
    if (user.is_admin !== formData.is_admin) {
      const action = formData.is_admin ? 'grant' : 'revoke';
      const confirmed = await confirm({
        title: 'Confirm Role Change',
        message: `You are about to ${action} admin access for "${formData.name}".\n\nContinue?`,
        type: formData.is_admin ? 'info' : 'danger',
        confirmText: 'Yes, Continue',
        cancelText: 'Cancel'
      });

      if (!confirmed) return;
    }

    setLoading(true);
    try {
      const sessionToken = localStorage.getItem('session_token') || '';
      
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          action: 'updateUser',
          id: user.id,
          fields: {
            name: formData.name.trim(),
            phone: formData.phone,
            is_admin: formData.is_admin,
            is_active: formData.is_active
          }
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update user');
      }

      push('User updated successfully!', 'success');
      setIsDirty(false);
      onSuccess();
      onClose();
    } catch (error: any) {
      push(`Failed to update user: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!user) return;

    const confirmed = await confirm({
      title: 'Deactivate User',
      message: `You are about to deactivate "${user.name}".\n\nThe user will not be able to login after deactivation.\n\nContinue?`,
      type: 'danger',
      confirmText: 'Deactivate',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    setLoading(true);
    try {
      const sessionToken = localStorage.getItem('session_token') || '';
      
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          action: 'updateUser',
          id: user.id,
          fields: {
            is_active: false
          }
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to deactivate user');
      }

      push('User deactivated successfully', 'success');
      onSuccess();
      onClose();
    } catch (error: any) {
      push(`Failed to deactivate user: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const title = mode === 'edit' ? 'Edit User' : 'User Details';
  const isViewMode = mode === 'view';

  // Modal actions
  const modalActions = (
    <>
      {mode === 'edit' && user?.is_active !== false && (
        <AdminButton
          type="button"
          onClick={handleDeactivate}
          variant="danger"
          disabled={loading}
        >
          Deactivate
        </AdminButton>
      )}
      <AdminButton
        type="button"
        onClick={handleCloseWithCheck}
        variant="secondary"
        disabled={loading}
      >
        {isViewMode ? 'Close' : 'Cancel'}
      </AdminButton>
      {!isViewMode && (
        <AdminButton
          type="submit"
          form="user-form"
          variant="primary"
          disabled={loading || !formData.name.trim()}
          icon={loading ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        >
          {loading ? 'Saving...' : 'Save'}
        </AdminButton>
      )}
    </>
  );

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={handleCloseWithCheck}
      title={title}
      size="md"
      actions={modalActions}
    >
        <form id="user-form" onSubmit={handleSubmit} className="space-y-3">
          {/* Dirty State Warning */}
          {isDirty && mode === 'edit' && (
            <div className="flex items-center gap-2 p-4 rounded-cyber-lg bg-[var(--admin-warning)]/10 border border-[var(--admin-warning)]/30">
              <AlertTriangle className="w-4 h-4 text-[var(--admin-warning)]" />
              <span className="text-sm text-[var(--admin-warning)]">You have unsaved changes</span>
            </div>
          )}

          {/* User Avatar Preview */}
          <div className="flex items-center gap-4 p-4 rounded-cyber-lg" style={{ backgroundColor: 'var(--admin-primary)', border: '1px solid var(--admin-border)' }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--admin-primary-lighter)' }}>
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-[var(--admin-text-muted)]" />
              )}
            </div>
            <div>
              <p className="text-[var(--admin-text)] font-semibold">{user?.name || 'Unknown'}</p>
              <p className="text-[var(--admin-text-muted)] text-sm">{user?.email}</p>
              <div className="flex gap-2 mt-2">
                {user?.is_admin && (
                  <span className="px-2 py-1 bg-[var(--admin-purple)]/20 text-[var(--admin-purple)] text-xs rounded-full">
                    Admin
                  </span>
                )}
                <span className={`px-2 py-1 text-xs rounded-full ${
                  user?.is_active !== false
                    ? 'bg-[var(--admin-success)]/20 text-[var(--admin-success)]'
                    : 'bg-[var(--admin-error)]/20 text-[var(--admin-error)]'
                }`}>
                  {user?.is_active !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="admin-label">
              Name <span className="text-[var(--admin-error)]">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              onBlur={() => validateName(formData.name)}
              className={`admin-input ${nameError ? 'border-[var(--admin-error)]' : ''}`}
              placeholder="Enter user name"
              disabled={isViewMode}
              required
              minLength={2}
            />
            {nameError && (
              <span className="text-[var(--admin-error)] text-xs mt-1 block">{nameError}</span>
            )}
          </div>

          {/* Email (Read-only) */}
          <div>
            <label className="admin-label">Email</label>
            <input
              type="email"
              value={formData.email}
              className="admin-input"
              disabled
            />
            <span className="admin-form-hint">Email cannot be changed</span>
          </div>

          {/* Phone - Using PhoneInput Component */}
          <div>
            <label className="admin-label">Phone Number</label>
            {isViewMode ? (
              <input
                type="text"
                value={formData.phone || '-'}
                className="admin-input"
                disabled
              />
            ) : (
              <PhoneInput
                value={formData.phone}
                onChange={(value) => updateField('phone', value)}
                placeholder="Enter phone number"
                className="admin-input"
                defaultCountry="ID"
              />
            )}
          </div>

          {/* Admin Role Toggle */}
          <div>
            <label className="admin-label">Role</label>
            <button
              type="button"
              onClick={() => !isViewMode && updateField('is_admin', !formData.is_admin)}
              disabled={isViewMode}
              className={`flex items-center gap-4 px-4 py-4 rounded-cyber-lg border transition-all duration-200 w-full ${
                formData.is_admin
                  ? 'bg-[var(--admin-purple)]/20 border-[var(--admin-purple)]/30 text-[var(--admin-purple)]'
                  : 'text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'
              } ${isViewMode ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
              style={{ 
                backgroundColor: formData.is_admin ? undefined : 'var(--admin-primary-light)',
                borderColor: formData.is_admin ? undefined : 'var(--admin-border)'
              }}
            >
              {formData.is_admin ? (
                <Shield className="w-6 h-6" />
              ) : (
                <ShieldOff className="w-6 h-6" />
              )}
              <div className="text-left">
                <p className="font-medium">{formData.is_admin ? 'Administrator' : 'Regular User'}</p>
                <p className="text-xs opacity-70">
                  {formData.is_admin 
                    ? 'Has full access to admin panel' 
                    : 'Can only access regular user features'
                  }
                </p>
              </div>
            </button>
          </div>

          {/* Account Status */}
          <div>
            <label className="admin-label">Account Status</label>
            <button
              type="button"
              onClick={() => !isViewMode && updateField('is_active', !formData.is_active)}
              disabled={isViewMode}
              className={`flex items-center gap-4 px-4 py-4 rounded-cyber-lg border transition-all duration-200 w-full ${
                formData.is_active
                  ? 'bg-[var(--admin-success)]/20 border-[var(--admin-success)]/30 text-[var(--admin-success)]'
                  : 'bg-[var(--admin-error)]/20 border-[var(--admin-error)]/30 text-[var(--admin-error)]'
              } ${isViewMode ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
            >
              <div className={`w-4 h-4 rounded-full ${formData.is_active ? 'bg-[var(--admin-success)]' : 'bg-[var(--admin-error)]'}`} />
              <span>{formData.is_active ? 'Active' : 'Inactive'}</span>
            </button>
          </div>
        </form>
    </AdminModal>
  );
};

export default AdminUserModal;
