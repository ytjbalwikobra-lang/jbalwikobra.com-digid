/**
 * useRentalStatuses.ts
 * Hook untuk batch-fetch status rental produk.
 * Memanggil API sekali untuk semua produk yang terlihat, bukan N+1.
 */

import { useEffect, useState, useRef } from 'react';
import { ProductRentalStatusData } from '../types';
import { ProductService } from '../services/product';

/**
 * Batch-fetch status rental untuk daftar produk.
 * Hanya memfetch produk yang punya has_rental=true dan belum terjual.
 * @param productIds ID produk yang terlihat di layar
 * @param rentalProductIds Subset ID produk yang punya rental (untuk filter)
 */
export function useRentalStatuses(
  productIds: string[],
  rentalProductIds: string[]
): Record<string, ProductRentalStatusData | null> {
  const [statuses, setStatuses] = useState<Record<string, ProductRentalStatusData | null>>({});
  const prevIdsRef = useRef('');

  useEffect(() => {
    // Hanya fetch untuk produk yang support rental
    const idsToFetch = rentalProductIds.filter(id => productIds.includes(id));
    if (idsToFetch.length === 0) {
      setStatuses({});
      return;
    }

    // Cegah re-fetch jika ID tidak berubah
    const key = idsToFetch.sort().join(',');
    if (key === prevIdsRef.current) return;
    prevIdsRef.current = key;

    let cancelled = false;

    ProductService.getBatchRentalStatuses(idsToFetch).then(data => {
      if (!cancelled) setStatuses(data);
    });

    return () => { cancelled = true; };
  }, [productIds, rentalProductIds]);

  return statuses;
}
