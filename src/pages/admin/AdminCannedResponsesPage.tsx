/**
 * AdminCannedResponsesPage — Kelola template respon cepat
 * 
 * Halaman CRUD untuk mengelola template respon cepat chat.
 * Fitur: buat, edit, hapus, toggle aktif/nonaktif, filter kategori.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Zap, Save, X, ToggleLeft, ToggleRight, Hash } from 'lucide-react';
import { useToast } from '../../components/Toast';
import {
  adminGetCannedResponses,
  adminCreateCannedResponse,
  adminUpdateCannedResponse,
  adminDeleteCannedResponse
} from '../../services/chatService';
import type { ChatCannedResponse, CannedResponseCategory, CannedResponseRequest } from '../../types/chat';
import { AdminHeroSection } from './components/ui/AdminHeroSection';

/** Label kategori dalam Bahasa Indonesia */
const CATEGORY_LABELS: Record<CannedResponseCategory, string> = {
  greeting: 'Sapaan',
  closing: 'Penutup',
  faq: 'FAQ',
  technical: 'Teknis',
  status: 'Status',
  followup: 'Follow-up',
  other: 'Lainnya'
};

const CATEGORY_OPTIONS: CannedResponseCategory[] = ['greeting', 'closing', 'faq', 'technical', 'status', 'followup', 'other'];

/** Form state kosong */
const EMPTY_FORM: CannedResponseRequest = {
  title: '',
  message: '',
  category: 'other',
  shortcut: '',
  isActive: true,
  sortOrder: 0
};

