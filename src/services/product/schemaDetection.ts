/**
 * schemaDetection.ts
 * Deteksi kapabilitas skema database (relational, rental, flash sales)
 */

import { supabase } from '../supabase';
import { capState } from './helpers';

/**
 * Test dan deteksi kapabilitas skema saat ini
 * Mengecek apakah tabel products punya relasi, rental_options, dan flash_sales
 */
export async function detectSchemaCapabilities(): Promise<{
  hasRelationalSchema: boolean;
  hasRentalOptions: boolean;
  hasFlashSales: boolean;
}> {
  if (!supabase) {
    return { hasRelationalSchema: false, hasRentalOptions: false, hasFlashSales: false };
  }

  const capabilities = {
    hasRelationalSchema: false,
    hasRentalOptions: false,
    hasFlashSales: false
  };

  try {
    // Test relational schema
    const { error } = await supabase
      .from('products')
      .select('id, game_title_id, tier_id')
      .limit(1);

    if (!error) {
      capabilities.hasRelationalSchema = true;
      capState.hasRelations = true;
    } else {
      capState.hasRelations = false;
    }

    // Test rental options
    const { error: rentalError } = await supabase
      .from('rental_options')
      .select('id')
      .limit(1);

    if (!rentalError) {
      capabilities.hasRentalOptions = true;
    }

    // Test flash sales
    const { error: flashError } = await supabase
      .from('flash_sales')
      .select('id')
      .limit(1);

    if (!flashError) {
      capabilities.hasFlashSales = true;
    }

  } catch (error) {
    console.error('🔥 Schema detection failed:', error);
  }

  return capabilities;
}
