import React from 'react';

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        {/* Icon */}
        <div className="mb-8">
          <svg 
            className="w-24 h-24 mx-auto text-pink-500" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1.5} 
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1.5} 
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>

        {/* Main heading */}
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">
          Under Maintenance
        </h1>
        
        {/* Description */}
        <p className="text-lg md:text-xl text-gray-400 mb-8">
          We're currently performing scheduled maintenance to improve your experience. 
          Please check back soon.
        </p>

        {/* Additional info */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 mb-8">
          <p className="text-gray-400 text-sm">
            💡 Our team is working hard to bring you an enhanced experience. 
            We appreciate your patience and understanding.
          </p>
        </div>

        {/* Refresh button */}
        <button 
          onClick={() => window.location.reload()}
          className="cyber-btn cyber-btn-primary px-8"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Page
        </button>
      </div>
    </div>
  );
}
