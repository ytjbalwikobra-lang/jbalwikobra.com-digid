import React, { useEffect, useMemo, useState } from 'react';
import { GameTitle } from '../../types';
import { ProductService } from '../../services/productService';
import { supabase } from '../../services/supabase';
import { useToast } from '../../components/Toast';
import { gameLogoStorage } from '../../services/storageService';
import { Plus, Pencil, Trash2, RefreshCw, Upload, X, Gamepad2, Eye, Edit, Image as ImageIcon } from 'lucide-react';
import { 
  AdminPageHeaderV2, 
  AdminStatCard, 
  AdminFilters, 
  AdminDataTable, 
  StatusBadge 
} from './components/ui';
import type { AdminFiltersConfig, TableColumn, TableAction } from './components/ui';

type FormState = {
  id?: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  logo_url?: string;
  logo_file?: File | null;
  logo_preview?: string;
  is_active: boolean;
  sort_order?: number;
};

const emptyForm: FormState = {
  name: '',
  slug: '',
  description: '',
  icon: 'Zap',
  color: '#f472b6',
  logo_url: '',
  logo_file: null,
  logo_preview: '',
  is_active: true,
  sort_order: 0,
};

const AdminGameTitles: React.FC = () => {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<GameTitle[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Filter state for our AdminFilters component
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    search: '',
    status: 'all',
    sortBy: 'sort_order',
    sortOrder: 'asc'
  });

  // Filter configuration for our AdminFilters component
  const filtersConfig: AdminFiltersConfig = {
    searchPlaceholder: 'Search game titles by name or description...',
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
      { value: 'name', label: 'Name' },
      { value: 'created_at', label: 'Date Created' },
      { value: 'updated_at', label: 'Last Updated' }
    ]
  };

  // Filter handling
  const handleFilterChange = (filters: Record<string, any>) => {
    setFilterValues(filters);
  };

  // Apply filters to game titles
  const filteredItems = items.filter(item => {
    // Search filter
    if (filterValues.search) {
      const searchTerm = filterValues.search.toLowerCase();
      if (
        !item.name?.toLowerCase().includes(searchTerm) &&
        !item.description?.toLowerCase().includes(searchTerm)
      ) {
        return false;
      }
    }

    // Status filter
    if (filterValues.status !== 'all') {
      if (filterValues.status === 'active' && !item.isActive) return false;
      if (filterValues.status === 'inactive' && item.isActive) return false;
    }

    return true;
  }).sort((a, b) => {
    const sortBy = filterValues.sortBy;
    const order = filterValues.sortOrder === 'desc' ? -1 : 1;
    
    if (sortBy === 'sort_order') {
      return ((a.sortOrder || 0) - (b.sortOrder || 0)) * order;
    }
    
    if (sortBy === 'created_at' || sortBy === 'updated_at') {
      const aDate = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const bDate = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return (aDate - bDate) * order;
    }
    
    const aValue = a[sortBy as keyof GameTitle] || '';
    const bValue = b[sortBy as keyof GameTitle] || '';
    return String(aValue).localeCompare(String(bValue)) * order;
  });

  // Statistics calculation
  const stats = {
    total: items.length,
    active: items.filter(item => item.isActive).length,
    inactive: items.filter(item => !item.isActive).length,
    withLogos: items.filter(item => item.logoUrl).length
  };

  // Table columns configuration
  const columns: TableColumn<GameTitle>[] = [
    {
      key: 'logo',
      label: 'Logo',
      render: (item) => (
        <div className="flex items-center justify-center w-10 h-10 bg-gray-500/20 rounded-lg overflow-hidden">
          {item.logoUrl ? (
            <img src={item.logoUrl} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <ImageIcon size={20} className="text-gray-400" />
          )}
        </div>
      )
    },
    {
      key: 'name',
      label: 'Game Title',
      render: (item) => (
        <div>
          <div className="font-medium text-ds-text">{item.name}</div>
          <div className="text-sm text-ds-text-secondary">{item.slug}</div>
        </div>
      )
    },
    {
      key: 'description',
      label: 'Description',
      render: (item) => (
        <div className="max-w-xs truncate text-ds-text-secondary">
          {item.description || 'No description'}
        </div>
      )
    },
    {
      key: 'sortOrder',
      label: 'Sort Order',
      render: (item) => item.sortOrder || 0
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (item) => (
        <StatusBadge
          status={item.isActive ? 'active' : 'inactive'}
        />
      )
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (item) => item.createdAt ? new Date(item.createdAt).toLocaleDateString('id-ID') : 'N/A'
    }
  ];

  // Table actions configuration
  const actions: TableAction<GameTitle>[] = [
    {
      label: 'View',
      icon: <Eye size={16} />,
      onClick: (item) => {
        push(`Viewing game title: ${item.name}`, 'info');
      }
    },
    {
      label: 'Edit',
      icon: <Edit size={16} />,
      onClick: (item) => {
        startEdit(item);
      }
    },
    {
      label: 'Delete',
      icon: <Trash2 size={16} />,
      onClick: (item) => {
        if (confirm(`Are you sure you want to delete game title: ${item.name}?`)) {
          remove(item.id!);
        }
      },
      variant: 'danger'
    }
  ];

  const load = async () => {
    setLoading(true);
    try {
      // Load all game titles (including inactive) for admin panel
      if (!supabase) {
        const list = await ProductService.getGameTitles();
        setItems(list);
        return;
      }

      const { data, error } = await supabase
        .from('game_titles')
        .select('id, name, slug, icon, sort_order, is_active, created_at, updated_at')
        .order('sort_order', { ascending: true });

      if (error) throw error;

      const list = data?.map(gameTitle => {
        // Get logo URL - prefer new logo_path with public URL, fallback to legacy logo_url
        let logoUrl = gameTitle.logo_url; // Legacy URL fallback
        
        if (gameTitle.logo_path) {
          // Convert storage path to public URL
          try {
            const { data: urlData } = (supabase as any).storage
              .from('game-logos')
              .getPublicUrl(gameTitle.logo_path);
            logoUrl = urlData.publicUrl;
          } catch (error) {
            console.warn('Failed to get public URL for logo_path:', gameTitle.logo_path);
            // Keep legacy logo_url as fallback
          }
        }

        return {
          ...gameTitle,
          isPopular: gameTitle.is_popular,
          isActive: gameTitle.is_active,
          sortOrder: gameTitle.sort_order,
          logoUrl,
          createdAt: gameTitle.created_at,
          updatedAt: gameTitle.updated_at
        };
      }) || [];

      setItems(list);
    } catch (e: any) {
      push(`Gagal memuat Game Titles: ${e?.message || e}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // File upload functions
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Validate file before creating preview
      if (file.size > 5 * 1024 * 1024) {
        push('Ukuran file terlalu besar. Maksimal 5MB', 'error');
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        push('Tipe file tidak didukung. Gunakan JPEG, PNG, GIF, atau WebP', 'error');
        return;
      }

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setForm(prev => ({
        ...prev,
        logo_file: file,
        logo_preview: previewUrl,
        logo_url: '' // Clear existing URL when file is selected
      }));
    } catch (error: any) {
      push(`Error selecting file: ${error.message}`, 'error');
    }
  };

  const clearFile = () => {
    if (form.logo_preview) {
      URL.revokeObjectURL(form.logo_preview);
    }
    setForm(prev => ({
      ...prev,
      logo_file: null,
      logo_preview: ''
    }));
  };

  const cancelForm = () => { 
    if (form.logo_preview) {
      URL.revokeObjectURL(form.logo_preview);
    }
    setShowForm(false); 
    setForm(emptyForm); 
  };

  const startCreate = () => { setForm(emptyForm); setShowForm(true); };
  
  const startEdit = (gt: GameTitle) => {
    setForm({
      id: gt.id,
      name: gt.name,
      slug: gt.slug,
      description: gt.description || '',
      icon: gt.icon || 'Zap',
      color: gt.color || '#f472b6',
      logo_url: gt.logoUrl || '',
      logo_file: null,
      logo_preview: '',
      is_active: gt.isActive !== false,
      sort_order: gt.sortOrder || 0,
    });
    setShowForm(true);
  };

  const toDbPayload = (f: FormState) => ({
    name: f.name.trim(),
    slug: f.slug.trim().toLowerCase().replace(/\s+/g,'-'),
    description: f.description?.trim() || null,
    icon: f.icon || null,
    color: f.color || null,
    logo_url: f.logo_url || null,
    is_active: !!f.is_active,
    sort_order: Number(f.sort_order || 0),
  });

  const save = async () => {
    if (!supabase) { push('Supabase belum dikonfigurasi.', 'error'); return; }
    if (!form.name || !form.slug) { push('Nama dan slug wajib diisi', 'error'); return; }
    setSaving(true);
    setUploading(form.logo_file !== null);
    
    try {
      let logoPath = form.logo_url || null; // Keep existing URL if no new file

      // Handle file upload if a new file is selected
      if (form.logo_file) {
        try {
          logoPath = await gameLogoStorage.uploadGameLogo(form.logo_file, form.slug);
          
          // If editing and there was an old logo, delete it
          if (form.id && form.logo_url) {
            // Extract path from URL or use logo_path if available from database
            // This would need to be implemented based on your database schema
          }
        } catch (uploadError: any) {
          throw new Error(`Failed to upload logo: ${uploadError.message}`);
        }
      }

      const payload = {
        ...toDbPayload(form),
        logo_path: logoPath // Use logo_path for new storage system
      };

      if (!form.id) {
        const { error } = await (supabase as any).from('game_titles').insert(payload);
        if (error) throw error;
        push('Game title ditambahkan dengan logo berhasil', 'success');
      } else {
        const { error } = await (supabase as any).from('game_titles').update(payload).eq('id', form.id);
        if (error) throw error;
        push('Game title diperbarui dengan logo berhasil', 'success');
      }
      
      // Clean up preview URL
      if (form.logo_preview) {
        URL.revokeObjectURL(form.logo_preview);
      }
      
      setShowForm(false);
      setForm(emptyForm);
      await load();
    } catch (e: any) {
      push(`Gagal menyimpan: ${e?.message || e}`, 'error');
    } finally { 
      setSaving(false); 
      setUploading(false);
    }
  };

  const remove = async (id: string) => {
    if (!supabase) return;
    if (!confirm('Hapus game title ini?')) return;
    try {
      const { error } = await (supabase as any).from('game_titles').delete().eq('id', id);
      if (error) throw error;
      push('Game title dihapus', 'success');
      await load();
    } catch (e: any) {
      push(`Gagal menghapus: ${e?.message || e}`, 'error');
    }
  };

  const handleRefresh = () => {
    load();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <AdminPageHeaderV2
        title="Game Titles"
        subtitle="Kelola daftar game yang tampil di katalog, jual akun, dan filter"
        icon={Gamepad2}
        actions={[
          {
            key: 'refresh',
            label: 'Refresh',
            onClick: handleRefresh,
            variant: 'secondary',
            icon: RefreshCw,
            loading: loading
          },
          {
            key: 'add',
            label: 'Add Game Title',
            onClick: () => setShowForm(true),
            variant: 'primary',
            icon: Plus
          }
        ]}
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard
          title="Total Game Titles"
          value={stats.total}
          icon={Gamepad2}
          iconColor="text-blue-400"
          iconBgColor="bg-blue-500/20"
          loading={loading}
        />
        <AdminStatCard
          title="Active Games"
          value={stats.active}
          icon={RefreshCw}
          iconColor="text-green-400"
          iconBgColor="bg-green-500/20"
          loading={loading}
        />
        <AdminStatCard
          title="Inactive Games"
          value={stats.inactive}
          icon={X}
          iconColor="text-red-400"
          iconBgColor="bg-red-500/20"
          loading={loading}
        />
        <AdminStatCard
          title="With Logos"
          value={stats.withLogos}
          icon={ImageIcon}
          iconColor="text-purple-400"
          iconBgColor="bg-purple-500/20"
          loading={loading}
        />
      </div>

      {/* Filters */}
      <AdminFilters
        config={filtersConfig}
        values={filterValues}
        onFiltersChange={handleFilterChange}
        totalItems={items.length}
        filteredItems={filteredItems.length}
  loading={loading}
  defaultCollapsed={true}
      />

      {/* Game Titles Table */}
      <AdminDataTable
        data={filteredItems}
        columns={columns}
        actions={actions}
        loading={loading}
        emptyMessage="No game titles found"
        showRowNumbers={true}
      />

      {/* Game Title Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-surface-glass-light border border-surface-tint-light rounded-lg p-6">
            <h2 className="text-lg font-semibold text-ds-text mb-4">{form.id ? 'Edit' : 'Tambah'} Game Title</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-ds-text-secondary mb-1">Nama Game</label>
                <input 
                  value={form.name} 
                  onChange={e=>setForm({...form, name: e.target.value})} 
                  className="w-full bg-surface-dark border border-surface-tint-light rounded px-3 py-2 text-ds-text" 
                  placeholder="Mobile Legends"
                />
              </div>
              <div>
                <label className="block text-sm text-ds-text-secondary mb-1">Slug</label>
                <input 
                  value={form.slug} 
                  onChange={e=>setForm({...form, slug: e.target.value})} 
                  className="w-full bg-surface-dark border border-surface-tint-light rounded px-3 py-2 text-ds-text" 
                  placeholder="mobile-legends"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm text-ds-text-secondary mb-1">Deskripsi</label>
                <input 
                  value={form.description} 
                  onChange={e=>setForm({...form, description: e.target.value})} 
                  className="w-full bg-surface-dark border border-surface-tint-light rounded px-3 py-2 text-ds-text" 
                  placeholder="Deskripsi singkat game"
                />
              </div>
              <div>
                <label className="block text-sm text-ds-text-secondary mb-1">Icon (lucide)</label>
                <input 
                  value={form.icon} 
                  onChange={e=>setForm({...form, icon: e.target.value})} 
                  className="w-full bg-surface-dark border border-surface-tint-light rounded px-3 py-2 text-ds-text" 
                  placeholder="Zap"
                />
              </div>
              <div>
                <label className="block text-sm text-ds-text-secondary mb-1">Warna</label>
                <input 
                  type="color"
                  value={form.color} 
                  onChange={e=>setForm({...form, color: e.target.value})} 
                  className="w-full bg-surface-dark border border-surface-tint-light rounded px-3 py-2 text-ds-text"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm text-ds-text-secondary mb-1">Logo URL</label>
                <input 
                  value={form.logo_url || ''} 
                  onChange={e=>setForm({...form, logo_url: e.target.value})} 
                  className="w-full bg-surface-dark border border-surface-tint-light rounded px-3 py-2 text-ds-text" 
                  placeholder="https://example.com/logo.png"
                />
                {form.logo_preview && <img src={form.logo_preview} alt="Preview" className="w-16 h-16 mt-2 rounded"/>}
              </div>
              <div>
                <label className="block text-sm text-ds-text-secondary mb-1">Sort Order</label>
                <input 
                  type="number" 
                  value={form.sort_order || 0} 
                  onChange={e=>setForm({...form, sort_order: Number(e.target.value)})} 
                  className="w-full bg-surface-dark border border-surface-tint-light rounded px-3 py-2 text-ds-text"
                />
              </div>
              <div>
                <label className="block text-sm text-ds-text-secondary mb-1">Status</label>
                <select 
                  value={form.is_active ? '1' : '0'} 
                  onChange={e=>setForm({...form, is_active: e.target.value==='1'})} 
                  className="w-full bg-surface-dark border border-surface-tint-light rounded px-3 py-2 text-ds-text"
                >
                  <option value="1">Aktif</option>
                  <option value="0">Nonaktif</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button 
                onClick={cancelForm} 
                className="px-4 py-2 rounded-lg border border-surface-tint-light text-ds-text hover:bg-surface-dark"
              >
                Batal
              </button>
              <button 
                onClick={save} 
                disabled={saving || uploading} 
                className="px-4 py-2 rounded-lg bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-60 flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <Upload size={16} className="animate-pulse" />
                    Mengupload logo...
                  </>
                ) : saving ? (
                  'Menyimpan...'
                ) : (
                  'Simpan'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminGameTitles;
