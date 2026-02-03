import { useState, useEffect } from 'react';
import { ProductService } from '../services/productService';
import { Product } from '../types';

interface UseProductsByCategoryOptions {
  categoryId?: string;
  limit?: number;
}

interface UseProductsByCategoryReturn {
  products: Product[];
  loading: boolean;
  error: string | null;
}

/**
 * Simple hook to fetch products filtered by category ID
 * Used for SEO category landing pages
 */
export function useProductsByCategory({
  categoryId,
  limit = 20
}: UseProductsByCategoryOptions): UseProductsByCategoryReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProducts() {
      if (!categoryId) {
        setProducts([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch all products and filter by category
        const allProducts = await ProductService.getAllProducts();
        
        const filtered = allProducts
          .filter(p => p.categoryId === categoryId && p.stock > 0 && p.isActive !== false)
          .slice(0, limit);
        
        setProducts(filtered);
      } catch (err: any) {
        console.error('[useProductsByCategory] Error:', err);
        setError(err.message || 'Failed to fetch products');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [categoryId, limit]);

  return { products, loading, error };
}

export default useProductsByCategory;
