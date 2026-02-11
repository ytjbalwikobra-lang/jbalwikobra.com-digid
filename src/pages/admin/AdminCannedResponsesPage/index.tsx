/** Halaman admin untuk mengelola template respon cepat (canned responses) */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, MessageSquare, Zap, ToggleRight, FolderOpen } from 'lucide-react';
import { useToast } from '../../../components/Toast';
import { AdminHeroSection } from '../components/ui/AdminHeroSection';
import { AdminBentoMetricCard } from '../components/ui/AdminBentoCard';
import { AdminButton } from '../components/ui/AdminButton';
import { AdminEmptyState } from '../components/ui/AdminEmptyState';
import { AdminLoadingState } from '../components/ui/AdminLoadingState';
import {
  adminGetCannedResponses,
  adminCreateCannedResponse,
  adminUpdateCannedResponse,
  adminDeleteCannedResponse
} from '../../../services/chatAdminService';
import type { ChatCannedResponse, CannedResponseRequest, CannedResponseCategory } from '../../../types/chat';
import { CannedResponseForm } from './CannedResponseForm';
import { CannedResponseTable } from './CannedResponseTable';

const AdminCannedResponsesPage: React.FC = () => {
  const toast = useToast();
  const [responses, setResponses] = useState<ChatCannedResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // State modal
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<ChatCannedResponse | null>(null);
  // State filter
  const [filterCategory, setFilterCategory] = useState<CannedResponseCategory | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  /** Muat semua template dari API */
  const loadResponses = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await adminGetCannedResponses();
      if (error) { toast?.showToast(error, 'error'); return; }
      setResponses(data || []);
    } catch (err) {
      console.error('[CannedResponses] Gagal memuat template:', err);
      toast?.showToast('Gagal memuat template', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadResponses(); }, [loadResponses]);

  /** Simpan template baru atau perbarui yang ada */
  const handleSave = useCallback(async (data: CannedResponseRequest) => {
    setSaving(true);
    try {
      if (editItem) {
        const result = await adminUpdateCannedResponse(editItem.id, data);
        if (result.error) { toast?.showToast(result.error, 'error'); return; }
        toast?.showToast('Template berhasil diperbarui', 'success');
      } else {
        const result = await adminCreateCannedResponse(data);
        if (result.error) { toast?.showToast(result.error, 'error'); return; }
        toast?.showToast('Template berhasil dibuat', 'success');
      }
      setShowForm(false);
      setEditItem(null);
      loadResponses();
    } catch (err: any) {
      toast?.showToast(err.message || 'Gagal menyimpan template', 'error');
    } finally {
      setSaving(false);
    }
  }, [editItem, toast, loadResponses]);

  /** Handler hapus template */
  const handleDelete = useCallback(async (resp: ChatCannedResponse) => {
    if (!window.confirm(`Hapus template "${resp.title}"?`)) return;
    try {
      const result = await adminDeleteCannedResponse(resp.id);
      if (result.error) { toast?.showToast(result.error, 'error'); return; }
      toast?.showToast('Template berhasil dihapus', 'success');
      loadResponses();
    } catch (err: any) {
      toast?.showToast(err.message || 'Gagal menghapus template', 'error');
    }
  }, [toast, loadResponses]);

  /** Handler klik edit */
  const handleEdit = useCallback((resp: ChatCannedResponse) => {
    setEditItem(resp);
    setShowForm(true);
  }, []);

  /** Handler buka form tambah baru */
  const handleCreate = useCallback(() => {
    setEditItem(null);
    setShowForm(true);
  }, []);

  /** Template yang difilter */
  const filteredResponses = useMemo(() => {
    return responses.filter(r => {
      if (filterCategory !== 'all' && r.category !== filterCategory) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        return r.title.toLowerCase().includes(s) ||
               r.message.toLowerCase().includes(s) ||
               r.shortcut?.toLowerCase().includes(s);
      }
      return true;
    });
  }, [responses, filterCategory, searchTerm]);

  /** Statistik kartu metrik */
  const metrics = useMemo(() => {
    const active = responses.filter(r => r.isActive).length;
    const totalUsage = responses.reduce((sum, r) => sum + r.usageCount, 0);
    const categories = new Set(responses.map(r => r.category)).size;
    return [
      { label: 'Total Template', value: responses.length, icon: <MessageSquare className="w-4 h-4" /> },
      { label: 'Aktif', value: active, icon: <ToggleRight className="w-4 h-4" /> },
      { label: 'Total Digunakan', value: totalUsage, icon: <Zap className="w-4 h-4" /> },
      { label: 'Kategori', value: categories, icon: <FolderOpen className="w-4 h-4" /> }
    ];
  }, [responses]);

  /** Opsi filter kategori */
  const categoryOptions: { value: CannedResponseCategory | 'all'; label: string }[] = [
    { value: 'all', label: 'Semua' },
    { value: 'greeting', label: 'Sapaan' },
    { value: 'closing', label: 'Penutup' },
    { value: 'faq', label: 'FAQ' },
    { value: 'technical', label: 'Teknis' },
    { value: 'status', label: 'Status' },
    { value: 'followup', label: 'Tindak Lanjut' },
    { value: 'other', label: 'Lainnya' }
  ];

  return (
    <div className="min-h-screen bg-[var(--admin-bg-pure)]">
      <AdminHeroSection
        title="Template Respon"
        subtitle={`${responses.length} template respon cepat tersedia`}
        badge="CHAT"
        badgeColor="pink"
      />

      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Kartu Metrik */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {metrics.map((m, i) => (
            <AdminBentoMetricCard key={i} label={m.label} value={m.value} icon={m.icon} />
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Filter Kategori */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as any)}
              className="px-3 py-2 rounded-lg bg-[var(--admin-bg-surface)] border border-[var(--admin-border)] text-sm text-[var(--admin-text)] focus:outline-none focus:ring-2 focus:ring-[var(--admin-accent)]/40"
            >
              {categoryOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {/* Pencarian */}
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari template..."
              className="px-3 py-2 rounded-lg bg-[var(--admin-bg-surface)] border border-[var(--admin-border)] text-sm text-[var(--admin-text)] focus:outline-none focus:ring-2 focus:ring-[var(--admin-accent)]/40 w-64"
            />
          </div>
          <AdminButton variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleCreate}>
            Tambah Template
          </AdminButton>
        </div>

        {/* Konten Utama */}
        {loading ? (
          <AdminLoadingState message="Memuat template..." />
        ) : filteredResponses.length === 0 ? (
          <AdminEmptyState
            icon={<MessageSquare className="w-12 h-12" />}
            title="Belum Ada Template"
            description="Buat template respon cepat untuk mempercepat percakapan chat"
            hasFilters={!!searchTerm || filterCategory !== 'all'}
            action={{ label: 'Tambah Template', onClick: handleCreate, icon: <Plus className="w-4 h-4" /> }}
          />
        ) : (
          <CannedResponseTable
            responses={filteredResponses}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* Modal Form */}
      <CannedResponseForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditItem(null); }}
        onSave={handleSave}
        editData={editItem}
        saving={saving}
      />
    </div>
  );
};

export default AdminCannedResponsesPage;
