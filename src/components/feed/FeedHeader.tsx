import React from 'react';
import { Sparkles } from 'lucide-react';
import { PNSection, PNContainer, PNHeading, PNText } from '../ui/CyberDesignSystem';

export const FeedHeader: React.FC = () => {
  return (
    <PNSection padding="lg">
      <PNContainer>
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-black via-black to-black px-6 py-10">
          {/* Glow background accents */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-fuchsia-600/20 rounded-full blur-3xl" />
          </div>
          
          {/* Content */}
          <div className="relative z-10 text-center max-w-4xl mx-auto">
            {/* Hero section */}
            <div className="space-y-4">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-fuchsia-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-pink-500/25">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-black animate-ping"></div>
                </div>
              </div>
              
              <PNHeading level={1} gradient className="mb-3">Feed Komunitas</PNHeading>
              <PNText className="max-w-3xl mx-auto">
                Bergabung dalam diskusi komunitas dan dapatkan update terbaru dari 
                <span className="text-pink-500 font-medium"> JB Alwikobra</span>
              </PNText>
            </div>
          </div>
        </div>
      </PNContainer>
    </PNSection>
  );
};

export default FeedHeader;
