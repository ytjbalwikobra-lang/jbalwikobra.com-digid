import React, { useState, useEffect } from 'react';
import { GameTitle, Tier } from '../../../../types';
import { ProductService } from '../../../../services/productService';
import { useCategories } from '../../../../hooks/useCategories';
import { formatCurrency } from '../../../../utils/helpers';

interface ProductDetailsFormProps {
  formData: {
    name: string;
    description: string;
    price: number;
    originalPrice: number;
    categoryId: string;
    gameTitleId: string; // FK only
  tierId: string; // relational tier foreign key
    stock: number;
    isActive: boolean;
    isFlashSale: boolean;
  };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export const ProductDetailsForm: React.FC<ProductDetailsFormProps> = ({ formData, setFormData }) => {
  const [gameTitles, setGameTitles] = useState<GameTitle[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loadingTiers, setLoadingTiers] = useState(true);
  const { categories, loading: loadingCategories } = useCategories();

  // Ensure category preselect after categories loaded (especially when editing)
  useEffect(() => {
    if (!loadingCategories && categories.length && formData.categoryId) {
      const exists = categories.some(c => c.id === formData.categoryId);
      if (!exists) {
        // If current categoryId not found, clear it to force user to reselect (avoids invisible value)
        setFormData((prev: any) => ({ ...prev, categoryId: '' }));
      }
    }
  }, [loadingCategories, categories, formData.categoryId, setFormData]);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch game titles
      try {
        setLoadingGames(true);
        const games = await ProductService.getGameTitles();
        const activeGames = games
          .filter(g => g.isActive !== false)
          .sort((a, b) => {
            if (a.isPopular !== b.isPopular) return b.isPopular ? 1 : -1;
            return a.name.localeCompare(b.name);
          });
        setGameTitles(activeGames);
      } catch (e) {
        setGameTitles([]);
      } finally {
        setLoadingGames(false);
      }

      // Fetch tiers
      try {
        setLoadingTiers(true);
        const fetchedTiers = await ProductService.getTiers();
        const activeTiers = fetchedTiers
          .filter(t => (t as any).isActive !== false)
          .sort((a, b) => {
            const sa = (a as any).sortOrder ?? 0;
            const sb = (b as any).sortOrder ?? 0;
            return sa - sb;
          });
        setTiers(activeTiers);
      } catch (e) {
        setTiers([]);
      } finally {
        setLoadingTiers(false);
      }

  // Categories handled by hook
    };
    fetchData();
  }, []);

  const handleGameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const game = gameTitles.find(g => g.id === id);
    setFormData((prev: any) => ({
      ...prev,
      gameTitleId: id,
    }));
  };

  return (
    <div className="section-block stack-lg">
      <div className="section-title">Basic Information</div>
      <div className="section-divider" />
      <div className="form-grid-3">
        <div className="form-field">
          <label htmlFor="productName" className="form-label required">Product Name</label>
          <input
            id="productName"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, name: e.target.value }))}
            className="form-control control-h-lg"
            placeholder="Enter product name"
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="gameTitle" className="form-label required">Game Title</label>
          <select
            id="gameTitle"
            value={formData.gameTitleId || ''}
            onChange={handleGameChange}
            disabled={loadingGames}
            className="select-control control-h-lg"
            required
          >
            {loadingGames ? (
              <option value="">Loading...</option>
            ) : (
              <>
                <option value="">Select</option>
                {gameTitles.map(game => (
                  <option key={game.id} value={game.id} className="bg-gray-800 text-white">
                    {game.name} {game.isPopular ? '⭐' : ''}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="tier" className="form-label">Tier</label>
          <select
            id="tier"
            value={formData.tierId || ''}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, tierId: e.target.value || '' }))}
            disabled={loadingTiers}
            className="select-control control-h-lg"
          >
            {loadingTiers ? (
              <option value="">Loading...</option>
            ) : (
              <>
                <option value="">None</option>
                {tiers.map(tier => (
                  <option key={tier.id} value={tier.id} className="bg-gray-800 text-white">
                    {(tier as any).name || tier.id}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="category" className="form-label required">Category</label>
          <select
            id="category"
            value={formData.categoryId || ''}
            onChange={(e) => {
              const val = e.target.value;
              setFormData((prev: any) => ({ ...prev, categoryId: val || null }));
            }}
            disabled={loadingCategories}
            required
            className="select-control control-h-lg"
          >
            {loadingCategories ? (
              <option value="">Loading...</option>
            ) : (
              <>
                <option value="">Select</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id} className="bg-gray-800 text-white">
                    {cat.name}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>
      </div>
      <div className="form-field">
        <label htmlFor="description" className="form-label required">Product Description</label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData((prev: any) => ({ ...prev, description: e.target.value }))}
          className="form-control no-resize"
          placeholder="Enter detailed product description"
          required
        />
      </div>
      <div className="section-divider" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="form-field">
          <label htmlFor="price" className="form-label required">Price</label>
          <input
            id="price"
            type="text"
            inputMode="numeric"
            value={formData.price ? formatCurrency(formData.price) : ''}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^0-9]/g, '');
              const num = raw ? parseInt(raw, 10) : 0;
              setFormData((prev: any) => ({ ...prev, price: num }));
            }}
            className="form-control control-h-lg"
            placeholder="Rp 1.000.000"
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="originalPrice" className="form-label">Original Price</label>
          <input
            id="originalPrice"
            type="text"
            inputMode="numeric"
            value={formData.originalPrice ? formatCurrency(formData.originalPrice) : ''}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^0-9]/g, '');
              const num = raw ? parseInt(raw, 10) : 0;
              setFormData((prev: any) => ({ ...prev, originalPrice: num }));
            }}
            className="form-control control-h-lg"
            placeholder="Rp 1.000.000"
          />
        </div>
  {/* accountLevel removed */}
      </div>
    </div>
  );
};
