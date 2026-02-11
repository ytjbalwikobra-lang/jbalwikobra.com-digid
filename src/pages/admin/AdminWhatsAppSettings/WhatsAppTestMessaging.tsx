/**
 * WhatsAppTestMessaging.tsx
 * Bagian test messaging dan modal hasil pengiriman
 */

import React from 'react';
import {
  Send, CheckCircle, AlertCircle, X,
  MessageCircle, Zap, Clock, Users
} from 'lucide-react';
import { AdminButton } from '../components/ui/AdminButton';
import type { WhatsAppGroup, ResultModalState } from './types';
import { MESSAGE_TEMPLATES } from './types';

interface WhatsAppTestMessagingProps {
  /** Daftar grup WhatsApp */
  groups: WhatsAppGroup[];
  /** ID grup default */
  defaultGroupId: string;
  /** ID grup target custom */
  customGroupId: string;
  /** Handler perubahan grup target */
  onCustomGroupChange: (value: string) => void;
  /** Template yang dipilih */
  selectedTemplate: string;
  /** Handler perubahan template */
  onTemplateChange: (templateId: string) => void;
  /** Teks pesan test */
  testMessage: string;
  /** Handler perubahan pesan test */
  onTestMessageChange: (value: string) => void;
  /** Handler kirim test */
  onSend: () => void;
  /** Status sedang mengirim */
  testing: boolean;
  /** State modal hasil */
  resultModal: ResultModalState;
  /** Handler tutup modal */
  onCloseModal: () => void;
}

/** Bagian test messaging dengan modal hasil */
export const WhatsAppTestMessaging: React.FC<WhatsAppTestMessagingProps> = ({
  groups, defaultGroupId, customGroupId, onCustomGroupChange,
  selectedTemplate, onTemplateChange,
  testMessage, onTestMessageChange,
  onSend, testing, resultModal, onCloseModal
}) => (
  <>
    {/* Section Test Messaging */}
    <div className="bg-[var(--admin-bg-pure)] rounded-cyber-lg border border-[var(--admin-border)] p-3">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-cyber-lg bg-gradient-to-br from-[var(--admin-accent)] to-[var(--admin-accent-glow)]">
          <Send className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Test Messaging</h2>
          <p className="text-xs text-[var(--admin-text-muted)]">Kirim pesan percobaan untuk verifikasi</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1.5 text-[var(--admin-text-muted)]">Target Group (Opsional)</label>
            <select
              className="w-full px-3 py-2.5 bg-[var(--admin-bg-surface)] border border-[var(--admin-border)] rounded-cyber-lg text-[var(--admin-text)] text-sm focus:border-[var(--admin-accent)]"
              value={customGroupId}
              onChange={(e) => onCustomGroupChange(e.target.value)}
            >
              <option value="">-- Gunakan default --</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-[var(--admin-text-muted)]">Template Pesan</label>
            <select
              className="w-full px-3 py-2.5 bg-[var(--admin-bg-surface)] border border-[var(--admin-border)] rounded-cyber-lg text-[var(--admin-text)] text-sm focus:border-[var(--admin-accent)]"
              value={selectedTemplate}
              onChange={(e) => onTemplateChange(e.target.value)}
            >
              {MESSAGE_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5 text-[var(--admin-text-muted)]">Pesan Test</label>
          <textarea
            className="w-full px-3 py-2.5 h-28 bg-[var(--admin-bg-surface)] border border-[var(--admin-border)] rounded-cyber-lg resize-none text-[var(--admin-text)] placeholder-muted focus:border-[var(--admin-accent)] font-mono text-xs"
            value={testMessage}
            onChange={(e) => onTestMessageChange(e.target.value)}
            placeholder="Masukkan pesan test..."
          />
          <p className="text-xs mt-1 text-[var(--admin-text-muted)]">Gunakan *bold*, _italic_ untuk formatting</p>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3 mt-4 pt-4 border-t border-[var(--admin-border)]">
        <p className="text-xs text-[var(--admin-text-muted)]">
          Target: {customGroupId
            ? groups.find(g => g.id === customGroupId)?.name || 'Custom'
            : groups.find(g => g.id === defaultGroupId)?.name || defaultGroupId || 'Belum dipilih'}
        </p>
        <AdminButton variant="success" onClick={onSend} disabled={testing || !testMessage.trim()} icon={<Send size={18} />}>
          {testing ? 'Mengirim...' : 'Kirim Test'}
        </AdminButton>
      </div>
    </div>

    {/* Modal Hasil */}
    {resultModal.isOpen && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onCloseModal()}
      >
        <div className={`relative w-full max-w-md bg-[var(--admin-bg-pure)] rounded-cyber-lg border shadow-2xl ${resultModal.success ? 'border-[var(--admin-success)]/30' : 'border-[var(--admin-error)]/30'}`}>
          <button onClick={onCloseModal} className="absolute top-3 right-3 p-1 rounded-cyber-lg text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-bg-surface)]" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
          <div className="pt-6 pb-3 flex justify-center">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${resultModal.success ? 'bg-[var(--admin-success)]/20 text-[var(--admin-success)]' : 'bg-[var(--admin-error)]/20 text-[var(--admin-error)]'}`}>
              {resultModal.success ? <CheckCircle className="w-7 h-7" /> : <AlertCircle className="w-7 h-7" />}
            </div>
          </div>
          <div className="px-6 pb-4 text-center">
            <h3 className="text-lg font-semibold text-[var(--admin-text)] mb-1">{resultModal.title}</h3>
            <p className="text-[var(--admin-text-muted)] text-sm">{resultModal.message}</p>
          </div>

          {resultModal.details && (
            <div className="px-6 pb-4">
              <div className="bg-[var(--admin-bg-surface)]/50 rounded-cyber-lg p-4 space-y-2">
                {resultModal.details.messageId && resultModal.details.messageId !== 'N/A' && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--admin-text-muted)] flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5" /> Message ID</span>
                    <span className="text-[var(--admin-text)] font-mono bg-[var(--admin-bg-elevated)] px-1.5 py-0.5 rounded text-xs">{resultModal.details.messageId}</span>
                  </div>
                )}
                {resultModal.details.provider && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--admin-text-muted)] flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Provider</span>
                    <span className="text-[var(--admin-text)]">{resultModal.details.provider}</span>
                  </div>
                )}
                {resultModal.details.responseTime !== undefined && resultModal.details.responseTime > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--admin-text-muted)] flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Response</span>
                    <span className="text-[var(--admin-success)]">{resultModal.details.responseTime}ms</span>
                  </div>
                )}
                {resultModal.details.groupId && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--admin-text-muted)] flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Group</span>
                    <span className="text-[var(--admin-text)] text-xs truncate max-w-[180px]">
                      {groups.find(g => g.id === resultModal.details?.groupId)?.name || resultModal.details.groupId}
                    </span>
                  </div>
                )}
                {resultModal.details.sentMessage && (
                  <div className="pt-2 border-t border-[var(--admin-border)]">
                    <p className="text-[var(--admin-text-muted)] text-xs mb-1">Pesan:</p>
                    <p className="text-[var(--admin-text-secondary)] text-xs font-mono bg-[var(--admin-bg-pure)]/50 p-2 rounded whitespace-pre-wrap">{resultModal.details.sentMessage}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="px-6 pb-6">
            <AdminButton variant={resultModal.success ? 'success' : 'danger'} fullWidth onClick={onCloseModal}>
              {resultModal.success ? 'Done' : 'Close'}
            </AdminButton>
          </div>
        </div>
      </div>
    )}
  </>
);
