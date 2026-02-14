/**
 * useRentalStatuses.ts
 * Hook untuk batch-fetch status rental produk + realtime subscription.
 * Memanggil API sekali untuk semua produk yang terlihat, bukan N+1.
 * Subscribe ke perubahan orders table agar badge auto-update.
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { ProductRentalStatusData } from '../types';
import { ProductService } from '../services/product';
import { supabase } from '../services/supabase';

/**
 * Batch-fetch status rental untuk daftar produk + realtime auto-refresh.
 * Hanya memfetch produk yang punya has_rental=true.
 * @param productIds ID produk yang terlihat di layar
 * @param rentalProductIds Subset ID produk yang punya rental (untuk filter)
 */
export function useRentalStatuses(
  productIds: string[],
  rentalProductIds: string[]
): Record<string, ProductRentalStatusData | null> {
  const [statuses, setStatuses] = useState<Record<string, ProductRentalStatusData | null>>({});
  const prevIdsRef = useRef('');
  const idsToFetchRef = useRef<string[]>([]);

  // Fungsi re-fetch yang bisa dipanggil dari realtime callback
  const refetch = useCallback(() => {
    if (idsToFetchRef.current.length === 0) return;
    ProductService.getBatchRentalStatuses(idsToFetchRef.current).then(data => {
      setStatuses(data);
    });
  }, []);

  // Initial fetch ketika product IDs berubah
  useEffect(() => {
    const idsToFetch = rentalProductIds.filter(id => productIds.includes(id));
    if (idsToFetch.length === 0) {
      setStatuses({});
      idsToFetchRef.current = [];
      return;
    }

    // Cegah re-fetch jika ID tidak berubah
    const key = idsToFetch.sort().join(',');
    if (key === prevIdsRef.current) return;
    prevIdsRef.current = key;
    idsToFetchRef.current = idsToFetch;

    let cancelled = false;

    ProductService.getBatchRentalStatuses(idsToFetch).then(data => {
      if (!cancelled) setStatuses(data);
    });

    return () => { cancelled = true; };
  }, [productIds, rentalProductIds]);

  // Realtime subscription — dengarkan perubahan rental_status di orders table
  useEffect(() => {
    if (!supabase || idsToFetchRef.current.length === 0) return;

    const channel = supabase
      .channel('rental-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          // Hanya refetch jika order yang berubah terkait dengan produk yang kita pantau
          const changedProductId = (payload.new as any)?.product_id;
          const orderType = (payload.new as any)?.order_type;
          if (orderType === 'rental' && changedProductId && idsToFetchRef.current.includes(changedProductId)) {
            refetch();
          }
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [refetch]);

  return statuses;
}
