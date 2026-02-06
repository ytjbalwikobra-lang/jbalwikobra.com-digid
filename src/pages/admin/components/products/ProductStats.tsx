import React from 'react';
import { PNCard } from '../../../../components/ui/CyberDesignSystem';
import { Product } from '../../../../types';
import { formatCurrency } from '../../../../utils/helpers';

interface ProductStatsProps {
  products: Product[];
  loading: boolean;
}

export const ProductStats: React.FC<ProductStatsProps> = ({ products, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-cluster-md">
        {[...Array(4)].map((_, i) => (
          <PNCard key={i} className="p-stack-md bg-surface-glass-light border border-surface-tint-light">
            <div className="animate-pulse">
              <div className="h-4 bg-surface-tint-light rounded mb-2"></div>
              <div className="h-8 bg-surface-tint-light rounded"></div>
            </div>
          </PNCard>
        ))}
      </div>
    );
  }

  const activeProducts = products.filter(p => (p as any).isActive !== false && !(p as any).archivedAt);
  const archivedProducts = products.filter(p => (p as any).isActive === false || (p as any).archivedAt);
  const totalValue = products.reduce((sum, p) => sum + (p.price || 0), 0);
  const averagePrice = products.length > 0 ? totalValue / products.length : 0;

  const stats = [
    {
      label: 'Total Produk',
      value: products.length.toString(),
      color: 'text-[var(--admin-info)]',
      bgColor: 'bg-[var(--admin-info)]/20',
    },
    {
      label: 'Produk Aktif',
      value: activeProducts.length.toString(),
      color: 'text-[var(--admin-success)]',
      bgColor: 'bg-[var(--admin-success)]/20',
    },
    {
      label: 'Produk Diarsipkan',
      value: archivedProducts.length.toString(),
      color: 'text-[var(--admin-warning)]',
      bgColor: 'bg-[var(--admin-warning)]/20',
    },
    {
      label: 'Rata-rata Harga',
      value: formatCurrency(Math.round(averagePrice)),
      color: 'text-[var(--admin-purple)]',
      bgColor: 'bg-[var(--admin-purple)]/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-cluster-md">
      {stats.map((stat, index) => (
        <PNCard key={index} className="p-stack-md bg-surface-glass-light border border-surface-tint-light">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ds-text-secondary mb-1">
                {stat.label}
              </p>
              <p className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-full ${stat.bgColor} flex items-center justify-center`}>
              <div className={`w-6 h-6 rounded-full ${stat.color.replace('text-', 'bg-')}`}></div>
            </div>
          </div>
        </PNCard>
      ))}
    </div>
  );
};
