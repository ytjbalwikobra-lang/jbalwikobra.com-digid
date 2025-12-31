import React, { useEffect, useState } from 'react';
import { Banner } from '../../types';
import { BannerService } from '../../services/bannerService';
import { Plus, Trash2, Save, Edit3, Image as ImageIcon, Link as LinkIcon, Loader2, Eye, Edit, Globe } from 'lucide-react';
import { 
  AdminPageHeaderV2, 
  AdminStatCard, 
  AdminFilters, 
  AdminDataTable, 
  StatusBadge 
} from './components/ui';
import type { AdminFiltersConfig, TableColumn, TableAction } from './components/ui';

const AdminBanners: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [form, setForm] = useState<{ title: string; subtitle?: string; linkUrl?: string; ctaText?: string; sortOrder: number; isActive: boolean; file: File | null }>(
    { title: '', subtitle: '', linkUrl: '', ctaText: '', sortOrder: 1, isActive: true, file: null }
  );
  const [previewUrl, setPreviewUrl] = useState<string>('');

  // Filter state for our AdminFilters component
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    search: '',
    status: 'all',
    sortBy: 'sort_order',
    sortOrder: 'asc'
  });

  // Filter configuration for our AdminFilters component
  const filtersConfig: AdminFiltersConfig = {
    searchPlaceholder: 'Search banners by title...',
    filters: [
      {
        key: 'status',
        label: 'Status',
        options: [
          { value: 'all', label: 'All Status' },
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' }
        ]
      }
    ],
    sortOptions: [
      { value: 'sort_order', label: 'Sort Order' },
      { value: 'title', label: 'Title' },
      { value: 'created_at', label: 'Created Date' }
    ]
  };

  // Filter handling
  const handleFilterChange = (filters: Record<string, any>) => {
    setFilterValues(filters);
  };

  // Apply filters to banners
  const filteredBanners = banners.filter(banner => {
    // Search filter
    if (filterValues.search) {
      const searchTerm = filterValues.search.toLowerCase();
      if (!banner.title.toLowerCase().includes(searchTerm) &&
          !banner.subtitle?.toLowerCase().includes(searchTerm)) {
        return false;
      }
    }

    // Status filter
    if (filterValues.status !== 'all') {
      if (filterValues.status === 'active' && !banner.is_active) return false;
      if (filterValues.status === 'inactive' && banner.is_active) return false;
    }

    return true;
  }).sort((a, b) => {
    const sortBy = filterValues.sortBy;
    const order = filterValues.sortOrder === 'desc' ? -1 : 1;
    
    if (sortBy === 'sort_order') {
      return (a.sort_order - b.sort_order) * order;
    }
    
    if (sortBy === 'title') {
      return a.title.localeCompare(b.title) * order;
    }
    
    if (sortBy === 'created_at') {
      const aDate = new Date(a.created_at || 0).getTime();
      const bDate = new Date(b.created_at || 0).getTime();
      return (aDate - bDate) * order;
    }
    
    return 0;
  });

  // Statistics calculation
  const stats = {
    total: banners.length,
    active: banners.filter(banner => banner.is_active).length,
    inactive: banners.filter(banner => !banner.is_active).length,
    withLinks: banners.filter(banner => banner.link_url).length
  };

  // Table columns configuration
  const columns: TableColumn<Banner>[] = [
    {
      key: 'image',
      label: 'Image',
      render: (banner) => (
        <div className="w-16 h-10 bg-ds-surface-secondary rounded overflow-hidden">
          {banner.image_url ? (
            <img 
              src={banner.image_url} 
              alt={banner.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon size={16} className="text-ds-text-secondary" />
            </div>
          )}
        </div>
      )
    },
    {
      key: 'title',
      label: 'Banner Details',
      render: (banner) => (
        <div>
          <div className="font-medium text-ds-text">{banner.title}</div>
          {banner.subtitle && (
            <div className="text-sm text-ds-text-secondary">{banner.subtitle}</div>
          )}
          {banner.cta_text && (
            <div className="text-xs text-ds-primary mt-1">{banner.cta_text}</div>
          )}
        </div>
      )
    },
    {
      key: 'link',
      label: 'Link',
      render: (banner) => banner.link_url ? (
        <div className="flex items-center gap-2">
          <Globe size={14} className="text-ds-text-secondary" />
          <span className="text-sm text-ds-text truncate max-w-[200px]">
            {banner.link_url}
          </span>
        </div>
      ) : (
        <span className="text-ds-text-secondary">-</span>
      )
    },
    {
      key: 'sort_order',
      label: 'Sort Order',
      render: (banner) => (
        <span className="text-ds-text">{banner.sort_order}</span>
      )
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (banner) => (
        <StatusBadge
          status={banner.is_active ? 'active' : 'inactive'}
        />
      )
    }
  ];

  // Table actions configuration
  const actions: TableAction<Banner>[] = [
    {
      label: 'View',
      icon: <Eye size={16} />,
      onClick: (banner) => {
        if (banner.link_url) {
          window.open(banner.link_url, '_blank');
        }
      }
    },
    {
      label: 'Edit',
      icon: <Edit size={16} />,
      onClick: (banner) => {
        startEdit(banner);
      }
    },
    {
      label: 'Delete',
      icon: <Trash2 size={16} />,
      onClick: (banner) => {
        remove(banner);
      },
      variant: 'danger'
    }
  ];

  useEffect(() => { (async () => { setLoading(true); setBanners(await BannerService.list()); setLoading(false); })(); }, []);

  const resetForm = () => { setForm({ title: '', subtitle: '', linkUrl: '', ctaText: '', sortOrder: 1, isActive: true, file: null }); setPreviewUrl(''); };

  const startCreate = () => { setEditing(null); resetForm(); };

  const startEdit = (b: Banner) => {
    setEditing(b);
    setForm({ 
      title: b.title, 
      subtitle: b.subtitle || '', 
      linkUrl: b.link_url || '', 
      ctaText: b.cta_text || '', 
      sortOrder: b.sort_order, 
      isActive: b.is_active, 
      file: null 
    });
    setPreviewUrl(b.image_url || '');
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setForm(prev => ({ ...prev, file: f }));
    if (f) {
      const url = URL.createObjectURL(f);
      setPreviewUrl(url);
    }
  };

  const save = async () => {
    if (!form.title || !form.file && !editing) return alert('Judul dan Gambar wajib diisi');
    if (editing) {
  const updated = await BannerService.update(editing.id, { ...editing, ...form });
      if (updated) {
        setBanners(prev => prev.map(b => b.id === updated.id ? updated : b));
        setEditing(null); resetForm();
      }
    } else {
      const created = await BannerService.create({
        title: form.title,
        subtitle: form.subtitle,
        image_url: '',
        link_url: form.linkUrl,
        cta_text: form.ctaText,
        sort_order: form.sortOrder,
        is_active: form.isActive,
      });
      if (created) {
        setBanners(prev => [...prev, created].sort((a,b)=>a.sort_order-b.sort_order));
        resetForm();
      }
    }
  };

  const remove = async (b: Banner) => {
    if (!confirm('Hapus banner ini?')) return;
    const ok = await BannerService.remove(b.id, b.image_url);
    if (ok) setBanners(prev => prev.filter(x => x.id !== b.id));
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-pink-100 to-white bg-clip-text text-transparent">
            <ImageIcon className="inline-block mr-2" size={28} />
            Banners
          </h1>
          <p className="text-gray-400 mt-1">Manage website banners and promotional content</p>
        </div>
        <button
          onClick={startCreate}
          className="flex items-center space-x-2 px-4 py-2 bg-pink-500 hover:bg-pink-600 rounded-xl text-white transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          <span>Create Banner</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Total Banners</p>
              <p className="text-3xl font-bold text-white">{loading ? "..." : stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <ImageIcon className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Active</p>
              <p className="text-3xl font-bold text-green-600">{loading ? "..." : stats.active}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Eye className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Inactive</p>
              <p className="text-3xl font-bold text-gray-600">{loading ? "..." : stats.inactive}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <Edit3 className="text-gray-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      <AdminFilters
        config={filtersConfig}
        values={filterValues}
        onFiltersChange={handleFilterChange}
        totalItems={banners.length}
        filteredItems={filteredBanners.length}
  loading={loading}
  defaultCollapsed={true}
      />

      <AdminDataTable
        data={filteredBanners}
        columns={columns}
        actions={actions}
        loading={loading}
        emptyMessage="No banners found"
      />

      {(editing || !banners.length) && (
        <div className="bg-ds-surface border border-ds-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-ds-text mb-4">
            {editing ? 'Edit Banner' : 'Create Banner'}
          </h3>
          
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ds-text-secondary mb-2">
                  Title
                </label>
                <input 
                  value={form.title} 
                  onChange={e => setForm(p => ({...p, title: e.target.value}))} 
                  className="w-full bg-ds-surface border border-ds-border rounded-lg px-3 py-2 text-ds-text"
                  placeholder="Enter banner title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ds-text-secondary mb-2">
                  Subtitle
                </label>
                <input 
                  value={form.subtitle || ''} 
                  onChange={e => setForm(p => ({...p, subtitle: e.target.value}))} 
                  className="w-full bg-ds-surface border border-ds-border rounded-lg px-3 py-2 text-ds-text"
                  placeholder="Enter banner subtitle"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ds-text-secondary mb-2">
                  CTA Text (Optional)
                </label>
                <input 
                  value={form.ctaText || ''} 
                  onChange={e => setForm(p => ({...p, ctaText: e.target.value}))} 
                  className="w-full bg-ds-surface border border-ds-border rounded-lg px-3 py-2 text-ds-text"
                  placeholder="e.g., Learn More, Shop Now, Get Started"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ds-text-secondary mb-2">
                  Link URL
                </label>
                <div className="flex items-center gap-2">
                  <LinkIcon size={16} className="text-ds-text-secondary" />
                  <input 
                    value={form.linkUrl || ''} 
                    onChange={e => setForm(p => ({...p, linkUrl: e.target.value}))} 
                    className="w-full bg-ds-surface border border-ds-border rounded-lg px-3 py-2 text-ds-text"
                    placeholder="/flash-sales or https://..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-[1fr_auto] items-end gap-2">
                <div>
                  <label className="block text-sm font-medium text-ds-text-secondary mb-2">
                    Sort Order
                  </label>
                  <input 
                    type="number" 
                    value={form.sortOrder} 
                    onChange={e => setForm(p => ({...p, sortOrder: parseInt(e.target.value || '1', 10)}))} 
                    className="w-full bg-ds-surface border border-ds-border rounded-lg px-3 py-2 text-ds-text"
                  />
                </div>
                <div className="flex items-center gap-2 pb-2">
                  <input 
                    id="isActive" 
                    type="checkbox" 
                    checked={form.isActive} 
                    onChange={e => setForm(p => ({...p, isActive: e.target.checked}))}
                    className="rounded border-ds-border"
                  />
                  <label htmlFor="isActive" className="text-ds-text">
                    Active
                  </label>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-ds-text-secondary mb-2">
                  Banner Image
                </label>
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-ds-border hover:bg-ds-surface-secondary cursor-pointer transition-colors">
                    <ImageIcon size={16} /> Choose File
                    <input type="file" className="hidden" accept="image/*" onChange={onFile} />
                  </label>
                  <span className="text-sm text-ds-text-secondary">
                    {form.file?.name || (editing ? 'Keep empty to not change image' : 'No file selected')}
                  </span>
                  {previewUrl && (
                    <img 
                      src={previewUrl} 
                      alt="preview" 
                      className="h-16 w-24 object-cover rounded border border-ds-border"
                    />
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              {editing && (
                <button 
                  onClick={() => {setEditing(null); resetForm();}} 
                  className="px-4 py-2 rounded-lg border border-ds-border text-ds-text hover:bg-ds-surface-secondary transition-colors"
                >
                  Cancel
                </button>
              )}
              <button 
                onClick={save} 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ds-primary text-white hover:bg-ds-primary-hover transition-colors"
              >
                <Save size={16} /> Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBanners;
