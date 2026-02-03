import React from 'react';

export interface TierGameValues { tier_id: string; game_title: string; }
interface TierGameProps {
  values: TierGameValues;
  tiers: Array<{id:string; name:string}>; games: Array<{id:string; name:string}>;
  tiersLoading: boolean; gamesLoading: boolean;
  onChange: (patch: Partial<TierGameValues>) => void;
}
export const TierGameSection: React.FC<TierGameProps> = ({ values, tiers, games, tiersLoading, gamesLoading, onChange }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white border-b pb-2" style={{ borderColor: 'var(--admin-border)' }}>Tier & Game</h3>
      <div>
        <label className="admin-label">Tier *</label>
        <select value={values.tier_id} disabled={tiersLoading} onChange={e=>onChange({ tier_id: e.target.value })}
          className="admin-select">
          <option value="">Select Tier</option>
          {tiers.map(t=> <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div>
        <label className="admin-label">Game Title</label>
        <select value={values.game_title} disabled={gamesLoading} onChange={e=>onChange({ game_title: e.target.value })}
          className="admin-select">
          <option value="">{gamesLoading ? 'Loading games...' : 'Select Game'}</option>
          {games.map(g=> <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>
  {/* account_details removed */}
    </div>
  );
};
export default TierGameSection;
