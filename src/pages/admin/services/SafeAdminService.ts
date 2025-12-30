/**
 * Production-ready fallback for admin API when service fails
 * This prevents console errors and provides graceful degradation
 */

export class SafeAdminService {
  private static readonly FALLBACK_STATS = {
    orders: { count: 0, completed: 0, revenue: 0, completedRevenue: 0 },
    users: { count: 0 },
    products: { count: 0 },
    flashSales: { count: 0 }
  };

  static async safeFetch(url: string, options: RequestInit = {}) {
    try {
      const sessionToken = localStorage.getItem('session_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options.headers as Record<string, string>,
      };
      
      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`;
      }
      
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        // API failed with status ${response.status}
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      // API error silently handled
      return null;
    }
  }

  static async getDashboardStats() {
    const data = await this.safeFetch('/api/admin?action=dashboard');
    return data?.data || this.FALLBACK_STATS;
  }

  static async getOrders(limit = 10) {
    const data = await this.safeFetch(`/api/admin?action=orders&limit=${limit}`);
    return data?.orders || data?.data || [];
  }

  static async getUsers(limit = 10) {
    const data = await this.safeFetch(`/api/admin?action=users&limit=${limit}`);
    return data?.users || data?.data || [];
  }

  // Health check for admin features
  static async isAdminApiHealthy(): Promise<boolean> {
    const healthCheck = await this.safeFetch('/api/admin?action=dashboard');
    return healthCheck !== null;
  }
}
