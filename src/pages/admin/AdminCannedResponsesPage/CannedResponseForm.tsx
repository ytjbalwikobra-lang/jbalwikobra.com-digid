/**
 * CannedResponseForm.tsx
 * Formulir modal untuk membuat/mengedit template respon cepat.
 */

import React, { useState, useEffect } from 'react';
import { AdminModal, ModalActions } from '../components/ui/AdminModal';
import type { CannedResponseRequest, CannedResponseCategory, ChatCannedResponse } from '../../../types/chat';

/** Daftar kategori template yang tersedia */
const CATEGORIES: { value: CannedResponseCategory; label: string }[] = [
  { value: 'greeting', label: 'Sapaan' },
  { value: 'closing', label: 'Penutup' },
  { value: 'faq', label: 'FAQ' },
  { value: 'technical', label: 'Teknis' },
  { value: 'status', label: 'Status' },
  { value: 'followup', label: 'Tindak Lanjut' },
  { value: 'other', label: 'Lainnya' }
];

interface CannedResponseFormProps {
  /** Apakah modal terbuka */
  isOpen: boolean;
  /** Callback tutup modal */
  onClose: () => void;
  /** Callback simpan data */
  onSave: (data: CannedResponseRequest) => Promise<void>;
  /** Data yang akan diedit (null untuk mode buat baru) */
  editData?: ChatCannedResponse | null;
  /** Status sedang menyimpan */
  saving: boolean;
}

/** Formulir modal template respon cepat */
export const CannedResponseForm: React.FC<CannedResponseFormProps> = ({
  isOpen, onClose, onSave, editData, saving
}) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<CannedResponseCategory>('other');
  const [shortcut, setShortcut] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Isi form saat data edit berubah
  useEffect(() => {
    if (editData) {
      setTitle(editData.title);
      setMessage(editData.message);
      setCategory(editData.category || 'other');
      setShortcut(editData.shortcut || '');
      setIsActive(editData.isActive);
    } else {
      setTitle('');
      setMessage('');
      setCategory('other');
      setShortcut('');
      setIsActive(true);
    }
  }, [editData, isOpen]);

  /** Handler submit form */
  const handleSubmit = async () => {
    if (!title.trim() || !message.trim()) return;
    await onSave({
      title: title.trim(),
      message: message.trim(),
      category,
      shortcut: shortcut.trim() || undefined,
      isActive
    });
  };

  const inputClass = 'w-full px-3 py-2 rounded-lg bg-[var(--admin-bg-surface)] border border-[var(--admin-border)] text-[var(--admin-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-accent)]/40';

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={editData ? 'Edit Template' : 'Buat Template Baru'}
      size="md"
      actions={
        <ModalActions.Save
          onSave={handleSubmit}
          onCancel={onClose}
          loading={saving}
        />
      }
    >
      <div className="space-y-4">
        {/* Judul */}
        <div>
          <label className="block text-sm font-medium text-[var(--admin-text-secondary)] mb-1">
            Judul <span className="text-[var(--admin-error)]">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
            placeholder="contoh: Sapaan Pembuka"
          />
        </div>

        {/* Pesan */}
        <div>
          <label className="block text-sm font-medium text-[var(--admin-text-secondary)] mb-1">
            Pesan <span className="text-[var(--admin-error)]">*</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={`${inputClass} min-h-[100px] resize-y`}
            placeholder="Tulis template pesan di sini..."
            rows={4}
          />
        </div>

        {/* Kategori dan Shortcut */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--admin-text-secondary)] mb-1">
              Kategori
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CannedResponseCategory)}
              className={inputClass}
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--admin-text-secondary)] mb-1">
              Shortcut
            </label>
            <input
              type="text"
              value={shortcut}
              onChange={(e) => setShortcut(e.target.value)}
              className={inputClass}
              placeholder="/sapaan"
            />
            <p className="text-xs text-[var(--admin-text-muted)] mt-1">
              Ketik di chat untuk akses cepat
            </p>
          </div>
        </div>

        {/* Status Aktif */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 rounded border-[var(--admin-border)] text-[var(--admin-accent)] focus:ring-[var(--admin-accent)]"
          />
          <span className="text-sm text-[var(--admin-text)]">Aktif</span>
        </label>
      </div>
    </AdminModal>
  );
};
