/**
 * Admin User Modal Component
 * WCAG 2.1 AA Compliant Modal for Edit/View Users
 * Using unified AdminModal design system
 */

import React, { useState, useEffect } from 'react';
import { Save, Loader, User, Shield, ShieldOff } from 'lucide-react';
import { User as UserType } from '../../../services/adminService';
import { useToast } from '../../../components/Toast';
import { useAdminConfirm } from './ui/AdminConfirmModal';
import { AdminModal } from './ui/AdminModal';
import { AdminButton } from './ui/AdminButton';
import { useKeyboardShortcuts, createModalShortcuts } from '../../../hooks/useKeyboardShortcuts';

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
  const { showConfirm, ConfirmModal } = useAdminConfirm();

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    is_admin: false,
    is_active: true
  });

  // Keyboard shortcuts for power users
  useKeyboardShortcuts({
    enabled: isOpen && mode === 'edit',
    shortcuts: createModalShortcuts({
      onSave: () => {
        const form = document.querySelector('form');
        if (form) form.requestSubmit();
      },
      onCancel: onClose
    })
  });

  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        is_admin: user.is_admin || false,
        is_active: user.is_active !== false
      });
    }
  }, [isOpen, user]);

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'view' || !user) return;

    // Validation
    if (!formData.name.trim()) {
      push('Nama pengguna harus diisi', 'error');
      return;
    }

    // Show confirmation for admin role changes
    if (user.is_admin !== formData.is_admin) {
      const action = formData.is_admin ? 'memberikan' : 'mencabut';
      const confirmed = await showConfirm({
        title: 'Konfirmasi Perubahan Role',
        message: `Anda akan ${action} akses admin untuk "${formData.name}".\n\nLanjutkan?`,
        type: formData.is_admin ? 'info' : 'danger',
        confirmText: 'Ya, Lanjutkan',
        cancelText: 'Batal'
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
            name: formData.name,
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

      push('Pengguna berhasil diperbarui!', 'success');
      onSuccess();
      onClose();
    } catch (error: any) {
      push(`Gagal memperbarui pengguna: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!user) return;

    const confirmed = await showConfirm({
      title: 'Nonaktifkan Pengguna',
      message: `Anda akan menonaktifkan akun "${user.name}".\n\nPengguna tidak akan dapat login setelah dinonaktifkan.\n\nLanjutkan?`,
      type: 'danger',
      confirmText: 'Nonaktifkan',
      cancelText: 'Batal'
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

      push('Pengguna berhasil dinonaktifkan', 'success');
      onSuccess();
      onClose();
    } catch (error: any) {
      push(`Gagal menonaktifkan pengguna: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const title = mode === 'edit' ? 'Edit Pengguna' : 'Detail Pengguna';
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
          Nonaktifkan
        </AdminButton>
      )}
      <AdminButton
        type="button"
        onClick={onClose}
        variant="secondary"
        disabled={loading}
      >
        {isViewMode ? 'Tutup' : 'Batal'}
      </AdminButton>
      {!isViewMode && (
        <AdminButton
          type="submit"
          form="user-form"
          variant="primary"
          disabled={loading || !formData.name.trim()}
          icon={loading ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        >
          {loading ? 'Menyimpan...' : 'Simpan'}
        </AdminButton>
      )}
    </>
  );

  return (
    <>
      <ConfirmModal />
      <AdminModal
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        size="md"
        actions={modalActions}
      >
        <form id="user-form" onSubmit={handleSubmit} className="space-y-6">
          {/* User Avatar Preview */}
          <div className="flex items-center gap-4 p-4 rounded-xl" style={{ backgroundColor: 'var(--admin-primary)', border: '1px solid var(--admin-border)' }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--admin-primary-lighter)' }}>
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <div>
              <p className="text-white font-semibold">{user?.name || 'Unknown'}</p>
              <p className="text-gray-400 text-sm">{user?.email}</p>
              <div className="flex gap-2 mt-2">
                {user?.is_admin && (
                  <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                    Admin
                  </span>
                )}
                <span className={`px-2 py-1 text-xs rounded-full ${
                  user?.is_active !== false
                    ? 'bg-green-500/20 text-green-300'
                    : 'bg-red-500/20 text-red-300'
                }`}>
                  {user?.is_active !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="admin-label">
              Nama <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              className="admin-input"
              placeholder="Masukkan nama pengguna"
              disabled={isViewMode}
              required
            />
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
            <span className="admin-form-hint">Email tidak dapat diubah</span>
          </div>

          {/* Phone */}
          <div>
            <label className="admin-label">Nomor Telepon</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              className="admin-input"
              placeholder="+62..."
              disabled={isViewMode}
            />
          </div>

          {/* Admin Role Toggle */}
          <div>
            <label className="admin-label">Role</label>
            <button
              type="button"
              onClick={() => !isViewMode && updateField('is_admin', !formData.is_admin)}
              disabled={isViewMode}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 w-full ${
                formData.is_admin 
                  ? 'bg-purple-500/20 border-purple-500/30 text-purple-300' 
                  : 'text-gray-400 hover:text-white'
              } ${isViewMode ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
              style={{ 
                backgroundColor: formData.is_admin ? undefined : 'var(--admin-primary-light)',
                borderColor: formData.is_admin ? undefined : 'var(--admin-border)'
              }}
            >
              {formData.is_admin ? (
                <Shield className="w-5 h-5" />
              ) : (
                <ShieldOff className="w-5 h-5" />
              )}
              <div className="text-left">
                <p className="font-medium">{formData.is_admin ? 'Administrator' : 'User Biasa'}</p>
                <p className="text-xs opacity-70">
                  {formData.is_admin 
                    ? 'Memiliki akses penuh ke panel admin' 
                    : 'Hanya dapat mengakses fitur pengguna biasa'
                  }
                </p>
              </div>
            </button>
          </div>

          {/* Account Status */}
          <div>
            <label className="admin-label">Status Akun</label>
            <button
              type="button"
              onClick={() => !isViewMode && updateField('is_active', !formData.is_active)}
              disabled={isViewMode}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 w-full ${
                formData.is_active 
                  ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' 
                  : 'bg-red-500/20 border-red-500/30 text-red-400'
              } ${isViewMode ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
            >
              <div className={`w-4 h-4 rounded-full ${formData.is_active ? 'bg-emerald-400' : 'bg-red-400'}`} />
              <span>{formData.is_active ? 'Aktif' : 'Nonaktif'}</span>
            </button>
          </div>
        </form>
      </AdminModal>
    </>
  );
};

export default AdminUserModal;
