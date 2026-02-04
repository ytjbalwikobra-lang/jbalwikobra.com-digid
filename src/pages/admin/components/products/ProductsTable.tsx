import React, { useState } from 'react';
import { Product } from '../../../../services/adminService';
import { Eye, Pencil, Trash2, Check, X } from 'lucide-react';
import { AdminDSTable, DSTableColumn, DSTableAction } from '../ui/AdminDSTable';
import { formatCurrency } from '../../../../utils/helpers';

interface ProductsTableProps {
  products: Product[];
  onView: (p: Product) => void;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
  loading?: boolean;
  onQuickUpdate?: (id: string, fields: Partial<Pick<Product,'price'|'stock'|'is_active'>>) => Promise<void> | void;
  // Optional pagination, if provided we'll render the DS footer
  currentPage?: number;
  pageSize?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
}

export const ProductsTable: React.FC<ProductsTableProps> = ({ products, onView, onEdit, onDelete, loading, onQuickUpdate, currentPage, pageSize, totalItems, onPageChange }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{price?: string; stock?: string}>({});
  const startEdit = (p: Product) => { setEditingId(p.id); setDraft({ price: String(p.price||0), stock: String(p.stock||0) }); };
  const cancelEdit = () => { setEditingId(null); setDraft({}); };
  const saveEdit = async (id: string) => {
    if (!onQuickUpdate) { cancelEdit(); return; }
    const priceNum = Number(draft.price?.replace(/[^0-9.]/g,'')) || 0;
    const stockNum = parseInt(draft.stock||'0',10) || 0;
    await onQuickUpdate(id, { price: priceNum, stock: stockNum });
    cancelEdit();
  };
  const columns: DSTableColumn<Product>[] = [
    {
      key: 'name',
      header: 'Nama',
      render: (_, p) => (
        <div className="max-w-[240px]">
          <div className="truncate text-ds-text font-medium">{p.name}</div>
          <div className="text-[11px] text-ds-text-tertiary truncate">{(p as any).description || '—'}</div>
        </div>
      ),
      width: '24%'
    },
    {
      key: 'category',
      header: 'Kategori',
      render: (_, p) => (
        <span className="inline-flex px-2 py-0.5 rounded-full bg-[var(--cyber-pink-primary)]/10 text-[var(--cyber-pink-secondary)] text-[11px] font-medium capitalize">
          {(p as any).categoryData?.name || (p as any).category || '—'}
        </span>
      ),
      width: '14%'
    },
    {
      key: 'tiers',
      header: 'Tier',
      render: (_, p) => (
        (p as any).tiers ? (
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium shadow-sm border border-[var(--cyber-border)]"
            style={{
              background: (p as any).tiers.background_gradient || 'linear-gradient(135deg, #1e1e1e, #2a2a2a)',
              color: '#fff'
            }}
            title={(p as any).tiers.name}
          >
            {(p as any).tiers.name || (p as any).tiers.slug}
          </span>
        ) : <span className="text-[11px] text-ds-text-tertiary">—</span>
      ),
      width: '12%'
    },
    {
      key: 'price',
      header: 'Harga',
      render: (_, p) => (
        editingId === p.id ? (
          <input
            autoFocus
            value={draft.price||''}
            onChange={e=>setDraft(d=>({...d,price:e.target.value}))}
            onKeyDown={(e)=>{ if(e.key==='Enter') saveEdit(p.id); if(e.key==='Escape') cancelEdit(); }}
            className="form-control control-h-lg w-28 text-xs px-2"
          />
        ) : (
          <button onClick={()=>startEdit(p)} className="text-left text-ds-pink hover:opacity-80 focus:outline-none">
            {formatCurrency(Number(p.price||0))}
          </button>
        )
      ),
      width: '12%'
    },
    {
      key: 'stock',
      header: 'Stok',
      render: (_, p) => (
        editingId === p.id ? (
          <input
            value={draft.stock||''}
            onChange={e=>setDraft(d=>({...d,stock:e.target.value.replace(/[^0-9]/g,'')}))}
            onKeyDown={(e)=>{ if(e.key==='Enter') saveEdit(p.id); if(e.key==='Escape') cancelEdit(); }}
            className="form-control control-h-lg w-20 text-xs px-2"
          />
        ) : (
          <button onClick={()=>startEdit(p)} className={`text-left ${p.stock && p.stock>0 ? 'text-emerald-400' : 'text-rose-400'} hover:opacity-80`}>{p.stock ?? 0}</button>
        )
      ),
      width: '10%'
    },
    {
      key: 'is_active',
      header: 'Aktif',
      render: (_, p) => (
        <button
          onClick={()=> onQuickUpdate && onQuickUpdate(p.id,{ is_active: !p.is_active })}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors border ${p.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-600/30 hover:bg-emerald-500/20' : 'bg-surface-tint-light text-ds-text-secondary border-surface-tint-light hover:bg-surface-tint-light/80'}`}
          aria-pressed={p.is_active}
          aria-label={p.is_active ? 'Deactivate product' : 'Activate product'}
        >
          {p.is_active ? <Check className="w-3 h-3"/> : <X className="w-3 h-3"/>}
          {p.is_active ? 'Ya' : 'Tidak'}
        </button>
      ),
      width: '10%'
    },
    {
      key: 'created_at',
      header: 'Dibuat',
      render: (v) => v ? new Date(v as any).toLocaleDateString() : '—',
      width: '12%'
    },
  ];

  const actions: DSTableAction<Product>[] = [
    { key: 'view', label: 'View', icon: Eye, onClick: onView, variant: 'secondary' },
    { key: 'edit', label: 'Edit', icon: Pencil, onClick: onEdit, variant: 'secondary' },
    { key: 'delete', label: 'Delete', icon: Trash2, onClick: onDelete, variant: 'danger' },
  ];

  return (
    <AdminDSTable<Product>
      columns={columns}
      data={products}
      loading={!!loading}
      actions={actions}
      currentPage={currentPage}
      pageSize={pageSize}
      totalItems={totalItems}
      onPageChange={onPageChange}
      rowKey={(p)=>p.id}
      rowClassName={(p)=> editingId===p.id ? 'bg-surface-tint-light/60' : ''}
    />
  );
};

export default ProductsTable;