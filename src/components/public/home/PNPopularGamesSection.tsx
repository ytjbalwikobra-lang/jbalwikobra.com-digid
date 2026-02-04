import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Gamepad2 } from 'lucide-react';
import { PNSection, PNSectionHeader, PNCard, PNContainer } from '../../ui/CyberDesignSystem';

interface GameItem { id: string; name: string; slug: string; logoUrl?: string | null; count: number; }
interface Props { games: GameItem[]; limit?: number }

const PNPopularGamesSection: React.FC<Props> = ({ games, limit = 12 }) => {
  if (!games || games.length === 0) return null;
  const list = games.slice(0, limit);
  return (
    <PNSection padding="md" aria-label="Game populer tersedia">
      <PNContainer>
      <PNSectionHeader
        title="Game Populer"
        subtitle="Pilih dari berbagai game favorit"
        action={
          <Link 
            to="/products" 
            className="text-sm text-[var(--cyber-pink-primary)] hover:text-[var(--cyber-pink-secondary)] transition-colors flex items-center gap-1 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyber-pink-primary)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cyber-bg-pure)] rounded-md"
            aria-label="Lihat semua game tersedia"
          >
            Lihat Semua <ChevronRight size={16} aria-hidden="true" />
          </Link>
        }
      />
      {/* Responsive grid: horizontal scroll on mobile, columns on md+ */}
      <div 
        className="grid gap-4 px-1 pb-2 auto-cols-[140px] grid-flow-col overflow-x-auto snap-x snap-mandatory scrollbar-hide md:auto-cols-auto md:grid-flow-row md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 md:overflow-x-visible md:px-0"
        role="list"
        aria-label="Daftar game populer"
      >
        {list.map((g) => (
          <Link 
            key={g.id} 
            to={`/products?game=${encodeURIComponent(g.name)}`} 
            className="block min-w-[140px] md:min-w-0 snap-start group focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyber-pink-primary)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cyber-bg-pure)] rounded-cyber-2xl"
            role="listitem"
            aria-label={`${g.name}, ${g.count} akun tersedia`}
          >
            <PNCard className="p-3.5 hover:bg-[var(--cyber-bg-elevated)] hover:border-[var(--cyber-pink-muted)] transition-all h-full">
              <div className="aspect-square rounded-cyber-lg mb-2.5 flex items-center justify-center overflow-hidden bg-gradient-to-br from-[var(--cyber-bg-card)] to-[var(--cyber-bg-pure)] border border-[var(--cyber-border)] group-hover:border-[var(--cyber-pink-muted)] transition-colors" aria-hidden="true">
                {g.logoUrl ? (
                  <img src={g.logoUrl} alt={`Logo ${g.name}`} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <Gamepad2 className="text-[var(--cyber-text-muted)]" size={28} aria-hidden="true" />
                )}
              </div>
              <div className="text-sm font-medium text-white line-clamp-2 mb-1 group-hover:text-[var(--cyber-pink-secondary)] transition-colors">{g.name}</div>
              <div className="text-xs text-[var(--cyber-text-muted)]">{g.count} akun</div>
            </PNCard>
          </Link>
        ))}
      </div>
      </PNContainer>
    </PNSection>
  );
};

export default React.memo(PNPopularGamesSection);
