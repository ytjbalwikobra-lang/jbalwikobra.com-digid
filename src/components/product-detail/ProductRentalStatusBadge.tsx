/**
 * ProductRentalStatusBadge.tsx
 * Komponen indikator status rental pada halaman detail produk publik.
 * Menampilkan apakah akun sedang di-rental, durasi sisa, dan antrian.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Clock, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import { ProductRentalStatusData } from '../../types';
import { ProductService } from '../../services/product';

interface ProductRentalStatusBadgeProps {
  /** ID produk yang dicek */
  productId: string;
  /** Apakah produk punya opsi rental */
  hasRental: boolean;
}

/** Hitung sisa waktu dari rentalEndDate dalam format human-readable */
function formatTimeRemaining(endDate: string): string {
  const end = new Date(endDate).getTime();
  const now = Date.now();
  const diffMs = end - now;

  if (diffMs <= 0) return 'Sudah habis';

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days} hari ${hours} jam`;
  if (hours > 0) return `${hours} jam ${minutes} menit`;
  return `${minutes} menit`;
}

/** Format tanggal estimasi ketersediaan */
function formatEstimatedDate(endDate: string): string {
  const date = new Date(endDate);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export const ProductRentalStatusBadge = React.memo<ProductRentalStatusBadgeProps>(({
  productId,
  hasRental
}) => {
  const [status, setStatus] = useState<ProductRentalStatusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');

  // Fetch status rental saat mount
  useEffect(() => {
    if (!hasRental || !productId) return;

    let cancelled = false;
    setLoading(true);

    ProductService.getProductRentalStatus(productId).then(data => {
      if (!cancelled) {
        setStatus(data);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [productId, hasRental]);

  // Update countdown setiap menit
  useEffect(() => {
    if (!status?.rentalEndDate) return;

    setTimeRemaining(formatTimeRemaining(status.rentalEndDate));

    const interval = setInterval(() => {
      setTimeRemaining(formatTimeRemaining(status.rentalEndDate));
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [status?.rentalEndDate]);

  // Progress bar: persentase waktu yang sudah berlalu
  const progressPercent = useMemo(() => {
    if (!status) return 0;
    // Estimasi durasi total dari string rental_duration
    const now = Date.now();
    const end = new Date(status.rentalEndDate).getTime();
    const remaining = Math.max(0, end - now);

    // Parse durasi total dari rentalDuration string
    const durationStr = status.rentalDuration.toLowerCase();
    let totalMs = 0;
    if (durationStr.includes('hari')) {
      const days = parseInt(durationStr) || 1;
      totalMs = days * 24 * 60 * 60 * 1000;
    } else if (durationStr.includes('minggu')) {
      const weeks = parseInt(durationStr) || 1;
      totalMs = weeks * 7 * 24 * 60 * 60 * 1000;
    } else if (durationStr.includes('bulan')) {
      const months = parseInt(durationStr) || 1;
      totalMs = months * 30 * 24 * 60 * 60 * 1000;
    } else {
      totalMs = 24 * 60 * 60 * 1000; // default 1 hari
    }

    const elapsed = totalMs - remaining;
    return Math.min(100, Math.max(0, (elapsed / totalMs) * 100));
  }, [status]);

  // Jangan tampilkan jika bukan produk rental atau sedang loading
  if (!hasRental) return null;
  if (loading) return null;

  // Produk tersedia — tidak ada rental aktif
  if (!status) {
    return (
      <div className="mb-4 p-3 rounded-xl border border-[var(--cyber-success)]/20 bg-[var(--cyber-success)]/5">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-[var(--cyber-success)] shrink-0" />
          <span className="text-sm font-medium text-[var(--cyber-success)]">
            Akun tersedia untuk rental
          </span>
        </div>
      </div>
    );
  }

  const isExpiringSoon = status.rentalStatus === 'expiring_soon';

  return (
    <div className={`mb-4 p-4 rounded-xl border ${
      isExpiringSoon
        ? 'border-[var(--cyber-warning)]/30 bg-[var(--cyber-warning)]/5'
        : 'border-[var(--cyber-accent)]/20 bg-[var(--cyber-accent)]/5'
    }`}>
      {/* Status utama */}
      <div className="flex items-center gap-2 mb-3">
        {isExpiringSoon ? (
          <AlertTriangle className="w-4 h-4 text-[var(--cyber-warning)] shrink-0" />
        ) : (
          <Clock className="w-4 h-4 text-[var(--cyber-accent)] shrink-0" />
        )}
        <span className={`text-sm font-semibold ${
          isExpiringSoon ? 'text-[var(--cyber-warning)]' : 'text-[var(--cyber-accent)]'
        }`}>
          {isExpiringSoon ? 'Akun hampir selesai di-rental' : 'Akun sedang di-rental'}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isExpiringSoon
                ? 'bg-[var(--cyber-warning)]'
                : 'bg-[var(--cyber-accent)]'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Detail info */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--cyber-text-muted)]">Durasi rental</span>
          <span className="text-[var(--cyber-text-secondary)] font-medium">{status.rentalDuration}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--cyber-text-muted)]">Sisa waktu</span>
          <span className={`font-medium ${
            isExpiringSoon ? 'text-[var(--cyber-warning)]' : 'text-[var(--cyber-text-secondary)]'
          }`}>
            {timeRemaining}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--cyber-text-muted)]">Estimasi tersedia</span>
          <span className="text-[var(--cyber-text-secondary)]">{formatEstimatedDate(status.rentalEndDate)}</span>
        </div>

        {/* Antrian */}
        {status.queueCount > 0 && (
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/5">
            <Users className="w-3.5 h-3.5 text-[var(--cyber-info)]" />
            <span className="text-xs text-[var(--cyber-info)]">
              {status.queueCount} orang dalam antrian
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

ProductRentalStatusBadge.displayName = 'ProductRentalStatusBadge';
