import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, Edit, Trash2, Calendar, User, Share2, Check } from 'lucide-react';
import { adminService, type FeedPost } from '../../../services/adminService';
import FeedPostDialog from './FeedPostDialog';

const FeedTab: React.FC = () => {
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [editingPost, setEditingPost] = useState<FeedPost | null>(null);
  const [sharedPostId, setSharedPostId] = useState<string | null>(null);

  useEffect(() => {
    loadFeedPosts();
  }, []);

  const loadFeedPosts = async () => {
    try {
      setLoading(true);
      const response = await adminService.getFeedPosts(1, 50);
      setFeedPosts(response.data);
    } catch (err) {
      setError('Failed to load feed posts');
    } finally {
      setLoading(false);
    }
  };

  const updateFeedPost = async (post: Partial<FeedPost>) => {
    try {
      if (post.id) {
        await adminService.updateFeedPost(post.id, post as any);
      }
      await loadFeedPosts();
    } catch (err) {
      throw err;
    }
  };

  const deleteFeedPost = async (id: string) => {
    try {
      await adminService.deleteFeedPost(id);
      await loadFeedPosts();
    } catch (err) {
      throw err;
    }
  };

  const handleAddPost = () => {
    setEditingPost(null);
    setShowPostDialog(true);
  };

  const handleEditPost = (post: FeedPost) => {
    setEditingPost(post);
    setShowPostDialog(true);
  };

  const handleDeletePost = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await deleteFeedPost(id);
      } catch (err) {
        console.error('Failed to delete post:', err);
      }
    }
  };

  const handleSavePost = async (postData: Partial<FeedPost>) => {
    try {
      await updateFeedPost(postData);
      setShowPostDialog(false);
      setEditingPost(null);
    } catch (err) {
      console.error('Failed to save post:', err);
    }
  };

  const getPostTypeBadge = (type: FeedPost['type']) => {
    return (
      <span className={`badge ${type === 'announcement' ? 'badge-warning' : 'badge-primary'}`}>
        {type === 'announcement' ? 'Announcement' : 'Post'}
      </span>
    );
  };

  if (loading) {
    return (
    <div className="space-y-4">
        {[1, 2, 3].map((i) => (
  <div key={i} className="dashboard-data-panel padded rounded-xl p-stack-lg animate-pulse">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="h-4 bg-black-secondary rounded mb-2"></div>
                <div className="h-3 bg-black-secondary rounded w-1/3"></div>
              </div>
              <div className="h-6 bg-black-secondary rounded w-20"></div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-black-secondary rounded"></div>
              <div className="h-3 bg-black-secondary rounded w-3/4"></div>
            </div>
      </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
  <div className="dashboard-data-panel padded rounded-xl p-stack-lg text-center">
  <div className="text-rose-400 mb-4">
          <MessageSquare className="w-12 h-12 mx-auto mb-2" />
          <p className="font-medium">Failed to load feed posts</p>
          <p className="text-sm text-gray-200">{error}</p>
        </div>
      </div>
    );
  }

  const handleShare = async (post: FeedPost) => {
    const shareData = {
  title: 'Feed Post',
  text: post.content?.substring(0, 120) || 'Check out this post',
  url: `${window.location.origin}/feed/${post.id}`
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
      }
      setSharedPostId(post.id);
      setTimeout(() => setSharedPostId(null), 2500);
    } catch (e) {
      console.error('Share failed', e);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Feed Management</h2>
        <button
          onClick={handleAddPost}
          className="btn btn-primary btn-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Post
        </button>
      </div>

      {/* Posts List */}
      {feedPosts.length === 0 ? (
  <div className="dashboard-data-panel padded rounded-xl p-stack-lg text-center">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-200" />
          <h3 className="text-lg font-medium text-white mb-2">No posts found</h3>
          <p className="text-gray-200 mb-4">Start by creating your first feed post</p>
          <button className="btn btn-primary" onClick={handleAddPost}>Add Post</button>
        </div>
      ) : (
  <div className="space-y-4">
          {feedPosts.map((post) => (
            <div key={post.id} className="dashboard-data-panel padded rounded-xl p-stack-lg hover:shadow-lg transition-all duration-200">
              {/* Post Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{post.author_name}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-200">
                      <Calendar className="w-3 h-3" />
                      {new Date(post.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={`badge ${post.type === 'announcement' ? 'badge-warning' : 'badge-primary'}`}>
                    {post.type === 'announcement' ? 'Announcement' : 'Post'}
                  </span>
                </div>
              </div>

              {/* Post Content */}
              <div className="mb-4">
                <p className="text-white whitespace-pre-wrap leading-relaxed">
                  {post.content}
                </p>
              </div>

              {/* Post Actions */}
              <div className="flex gap-4 pt-4 border-t border-white/10 flex-wrap">
                <button
                  onClick={() => handleEditPost(post)}
                  className="btn btn-secondary btn-sm flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDeletePost(post.id)}
                  className="btn btn-danger btn-sm flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
                <button
                  onClick={() => handleShare(post)}
                  className="btn btn-secondary btn-sm flex items-center gap-2"
                >
                  {sharedPostId === post.id ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
                  {sharedPostId === post.id ? 'Copied' : 'Share'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Post Dialog */}
      {showPostDialog && (
        <FeedPostDialog
          post={editingPost as any}
          onSave={handleSavePost}
          onClose={() => {
            setShowPostDialog(false);
            setEditingPost(null);
          }}
        />
      )}
    </div>
  );
};

export default FeedTab;
