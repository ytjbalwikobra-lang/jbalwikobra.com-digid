/**
 * CannedResponseTable.tsx
 * Tabel daftar template respon cepat dengan aksi edit dan hapus.
 */

import React from 'react';
import { Edit2, Trash2, Zap } from 'lucide-react';
import { AdminButton } from '../components/ui/AdminButton';
import type { ChatCannedResponse } from '../../../types/chat';

/** Label kategori dalam Bahasa Indonesia */
const CATEGORY_LABELS: Record<string, string> = {
  greeting: 'Sapaan',
  closing: 'Penutup',
  faq: 'FAQ',
  technical: 'Teknis',
  status: 'Status',
  followup: 'Tindak Lanjut',
  other: 'Lainnya'
};

/** Warna badge kategori */
const CATEGORY_COLORS: Record<string, string> = {
  greeting: 'var(--admin-success)',
  closing: 'var(--admin-info)',
  faq: 'var(--admin-warning)',
  technical: 'var(--admin-purple)',
  status: 'var(--admin-orange)',
  followup: 'var(--admin-accent)',
  other: 'var(--admin-text-muted)'
};

interface CannedResponseTableProps {
  /** Daftar template respon */
  responses: ChatCannedResponse[];
  /** Handler klik edit */
  onEdit: (response: ChatCannedResponse) => void;
  /** Handler klik hapus */
  onDelete: (response: ChatCannedResponse) => void;
}

/** Tabel daftar template respon cepat */
export const CannedResponseTable: React.FC<CannedResponseTableProps> = ({
  responses, onEdit, onDelete
}) => {
  return (
    <div className="bg-[var(--admin-bg-card)] rounded-xl border border-[var(--admin-border)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--admin-border)]">
              {['Judul', 'Shortcut', 'Kategori', 'Pesan', 'Digunakan', 'Status', 'Aksi'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[var(--admin-text-muted)] uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--admin-border-lighter)]">
            {responses.map((resp) => (
              <tr key={resp.id} className="hover:bg-[var(--admin-bg-surface)] transition-colors">
                {/* Judul */}
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-[var(--admin-text)]">
                    {resp.title}
                  </span>
                </td>
                {/* Shortcut */}
                <td className="px-4 py-3">
                  {resp.shortcut ? (
                    <code className="text-xs px-2 py-0.5 rounded bg-[var(--admin-bg-surface)] text-[var(--admin-accent)] font-mono">
                      {resp.shortcut}
                    </code>
                  ) : (
                    <span className="text-xs text-[var(--admin-text-muted)]">—</span>
                  )}
                </td>
                {/* Kategori */}
                <td className="px-4 py-3">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      color: CATEGORY_COLORS[resp.category || 'other'],
                      backgroundColor: `color-mix(in srgb, ${CATEGORY_COLORS[resp.category || 'other']} 15%, transparent)`
                    }}
                  >
                    {CATEGORY_LABELS[resp.category || 'other']}
                  </span>
                </td>
                {/* Pesan (dipotong) */}
                <td className="px-4 py-3 max-w-[300px]">
                  <p className="text-sm text-[var(--admin-text-secondary)] truncate">
                    {resp.message}
                  </p>
                </td>
                {/* Jumlah penggunaan */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-sm text-[var(--admin-text-secondary)]">
                    <Zap className="w-3 h-3" />
                    {resp.usageCount}
                  </div>
                </td>
                {/* Status */}
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    resp.isActive
                      ? 'text-[var(--admin-success)] bg-[var(--admin-success)]/10'
                      : 'text-[var(--admin-text-muted)] bg-[var(--admin-bg-surface)]'
                  }`}>
                    {resp.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                {/* Tombol Aksi */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <AdminButton variant="ghost" size="sm" icon={<Edit2 className="w-3.5 h-3.5" />} onClick={() => onEdit(resp)}>{''}</AdminButton>
                    <AdminButton variant="ghost" size="sm" icon={<Trash2 className="w-3.5 h-3.5 text-[var(--admin-error)]" />} onClick={() => onDelete(resp)}>{''}</AdminButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
