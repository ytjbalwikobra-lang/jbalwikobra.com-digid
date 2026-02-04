import React from 'react';

const MobileLoadingSkeleton: React.FC = () => (
  <div 
    className="min-h-screen bg-black" 
    role="status" 
    aria-live="polite"
    aria-busy="true" 
    aria-label="Memuat halaman..."
  >
    <div className="px-4 pt-6 pb-4">
      <div className="h-8 placeholder-skeleton rounded-xl w-3/4 mb-4" aria-hidden="true"></div>
      <div className="h-4 placeholder-skeleton rounded w-1/2" aria-hidden="true"></div>
    </div>
    <div className="px-4 mb-6">
      <div className="h-48 placeholder-skeleton rounded-2xl" aria-hidden="true"></div>
    </div>
    <div className="px-4 space-y-6">
      {[...Array(3)].map((_, i) => (
        <div key={i} aria-hidden="true">
          <div className="h-6 placeholder-skeleton rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, j) => (
              <div key={j} className="h-32 placeholder-skeleton rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
    <span className="sr-only">Memuat konten, mohon tunggu...</span>
  </div>
);

export default React.memo(MobileLoadingSkeleton);