const AdminCannedResponsesPage: React.FC = () => {
  const toast = useToast();
  
  const [responses, setResponses] = useState<ChatCannedResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Filter
  const [filterCategory, setFilterCategory] = useState<CannedResponseCategory | 'all'>('all');
  
  // Form modal
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CannedResponseRequest>(EMPTY_FORM);
  
  // Konfirmasi hapus
  const [deleteId, setDeleteId] = useState<string | null>(null);

  /** Muat semua template */
  const loadResponses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminGetCannedResponses();
      setResponses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[CannedResponses] Gagal memuat:', err);
      toast?.showToast('Gagal memuat template respon', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadResponses();
  }, [loadResponses]);

  /** Buka form buat baru */
  const handleCreate = useCallback(() => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  }, []);

  /** Buka form edit */
  const handleEdit = useCallback((item: ChatCannedResponse) => {
    setForm({
      title: item.title,
      message: item.message,
      category: item.category || 'other',
      shortcut: item.shortcut || '',
      isActive: item.isActive ?? true,
      sortOrder: item.sortOrder || 0
    });
    setEditingId(item.id);
    setShowForm(true);
  }, []);

  /** Simpan (buat baru / perbarui) */
  const handleSave = useCallback(async () => {
    if (!form.title.trim() || !form.message.trim()) {
      toast?.showToast('Judul dan pesan wajib diisi', 'error');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const result = await adminUpdateCannedResponse(editingId, form);
        if (result.error) {
          toast?.showToast(result.error, 'error');
          return;
        }
        toast?.showToast('Template berhasil diperbarui', 'success');
      } else {
        const result = await adminCreateCannedResponse(form);
        if (result.error) {
          toast?.showToast(result.error, 'error');
          return;
        }
        toast?.showToast('Template baru berhasil dibuat', 'success');
      }
      setShowForm(false);
      setEditingId(null);
      loadResponses();
    } catch (err: any) {
      toast?.showToast(err.message || 'Gagal menyimpan template', 'error');
    } finally {
      setSaving(false);
    }
  }, [form, editingId, toast, loadResponses]);

  /** Hapus template — dengan optimistic update */
  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    
    // Optimistic update: hapus dari list dulu untuk instant feedback
    const previousResponses = [...responses];
    setResponses(prev => prev.filter(r => r.id !== deleteId));
    setDeleteId(null);
    toast?.showToast('Template berhasil dihapus', 'success');
    
    // Background API call
    try {
      const result = await adminDeleteCannedResponse(deleteId);
      if (result.error) {
        // Revert jika API gagal
        setResponses(previousResponses);
        toast?.showToast(result.error, 'error');
        return;
      }
      // Success - reload untuk sync final state
      loadResponses();
    } catch (err: any) {
      // Revert jika exception
      setResponses(previousResponses);
      toast?.showToast(err.message || 'Gagal menghapus', 'error');
    }
  }, [deleteId, toast, loadResponses, responses]);

  /** Toggle aktif/nonaktif — dengan optimistic update */
  const handleToggleActive = useCallback(async (item: ChatCannedResponse) => {
    // Optimistic update: toggle isActive dulu untuk instant feedback
    const previousResponses = [...responses];
    setResponses(prev => prev.map(r => 
      r.id === item.id ? { ...r, isActive: !r.isActive } : r
    ));
    
    // Background API call
    try {
      const result = await adminUpdateCannedResponse(item.id, { isActive: !item.isActive });
      if (result.error) {
        // Revert jika API gagal
        setResponses(previousResponses);
        toast?.showToast(result.error, 'error');
        return;
      }
      toast?.showToast(`Template ${!item.isActive ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
      // Success - reload untuk sync final state
      loadResponses();
    } catch (err: any) {
      // Revert jika exception
      setResponses(previousResponses);
      toast?.showToast(err.message || 'Gagal update', 'error');
    }
  }, [toast, loadResponses, responses]);

  /** Filter template */
  const filtered = filterCategory === 'all'
    ? responses
    : responses.filter(r => r.category === filterCategory);

  // Kelas CSS yang digunakan berulang
  const inputCls = "w-full px-3 py-2.5 bg-[var(--admin-bg-elevated)] border border-[var(--admin-border)] rounded-lg text-[var(--admin-text)] placeholder-[var(--admin-text-muted)] focus:outline-none focus:border-[var(--admin-accent)] focus:ring-1 focus:ring-[var(--admin-accent)]/30 transition-all text-sm";
  const labelCls = "block text-xs font-medium text-[var(--admin-text-secondary)] mb-1.5";

  return (
    <>
      <AdminHeroSection
        title="Template Respon"
        subtitle="Kelola template respon cepat untuk percakapan chat"
        badge="TEMPLATE"
        badgeColor="pink"
      >
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--admin-accent)] text-white text-sm font-medium rounded-lg hover:brightness-110 active:scale-[0.98] transition-all touch-manipulation"
        >
          <Plus className="w-4 h-4" />
          Buat Template
        </button>
      </AdminHeroSection>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {/* Filter Kategori */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all touch-manipulation ${
              filterCategory === 'all'
                ? 'bg-[var(--admin-accent)] text-white'
                : 'bg-[var(--admin-bg-surface)] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-elevated)]'
            }`}
          >
            Semua ({responses.length})
          </button>
          {CATEGORY_OPTIONS.map(cat => {
            const count = responses.filter(r => r.category === cat).length;
            if (count === 0) return null;
            return (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all touch-manipulation ${
                  filterCategory === cat
                    ? 'bg-[var(--admin-accent)] text-white'
                    : 'bg-[var(--admin-bg-surface)] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-elevated)]'
                }`}
              >
                {CATEGORY_LABELS[cat]} ({count})
              </button>
            );
          })}
        </div>

        {/* Daftar Template */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-[var(--admin-accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Zap className="w-12 h-12 text-[var(--admin-text-muted)] mx-auto mb-3" />
            <p className="text-sm text-[var(--admin-text-secondary)]">
              {responses.length === 0 ? 'Belum ada template respon.' : 'Tidak ada template untuk kategori ini.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map(item => (
              <div
                key={item.id}
                className={`bg-[var(--admin-bg-surface)] border border-[var(--admin-border)] rounded-xl p-4 transition-all ${
                  !item.isActive ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-[var(--admin-text)] truncate">
                        {item.title}
                      </h4>
                      {item.shortcut && (
                        <span className="text-xs font-mono text-[var(--admin-accent)] bg-[var(--admin-accent)]/10 px-1.5 py-0.5 rounded shrink-0">
                          {item.shortcut}
                        </span>
                      )}
                      {item.category && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--admin-bg-elevated)] text-[var(--admin-text-tertiary)] shrink-0">
                          {CATEGORY_LABELS[item.category as CannedResponseCategory] || item.category}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--admin-text-secondary)] line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--admin-text-muted)]">
                      <span className="flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        Digunakan {item.usageCount || 0}x
                      </span>
                    </div>
                  </div>

                  {/* Aksi */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleToggleActive(item)}
                      className="p-1.5 rounded-lg hover:bg-white/5 active:scale-95 transition-all touch-manipulation"
                      title={item.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                    >
                      {item.isActive ? (
                        <ToggleRight className="w-5 h-5 text-[var(--admin-success)]" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-[var(--admin-text-muted)]" />
                      )}
                    </button>
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-1.5 rounded-lg hover:bg-white/5 text-[var(--admin-text-secondary)] hover:text-[var(--admin-accent)] active:scale-95 transition-all touch-manipulation"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(item.id)}
                      className="p-1.5 rounded-lg hover:bg-white/5 text-[var(--admin-text-secondary)] hover:text-[var(--admin-error)] active:scale-95 transition-all touch-manipulation"
                      title="Hapus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Form Buat/Edit */}
      {showForm && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--admin-bg-card)] border border-[var(--admin-border)] rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-[var(--admin-border)]">
              <h3 className="text-sm font-semibold text-[var(--admin-text)]">
                {editingId ? 'Edit Template' : 'Buat Template Baru'}
              </h3>
              <button
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="p-1.5 rounded-lg hover:bg-white/5 text-[var(--admin-text-secondary)] touch-manipulation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Judul */}
              <div>
                <label className={labelCls}>Judul *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                  className={inputCls}
                  placeholder="Contoh: Sapaan pembuka"
                  maxLength={100}
                />
              </div>

              {/* Shortcut */}
              <div>
                <label className={labelCls}>Shortcut (opsional)</label>
                <input
                  type="text"
                  value={form.shortcut || ''}
                  onChange={e => setForm(prev => ({ ...prev, shortcut: e.target.value }))}
                  className={inputCls}
                  placeholder="Contoh: /hello"
                  maxLength={30}
                />
                <p className="text-[10px] text-[var(--admin-text-muted)] mt-1">
                  Ketik shortcut di kotak pesan untuk filter cepat
                </p>
              </div>

              {/* Kategori */}
              <div>
                <label className={labelCls}>Kategori</label>
                <select
                  value={form.category || 'other'}
                  onChange={e => setForm(prev => ({ ...prev, category: e.target.value as CannedResponseCategory }))}
                  className={`${inputCls} appearance-none cursor-pointer`}
                >
                  {CATEGORY_OPTIONS.map(cat => (
                    <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                  ))}
                </select>
              </div>

              {/* Pesan */}
              <div>
                <label className={labelCls}>Pesan Template *</label>
                <textarea
                  value={form.message}
                  onChange={e => setForm(prev => ({ ...prev, message: e.target.value }))}
                  rows={5}
                  className={`${inputCls} resize-none`}
                  placeholder="Ketik pesan template yang akan dikirim ke pelanggan..."
                  maxLength={1000}
                />
                <p className="text-[10px] text-[var(--admin-text-muted)] mt-1">
                  {form.message.length}/1000 karakter
                </p>
              </div>

              {/* Urutan */}
              <div>
                <label className={labelCls}>Urutan Tampilan</label>
                <input
                  type="number"
                  value={form.sortOrder || 0}
                  onChange={e => setForm(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                  className={inputCls}
                  min={0}
                  max={999}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-[var(--admin-border)]">
              <button
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="px-4 py-2 text-sm text-[var(--admin-text-secondary)] hover:bg-white/5 rounded-lg transition-all touch-manipulation"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.title.trim() || !form.message.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--admin-accent)] text-white text-sm font-medium rounded-lg hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {deleteId && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--admin-bg-card)] border border-[var(--admin-border)] rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--admin-error)]/10 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-[var(--admin-error)]" />
            </div>
            <h3 className="text-sm font-semibold text-[var(--admin-text)] mb-2">Hapus Template?</h3>
            <p className="text-xs text-[var(--admin-text-secondary)] mb-5">
              Template yang dihapus tidak bisa dikembalikan.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm text-[var(--admin-text-secondary)] hover:bg-white/5 rounded-lg transition-all touch-manipulation"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-[var(--admin-error)] text-white text-sm font-medium rounded-lg hover:brightness-110 active:scale-[0.98] transition-all touch-manipulation"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminCannedResponsesPage;
