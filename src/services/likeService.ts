/**
 * LikeService - Handle product likes with IP-based limitation
 * Allows guests to like products but limits to one like per IP address
 */

import { supabase } from './supabase';

export interface ProductLike {
  id: number;
  product_id: string;
  ip_address: string;
  user_id?: string;
  created_at: string;
}

export interface LikeStats {
  total_likes: number;
  user_has_liked: boolean;
  ip_has_liked: boolean;
}

class LikeService {
  // Get user's IP address (fallback method for development)
  private async getUserIP(): Promise<string> {
    try {
      // In production, you might want to use a more reliable IP detection service
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.warn('Could not fetch IP address:', error);
      // Fallback to a session-based identifier for development
      let sessionIP = localStorage.getItem('session_ip');
      if (!sessionIP) {
        sessionIP = 'dev_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('session_ip', sessionIP);
      }
      return sessionIP;
    }
  }

  // Get like statistics for a product
  async getLikeStats(productId: string, userId?: string): Promise<LikeStats> {
    try {
      const ip = await this.getUserIP();

      // Get total likes count
      const { count: totalLikes, error: countError } = await supabase
        .from('product_likes')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', productId);

      if (countError) {
        console.error('Error getting like count:', countError);
        return { total_likes: 0, user_has_liked: false, ip_has_liked: false };
      }

      // Check if current user/IP has liked
      const { data: userLike, error: userError } = await supabase
        .from('product_likes')
        .select('id, product_id, user_id, ip_address')
        .eq('product_id', productId)
        .or(userId ? `user_id.eq.${userId},ip_address.eq.${ip}` : `ip_address.eq.${ip}`)
        .maybeSingle();

      if (userError && userError.code !== 'PGRST116') {
        console.error('Error checking user like:', userError);
      }

      return {
        total_likes: totalLikes || 0,
        user_has_liked: !!userLike && !!userLike.user_id,
        ip_has_liked: !!userLike
      };
    } catch (error) {
      console.error('Error getting like stats:', error);
      return { total_likes: 0, user_has_liked: false, ip_has_liked: false };
    }
  }

  // Toggle like for a product
  async toggleLike(productId: string, userId?: string): Promise<LikeStats> {
    try {
      const ip = await this.getUserIP();

      // Check if already liked
      const { data: existingLike, error: checkError } = await supabase
        .from('product_likes')
        .select('id, product_id, user_id, ip_address')
        .eq('product_id', productId)
        .or(userId ? `user_id.eq.${userId},ip_address.eq.${ip}` : `ip_address.eq.${ip}`)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing like:', checkError);
        throw checkError;
      }

      if (existingLike) {
        // Unlike - remove the like
        const { error: deleteError } = await supabase
          .from('product_likes')
          .delete()
          .eq('id', existingLike.id);

        if (deleteError) {
          console.error('Error removing like:', deleteError);
          throw deleteError;
        }
      } else {
        // Like - add the like
        const { error: insertError } = await supabase
          .from('product_likes')
          .insert({
            product_id: productId,
            ip_address: ip,
            user_id: userId
          });

        if (insertError) {
          console.error('Error adding like:', insertError);
          throw insertError;
        }
      }

      // Return updated stats
      return await this.getLikeStats(productId, userId);
    } catch (error) {
      console.error('Error toggling like:', error);
      throw error;
    }
  }

  // Get likes for multiple products (for product lists)
  async getBulkLikeStats(productIds: string[]): Promise<Record<string, number>> {
    try {
      const { data, error } = await supabase
        .from('product_likes')
        .select('product_id')
        .in('product_id', productIds);

      if (error) {
        console.error('Error getting bulk like stats:', error);
        return {};
      }

      // Count likes per product
      const likeCounts: Record<string, number> = {};
      productIds.forEach(id => {
        likeCounts[id] = 0;
      });

      data?.forEach(like => {
        likeCounts[like.product_id] = (likeCounts[like.product_id] || 0) + 1;
      });

      return likeCounts;
    } catch (error) {
      console.error('Error getting bulk like stats:', error);
      return {};
    }
  }
}

export const likeService = new LikeService();
export default likeService;
