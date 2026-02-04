import React from 'react';
import { Eye, Edit, Trash2, ToggleLeft, ToggleRight, Image as ImageIcon } from 'lucide-react';
import { BannerTableProps } from './types';

export const BannerTable: React.FC<BannerTableProps> = ({
  banners,
  loading,
  totalPages,
  currentPage,
  onPageChange,
  onToggleStatus,
  onDeleteBanner,
  onEditBanner,
  onImagePreview
}) => {
  if (loading) {
    return (
      <div className="group relative overflow-hidden bg-black border border-gray-800 rounded-2xl p-12 hover:border-pink-500/30 transition-all duration-300">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-800 rounded-full animate-pulse mx-auto mb-4" />
          <p className="text-gray-400 font-medium">Loading banners...</p>
        </div>
      </div>
    );
  }

  if (!banners.length) {
    return (
      <div className="group relative overflow-hidden bg-black border border-gray-800 rounded-2xl p-12 text-center hover:border-pink-500/30 transition-all duration-300">
        <div className="text-gray-400">
          <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium text-white mb-2">No banners found</p>
          <p className="text-sm">Create your first banner to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banners Grid */}
      <div className="space-y-4">
        {banners.map((banner) => (
          <div key={banner.id} className="group relative overflow-hidden bg-black border border-gray-800 rounded-2xl p-6 hover:border-pink-500/30 transition-all duration-300 hover:transform hover:scale-[1.02]">
            {/* Background gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-fuchsia-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Content */}
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-white">
                      {banner.title}
                    </h3>
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-xl border ${
                      banner.is_active 
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                        : 'bg-red-500/20 text-red-400 border-red-500/30'
                    }`}>
                      {banner.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-xl border bg-blue-500/20 text-blue-400 border-blue-500/30">
                      Order #{banner.sort_order}
                    </span>
                  </div>
                  {banner.subtitle && (
                    <p className="text-gray-300 text-sm mb-2">
                      {banner.subtitle}
                    </p>
                  )}
                  {banner.link_url && (
                    <p className="text-blue-400 text-sm truncate max-w-md">
                      {banner.link_url}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-400 mt-2">
                    <span>Created: {new Date(banner.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                
                {/* Banner Preview */}
                <div className="flex items-center gap-3 ml-4">
                  <img
                    src={banner.image_url}
                    alt={banner.title}
                    className="w-24 h-16 rounded-xl object-cover cursor-pointer border border-gray-700 hover:border-pink-500/50 transition-colors"
                    onClick={() => onImagePreview(banner.image_url)}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onToggleStatus(banner.id, banner.is_active)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      banner.is_active 
                        ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30' 
                        : 'bg-gray-800 border border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    {banner.is_active ? (
                      <ToggleRight className="w-4 h-4" />
                    ) : (
                      <ToggleLeft className="w-4 h-4" />
                    )}
                    {banner.is_active ? 'Active' : 'Activate'}
                  </button>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onImagePreview(banner.image_url)}
                    className="p-2 bg-gray-800 border border-gray-700 text-gray-400 rounded-xl hover:bg-gray-700 hover:text-white transition-all duration-200"
                    title="Preview image"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onEditBanner(banner)}
                    className="p-2 bg-gray-800 border border-gray-700 text-gray-400 rounded-xl hover:bg-gray-700 hover:text-white transition-all duration-200"
                    title="Edit banner"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteBanner(banner.id)}
                    className="p-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/30 transition-all duration-200"
                    title="Delete banner"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            className="px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-xl hover:bg-gray-700 hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
          >
            Previous
          </button>
          <span className="text-gray-400 text-sm px-4">
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-xl hover:bg-gray-700 hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
