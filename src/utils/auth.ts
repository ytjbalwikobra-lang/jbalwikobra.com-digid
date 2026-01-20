/**
 * Auth utilities - Consolidated from multiple sources
 * Use authService.ts for all auth operations to maintain single source of truth
 */
import { getUserRole as getRole, isAdmin as checkAdmin } from '../services/authService';

export type UserRole = 'guest' | 'user' | 'admin' | 'super_admin';

/**
 * @deprecated Use authService.getUserRole() instead
 * This is kept for backward compatibility only
 */
export async function getUserRole(): Promise<string> {
  return await getRole();
}

/**
 * @deprecated Use authService.isAdmin() instead
 * This is kept for backward compatibility only
 */
export async function isAdmin(): Promise<boolean> {
  return await checkAdmin();
}
