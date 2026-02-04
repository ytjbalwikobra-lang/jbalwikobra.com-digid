import React from 'react';
import { PNCard, PNHeading, PNText } from '../ui/PinkNeonDesignSystem';
import { MessageCircle, X, AlertTriangle, RefreshCw, Sparkles, Eye, ZoomIn } from 'lucide-react';

export const FeedSkeleton: React.FC = () => (
  <div className="space-y-6 lg:space-y-8">
    {[1, 2, 3].map((i) => (
      <PNCard key={i} className="p-6 lg:p-8">
        {/* Header skeleton */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-gradient-to-r from-gray-700/50 to-gray-600/50 rounded-2xl animate-pulse"></div>
          <div className="flex-1 space-y-3">
            <div className="h-6 bg-gradient-to-r from-gray-700/50 to-gray-600/50 rounded-xl w-3/4 animate-pulse"></div>
            <div className="h-4 bg-gradient-to-r from-gray-700/30 to-gray-600/30 rounded-xl w-1/2 animate-pulse"></div>
          </div>
        </div>
        
        {/* Content skeleton */}
        <div className="space-y-4 mb-6">
          <div className="h-4 bg-gradient-to-r from-gray-700/40 to-gray-600/40 rounded-xl animate-pulse"></div>
          <div className="h-4 bg-gradient-to-r from-gray-700/40 to-gray-600/40 rounded-xl w-5/6 animate-pulse"></div>
          <div className="h-4 bg-gradient-to-r from-gray-700/40 to-gray-600/40 rounded-xl w-3/4 animate-pulse"></div>
        </div>
        
        {/* Image skeleton */}
        <div className="h-48 bg-gradient-to-br from-gray-700/30 to-gray-600/30 rounded-2xl mb-6 animate-pulse"></div>
        
        {/* Actions skeleton */}
        <div className="flex gap-3 pt-6 border-t border-white/10">
          <div className="h-12 bg-gradient-to-r from-gray-700/50 to-gray-600/50 rounded-2xl w-20 animate-pulse"></div>
          <div className="h-12 bg-gradient-to-r from-gray-700/50 to-gray-600/50 rounded-2xl w-24 animate-pulse"></div>
          <div className="h-12 bg-gradient-to-r from-gray-700/50 to-gray-600/50 rounded-2xl w-20 animate-pulse"></div>
        </div>
      </PNCard>
    ))}
  </div>
);

export const ErrorState: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <PNCard className="p-8 lg:p-12 border-red-500/20 bg-gradient-to-br from-red-500/10 via-pink-500/10 to-red-500/10 mb-8 lg:mb-12">
    <div className="text-center space-y-6">
      {/* Enhanced error icon */}
      <div className="relative mx-auto w-20 h-20">
        <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping"></div>
        <div className="relative w-20 h-20 bg-gradient-to-r from-red-500/30 to-pink-500/30 rounded-full flex items-center justify-center border border-red-500/40">
          <AlertTriangle className="w-10 h-10 text-red-400" />
        </div>
      </div>
      
      {/* Error content */}
      <div className="space-y-3">
        <PNHeading level={3} className="text-red-100">Oops! Terjadi Kesalahan</PNHeading>
        <PNText className="text-red-200/80 max-w-md mx-auto">{message}</PNText>
      </div>
      
      {/* Enhanced retry button */}
      <button 
        onClick={onRetry} 
        className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-6 py-3 rounded-xl shadow-lg shadow-red-500/30 flex items-center gap-3 mx-auto transition-all duration-200"
      >
        <RefreshCw className="w-5 h-5" />
        Coba Lagi
      </button>
    </div>
  </PNCard>
);

export const EmptyState: React.FC<{ label: string; description: string }> = ({ label, description }) => (
  <div className="text-center py-16 lg:py-24">
    <div className="space-y-8">
      {/* Enhanced empty icon */}
      <div className="relative mx-auto w-24 h-24">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-500/10 to-gray-400/10 rounded-full animate-pulse"></div>
        <div className="relative w-24 h-24 bg-gradient-to-r from-gray-600/20 to-gray-500/20 rounded-full flex items-center justify-center border border-gray-500/30 backdrop-blur-sm">
          <MessageCircle className="w-12 h-12 text-gray-400" />
        </div>
        <div className="absolute top-2 right-2 w-6 h-6 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
          <Sparkles className="w-3 h-3 text-white" />
        </div>
      </div>
      
      {/* Empty content */}
      <div className="space-y-4">
        <PNHeading 
          level={2} 
          className="bg-gradient-to-r from-white via-gray-100 to-gray-200 bg-clip-text text-transparent"
        >
          {label}
        </PNHeading>
        <PNText className="text-gray-400 text-lg lg:text-xl max-w-lg mx-auto">
          {description}
        </PNText>
      </div>
      
      {/* Decorative elements */}
      <div className="flex justify-center gap-2">
        <div className="w-2 h-2 bg-pink-500/50 rounded-full animate-pulse"></div>
        <div className="w-2 h-2 bg-purple-500/50 rounded-full animate-pulse delay-100"></div>
        <div className="w-2 h-2 bg-indigo-500/50 rounded-full animate-pulse delay-200"></div>
      </div>
    </div>
  </div>
);

export const ImageLightbox: React.FC<{ src: string; onClose: () => void }> = ({ src, onClose }) => (
  <div 
    className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4 lg:p-8" 
    onClick={onClose}
  >
    {/* Background overlay with subtle pattern */}
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03),transparent_70%)]"></div>
    
    {/* Enhanced image container */}
    <div className="relative max-w-[95vw] max-h-[95vh] group">
      {/* Image with enhanced styling */}
      <img 
        src={src} 
        alt="Preview" 
        className="max-w-full max-h-full rounded-3xl border border-white/20 shadow-2xl shadow-black/50 backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
      />
      
      {/* Enhanced close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-12 h-12 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full border border-white/20 flex items-center justify-center text-white hover:text-gray-200 transition-all duration-300 group-hover:scale-110"
      >
        <X className="w-6 h-6" />
      </button>
      
      {/* Zoom indicator */}
      <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm rounded-2xl px-4 py-2 border border-white/20 flex items-center gap-2 text-white/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <ZoomIn className="w-4 h-4" />
        <span className="text-sm font-medium">Klik gambar untuk memperbesar</span>
      </div>
    </div>
  </div>
);
