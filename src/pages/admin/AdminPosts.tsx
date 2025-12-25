import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/TraditionalAuthContext';
import { supabase } from '../../services/supabase';
import { enhancedFeedService, type FeedPost } from '../../services/enhancedFeedService';
import { Plus, Edit, Trash2, Pin, PinOff, Eye, MessageSquare, Heart, Calendar, FileText } from 'lucide-react';
import { 
  AdminPageHeaderV2, 
  AdminStatCard, 
  AdminFilters, 
  AdminDataTable, 
  StatusBadge 
} from './components/ui';
import type { AdminFiltersConfig, TableColumn, TableAction } from './components/ui';

const AdminPosts: React.FC = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    type: 'announcement',
    title: '',
    content: '',
    rating: null as number | null,
    image_url: '',
    is_pinned: false
  });

  // Filter state for our AdminFilters component
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    search: '',
    type: 'all',
    status: 'all',
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  // Filter configuration for our AdminFilters component
  const filtersConfig: AdminFiltersConfig = {
    searchPlaceholder: 'Search posts by title or content...',
    filters: [
      {
        key: 'type',
        label: 'Post Type',
        options: [
          { value: 'all', label: 'All Types' },
          { value: 'announcement', label: 'Announcement' },
          { value: 'review', label: 'Review' },
          { value: 'update', label: 'Update' },
          { value: 'promotion', label: 'Promotion' }
        ]
      },
      {
        key: 'status',
        label: 'Status',
        options: [
          { value: 'all', label: 'All Status' },
          { value: 'pinned', label: 'Pinned' },
          { value: 'regular', label: 'Regular' }
        ]
      }
    ],
    sortOptions: [
      { value: 'created_at', label: 'Created Date' },
      { value: 'title', label: 'Title' },
      { value: 'type', label: 'Type' },
      { value: 'likes_count', label: 'Likes Count' },
      { value: 'comments_count', label: 'Comments Count' }
    ]
  };

  // Filter handling
  const handleFilterChange = (filters: Record<string, any>) => {
    setFilterValues(filters);
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID');
  };

  // Apply filters to posts
  const filteredPosts = posts.filter(post => !post.is_deleted).filter(post => {
    // Search filter
    if (filterValues.search) {
      const searchTerm = filterValues.search.toLowerCase();
      if (!post.title?.toLowerCase().includes(searchTerm) &&
          !post.content.toLowerCase().includes(searchTerm)) {
        return false;
      }
    }

    // Type filter
    if (filterValues.type !== 'all') {
      if (post.type !== filterValues.type) return false;
    }

    // Status filter
    if (filterValues.status !== 'all') {
      if (filterValues.status === 'pinned' && !post.is_pinned) return false;
      if (filterValues.status === 'regular' && post.is_pinned) return false;
    }

    return true;
  }).sort((a, b) => {
    const sortBy = filterValues.sortBy;
    const order = filterValues.sortOrder === 'desc' ? -1 : 1;
    
    if (sortBy === 'created_at') {
      const aDate = new Date(a.created_at).getTime();
      const bDate = new Date(b.created_at).getTime();
      return (aDate - bDate) * order;
    }
    
    if (sortBy === 'title') {
      const aTitle = a.title || '';
      const bTitle = b.title || '';
      return aTitle.localeCompare(bTitle) * order;
    }
    
    if (sortBy === 'type') {
      return a.type.localeCompare(b.type) * order;
    }
    
    if (sortBy === 'likes_count') {
      const aCount = a.counts?.likes || 0;
      const bCount = b.counts?.likes || 0;
      return (aCount - bCount) * order;
    }
    
    if (sortBy === 'comments_count') {
      const aCount = a.counts?.comments || 0;
      const bCount = b.counts?.comments || 0;
      return (aCount - bCount) * order;
    }
    
    return 0;
  });

  // Statistics calculation
  const activePosts = posts.filter(post => !post.is_deleted);
  const stats = {
    total: activePosts.length,
    pinned: activePosts.filter(post => post.is_pinned).length,
    withImages: activePosts.filter(post => post.image_url).length,
    totalLikes: activePosts.reduce((sum, post) => sum + (post.counts?.likes || 0), 0)
  };

  // Table columns configuration
  const columns: TableColumn<FeedPost>[] = [
    {
      key: 'content',
      label: 'Post Details',
      render: (post) => (
        <div className="flex gap-3">
          {post.image_url && (
            <div className="w-16 h-16 bg-ds-surface-secondary rounded overflow-hidden flex-shrink-0">
              <img 
                src={post.image_url} 
                alt={post.title || 'Post image'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-1 rounded-full bg-ds-primary/20 text-ds-primary">
                {post.type}
              </span>
              {post.is_pinned && (
                <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
                  <Pin size={10} />
                  Pinned
                </span>
              )}
            </div>
            {post.title && (
              <div className="font-medium text-ds-text mb-1">{post.title}</div>
            )}
            <div className="text-sm text-ds-text-secondary line-clamp-2">
              {post.content}
            </div>
            {post.rating && (
              <div className="text-xs text-yellow-400 mt-1">
                ⭐ {post.rating}/5
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'engagement',
      label: 'Engagement',
      render: (post) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <Heart size={14} className="text-red-400" />
            <span className="text-ds-text">{post.counts?.likes || 0}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MessageSquare size={14} className="text-blue-400" />
            <span className="text-ds-text">{post.counts?.comments || 0}</span>
          </div>
        </div>
      )
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (post) => (
        <div className="flex items-center gap-2 text-sm text-ds-text-secondary">
          <Calendar size={14} />
          <span>{formatDate(post.created_at)}</span>
        </div>
      )
    }
  ];

  // Table actions configuration
  const actions: TableAction<FeedPost>[] = [
    {
      label: 'View Feed',
      icon: <Eye size={16} />,
      onClick: () => {
        window.open('/feed', '_blank');
      }
    },
    {
      label: 'Pin/Unpin',
      icon: <Pin size={16} />,
      onClick: (post) => {
        togglePin(post.id, post.is_pinned || false);
      }
    },
    {
      label: 'Delete',
      icon: <Trash2 size={16} />,
      onClick: (post) => {
        handleDelete(post.id);
      },
      variant: 'danger'
    }
  ];

  const loadPosts = async () => {
    try {
      setLoading(true);
      if (!supabase) throw new Error('Supabase not configured');
      
      const { data, error } = await supabase
        .from('feed_posts')
        .select('id, content, image_url, user_id, created_at, updated_at, is_deleted, likes_count, comments_count')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      const transformedPosts = (data || []).map(post => ({
        ...post,
        authorName: 'Admin',
        counts: {
          likes: post.likes_count || 0,
          comments: post.comments_count || 0
        }
      }));
      
      setPosts(transformedPosts);
    } catch (err: any) {
      console.error('Failed to load posts:', err);
      setMessage(err.message || 'Gagal memuat posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.content.trim()) {
      setMessage('Konten post harus diisi');
      return;
    }
    
    if (!supabase || !user) {
      setMessage('Supabase atau user belum siap');
      return;
    }
    
    setCreating(true);
    setMessage(null);
    
    try {
      const { data, error } = await supabase
        .from('feed_posts')
        .insert([{
          user_id: user.id,
          type: formData.type,
          title: formData.title || null,
          content: formData.content,
          rating: formData.rating,
          image_url: formData.image_url || null,
          is_pinned: formData.is_pinned,
          likes_count: 0,
          comments_count: 0,
          is_deleted: false
        }])
        .select('id, content, image_url, user_id, created_at, updated_at, is_deleted, likes_count, comments_count')
        .single();
        
      if (error) throw error;
      
      setMessage('Post berhasil dibuat');
      setFormData({
        type: 'announcement',
        title: '',
        content: '',
        rating: null,
        image_url: '',
        is_pinned: false
      });
      setShowCreateForm(false);
      loadPosts(); // Refresh list
    } catch (err: any) {
      console.error('Failed to create post:', err);
      setMessage(err.message || 'Gagal membuat post');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!supabase) return;
    if (!confirm('Yakin ingin menghapus post ini?')) return;
    
    try {
      const { error } = await supabase
        .from('feed_posts')
        .update({ is_deleted: true })
        .eq('id', postId);
        
      if (error) throw error;
      
      setMessage('Post berhasil dihapus');
      loadPosts();
    } catch (err: any) {
      console.error('Failed to delete post:', err);
      setMessage(err.message || 'Gagal menghapus post');
    }
  };

  const togglePin = async (postId: string, currentPinned: boolean) => {
    if (!supabase) return;
    
    try {
      const { error } = await supabase
        .from('feed_posts')
        .update({ is_pinned: !currentPinned })
        .eq('id', postId);
        
      if (error) throw error;
      
  setMessage(`Post ${!currentPinned ? 'dipin' : 'pin dilepas'}`);
      loadPosts();
    } catch (err: any) {
      console.error('Failed to toggle pin:', err);
      setMessage(err.message || 'Gagal mengubah pin status');
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeaderV2
        title="Feed Posts"
        subtitle="Manage announcements, reviews, and social media posts"
        icon={FileText}
        actions={[
          {
            key: 'add',
            label: 'Create Post',
            onClick: () => setShowCreateForm(true),
            variant: 'primary',
            icon: Plus
          }
        ]}
      />

      {message && (
        <div className="bg-blue-500/10 border border-blue-500/30 text-blue-300 text-sm rounded-lg p-3">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <AdminStatCard
          title="Total Posts"
          value={stats.total}
          icon={FileText}
          iconColor="text-blue-400"
          iconBgColor="bg-blue-500/20"
        />
        <AdminStatCard
          title="Pinned"
          value={stats.pinned}
          icon={Pin}
          iconColor="text-yellow-400"
          iconBgColor="bg-yellow-500/20"
        />
        <AdminStatCard
          title="With Images"
          value={stats.withImages}
          icon={Eye}
          iconColor="text-purple-400"
          iconBgColor="bg-purple-500/20"
        />
        <AdminStatCard
          title="Total Likes"
          value={stats.totalLikes}
          icon={Heart}
          iconColor="text-red-400"
          iconBgColor="bg-red-500/20"
        />
      </div>

      <AdminFilters
        config={filtersConfig}
        values={filterValues}
        onFiltersChange={handleFilterChange}
        totalItems={posts.filter(p => !p.is_deleted).length}
        filteredItems={filteredPosts.length}
  loading={loading}
  defaultCollapsed={true}
      />

      <AdminDataTable
        data={filteredPosts}
        columns={columns}
        actions={actions}
        loading={loading}
        emptyMessage="No posts found"
      />

      {showCreateForm && (
        <div className="bg-ds-surface border border-ds-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-ds-text mb-4">Create New Post</h3>
          
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ds-text-secondary mb-2">
                  Post Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full bg-ds-surface border border-ds-border rounded-lg px-3 py-2 text-ds-text"
                  required
                >
                  <option value="announcement">Announcement</option>
                  <option value="review">Review</option>
                  <option value="update">Update</option>
                  <option value="promotion">Promotion</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-ds-text-secondary mb-2">
                  Title (Optional)
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-ds-surface border border-ds-border rounded-lg px-3 py-2 text-ds-text"
                  placeholder="Post title..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ds-text-secondary mb-2">
                Content *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full bg-ds-surface border border-ds-border rounded-lg px-3 py-2 text-ds-text"
                rows={4}
                placeholder="Write your post content..."
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ds-text-secondary mb-2">
                  Image URL (Optional)
                </label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full bg-ds-surface border border-ds-border rounded-lg px-3 py-2 text-ds-text mb-2"
                  placeholder="https://..."
                />
                {formData.image_url && (
                  <div className="mt-2">
                    <img
                      src={formData.image_url}
                      alt="Image preview"
                      className="w-24 h-24 object-cover rounded-lg border border-ds-border"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-ds-text-secondary mb-2">
                  Rating (1-5, Optional)
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={formData.rating || ''}
                  onChange={(e) => setFormData({ ...formData, rating: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full bg-ds-surface border border-ds-border rounded-lg px-3 py-2 text-ds-text"
                  placeholder="1-5"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_pinned"
                checked={formData.is_pinned}
                onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                className="rounded border-ds-border"
              />
              <label htmlFor="is_pinned" className="text-ds-text">
                Pin post at top
              </label>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 rounded-lg border border-ds-border text-ds-text hover:bg-ds-surface-secondary transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={creating}
                className="px-4 py-2 rounded-lg bg-ds-primary text-white hover:bg-ds-primary-hover disabled:opacity-50 transition-colors"
              >
                {creating ? 'Creating...' : 'Create Post'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminPosts;
