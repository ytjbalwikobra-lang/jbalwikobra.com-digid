import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, Calendar, Clock, Star, Sparkles, ExternalLink, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { PNCard } from '../components/ui/CyberDesignSystem';
import { cn } from '../utils/cn';
import LinkifyText from './LinkifyText';

interface FeedCardProps {
  post: {
    id: string;
    title: string;
    content: string;
    author?: string;
    created_at: string;
    type?: string;
    image?: string;
    media?: string[];
    counts: {
      likes: number;
      comments: number;
      shares?: number;
    };
    isLiked?: boolean;
  };
  onLike?: (id: string) => void;
  onComment?: (id: string) => void;
  onShare?: (id: string) => void;
  onImageClick?: (image: string) => void;
  canInteract?: boolean;
}

export const FeedCard: React.FC<FeedCardProps> = ({
  post,
  onLike,
  onComment,
  onShare,
  onImageClick,
  canInteract = true
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldTruncate = post.content.length > 200;
  const displayContent = shouldTruncate && !isExpanded 
    ? post.content.substring(0, 200) + '...' 
    : post.content;

  const getPostTypeConfig = () => {
    switch (post.type) {
      case 'announcement':
        return {
          icon: Sparkles,
          iconColor: 'text-[var(--cyber-warning)]',
          badge: {
            bg: 'bg-[var(--cyber-warning)]/20',
            border: 'border-[var(--cyber-warning)]/40',
            text: 'text-[var(--cyber-warning)]',
            label: 'Pengumuman'
          }
        };
      case 'review':
        return {
          icon: Star,
          iconColor: 'text-[var(--cyber-warning)]',
          badge: {
            bg: 'bg-[var(--cyber-warning)]/20',
            border: 'border-[var(--cyber-warning)]/40',
            text: 'text-[var(--cyber-warning)]',
            label: 'Review'
          }
        };
      default:
        return {
          icon: MessageCircle,
          iconColor: 'text-[var(--cyber-pink-primary)]',
          badge: null
        };
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Baru saja';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}j`;
    if (diffInMinutes < 43200) return `${Math.floor(diffInMinutes / 1440)}h`;
    return postDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  const typeConfig = getPostTypeConfig();
  const TypeIcon = typeConfig.icon;

  return (
    <PNCard className="p-6 hover:scale-[1.02] transition-all duration-300 group">
      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Enhanced post type icon */}
            <div className={`
              w-14 h-14 bg-gradient-to-r from-[var(--cyber-pink-subtle)] to-[var(--cyber-pink-muted)] rounded-cyber-2xl 
              flex items-center justify-center border border-[var(--cyber-border)]
              shadow-lg group-hover:scale-110 transition-transform duration-300
            `}>
              <TypeIcon className={`w-7 h-7 ${typeConfig.iconColor}`} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h3 className="text-white font-bold text-xl lg:text-2xl truncate group-hover:text-[var(--cyber-text-primary)] transition-colors">
                  {post.title}
                </h3>
                {typeConfig.badge && (
                  <span className={`
                    text-xs px-3 py-1.5 rounded-full border font-semibold
                    ${typeConfig.badge.bg} ${typeConfig.badge.border} ${typeConfig.badge.text}
                    shadow-sm
                  `}>
                    {typeConfig.badge.label}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-sm text-[var(--cyber-text-muted)]">
                <Calendar className="w-4 h-4" />
                <span>{formatTimeAgo(post.created_at)}</span>
                {post.author && (
                  <>
                    <span>•</span>
                    <span className="font-medium text-[var(--cyber-text-secondary)]">{post.author}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content with improved typography */}
        <div className="mb-6">
          <div className="text-[var(--cyber-text-primary)] leading-relaxed text-base lg:text-lg">
            <LinkifyText text={displayContent} />
          </div>
          
          {shouldTruncate && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 text-[var(--cyber-pink-primary)] hover:text-[var(--cyber-pink-secondary)] text-sm font-semibold mt-3 
                         bg-[var(--cyber-pink-subtle)] hover:bg-[var(--cyber-pink-muted)] px-3 py-2 rounded-cyber-lg border border-[var(--cyber-pink-muted)]
                         transition-all duration-300"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Tampilkan lebih sedikit
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Selengkapnya
                </>
              )}
            </button>
          )}
        </div>

        {/* Enhanced Media Grid */}
        {post.media && post.media.length > 0 && (
          <div className="mb-6">
            <div className={cn(
              "grid gap-3 rounded-cyber-2xl overflow-hidden",
              post.media.length === 1 ? "grid-cols-1" :
              post.media.length === 2 ? "grid-cols-2" :
              post.media.length === 3 ? "grid-cols-2" : "grid-cols-2"
            )}>
              {post.media.slice(0, 4).map((mediaUrl, index) => (
                <div
                  key={index}
                  className={cn(
                    "relative group cursor-pointer rounded-cyber-2xl overflow-hidden bg-gradient-to-br from-[var(--cyber-bg-card)]/50 to-[var(--cyber-bg-pure)]/50 shadow-lg",
                    post.media!.length === 3 && index === 0 ? "row-span-2" : "",
                    post.media!.length === 1 ? "aspect-video" : "aspect-square"
                  )}
                  onClick={() => onImageClick?.(mediaUrl)}
                >
                  <img
                    src={mediaUrl}
                    alt={`Gambar ${index + 1} dari postingan`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  
                  {/* Enhanced overlay for additional images */}
                  {index === 3 && post.media!.length > 4 && (
                    <div className="absolute inset-0 bg-[var(--cyber-bg-overlay)] backdrop-blur-sm flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-[var(--cyber-bg-elevated)] rounded-full flex items-center justify-center mb-2 mx-auto">
                          <Eye className="w-6 h-6 text-[var(--cyber-text-primary)]" />
                        </div>
                        <span className="text-[var(--cyber-text-primary)] font-bold text-xl">
                          +{post.media!.length - 4}
                        </span>
                        <div className="text-[var(--cyber-text-secondary)] text-sm">foto lainnya</div>
                      </div>
                    </div>
                  )}
                  
                  {/* Enhanced hover overlay */}
                  <div className="absolute inset-0 bg-transparent group-hover:bg-[var(--cyber-bg-overlay)] transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="w-12 h-12 bg-[var(--cyber-bg-elevated)] backdrop-blur-sm rounded-full flex items-center justify-center">
                      <ExternalLink className="w-6 h-6 text-[var(--cyber-text-primary)]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modern Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-[var(--cyber-border)]">
          <div className="flex items-center gap-3">
            {/* Enhanced Like Button */}
            <button
              onClick={() => canInteract && onLike?.(post.id)}
              disabled={!canInteract}
              className={cn(
                "flex items-center gap-2 px-4 py-3 transition-all duration-300 rounded-cyber-2xl min-h-[44px]",
                post.isLiked
                  ? "bg-gradient-to-r from-[var(--cyber-pink-primary)] to-[var(--cyber-error)] border-transparent text-[var(--cyber-text-primary)] shadow-lg shadow-[var(--cyber-pink-muted)]"
                  : "bg-[var(--cyber-bg-card)] hover:bg-[var(--cyber-bg-elevated)] border border-[var(--cyber-border)] hover:border-[var(--cyber-pink-muted)] text-[var(--cyber-text-secondary)] hover:text-[var(--cyber-text-primary)]"
              )}
            >
              <Heart className={cn(
                "w-5 h-5 transition-all duration-300",
                post.isLiked ? "fill-current text-[var(--cyber-text-primary)] scale-110" : "group-hover:scale-110"
              )} />
              <span className="font-semibold">{post.counts.likes}</span>
            </button>

            {/* Enhanced Comment Button */}
            <button
              onClick={() => canInteract && onComment?.(post.id)}
              disabled={!canInteract}
              className="flex items-center gap-2 px-4 py-3 bg-[var(--cyber-bg-card)] hover:bg-[var(--cyber-bg-elevated)] border border-[var(--cyber-border)] hover:border-[var(--cyber-info)]/30 text-[var(--cyber-text-secondary)] hover:text-[var(--cyber-text-primary)] transition-all duration-300 rounded-cyber-2xl min-h-[44px] group"
            >
              <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
              <span className="font-semibold">{post.counts.comments}</span>
            </button>

            {/* Enhanced Share Button */}
            <button
              onClick={() => canInteract && onShare?.(post.id)}
              disabled={!canInteract}
              className="flex items-center gap-2 px-4 py-3 bg-[var(--cyber-bg-card)] hover:bg-[var(--cyber-bg-elevated)] border border-[var(--cyber-border)] hover:border-[var(--cyber-success)]/30 text-[var(--cyber-text-secondary)] hover:text-[var(--cyber-text-primary)] transition-all duration-300 rounded-cyber-2xl min-h-[44px] group"
            >
              <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
              <span className="font-semibold">{post.counts.shares || 0}</span>
            </button>
          </div>

          {/* Enhanced Timestamp */}
          <div className="flex items-center gap-2 text-sm text-[var(--cyber-text-muted)] bg-[var(--cyber-bg-card)] px-3 py-2 rounded-cyber-lg border border-[var(--cyber-border)]">
            <Clock className="w-4 h-4" />
            <span>{new Date(post.created_at).toLocaleTimeString('id-ID', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}</span>
          </div>
        </div>
      </div>
    </PNCard>
  );
};
