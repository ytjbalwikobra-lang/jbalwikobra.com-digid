import React from 'react';
import { Heart, Trash2, ShoppingCart, Star } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthRequired } from '../components/ProtectedRoute';
import { useWishlist } from '../contexts/WishlistContext';
import PublicPageHeader from '../components/shared/PublicPageHeader';
import { PNSection, PNContainer } from '../components/ui/CyberDesignSystem';
import { formatCurrency } from '../utils/helpers';
// standardClasses helper removed – using direct utility classes per new design system

const WishlistPage: React.FC = () => {
  const { wishlistItems, removeFromWishlist, clearWishlist } = useWishlist();
  const navigate = useNavigate();

  const handleClearWishlist = () => {
    if (confirm('Yakin ingin mengosongkan wishlist?')) {
      clearWishlist();
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  return (
    <AuthRequired>
      <div className="min-h-screen bg-[var(--cyber-bg-pure)] text-white">
        <PNContainer>
          <PNSection padding="lg">
            {/* Shared Header */}
            <PublicPageHeader
              title="Wishlist Saya"
              onBack={handleBackToHome}
              backAriaLabel="Kembali ke Beranda"
              showWishlist={false}
              showShare={false}
            />

            {/* Subheader with count and clear button */}
            <div className="flex items-center justify-between mb-8">
              <p className="text-[var(--cyber-text-muted)]">
                {wishlistItems.length > 0 
                  ? `${wishlistItems.length} produk yang Anda sukai`
                  : 'Produk yang Anda sukai'
                }
              </p>
              {wishlistItems.length > 0 && (
                <button
                  onClick={handleClearWishlist}
                  className="text-red-400 hover:text-red-300 text-sm underline transition-colors"
                >
                  Kosongkan Semua
                </button>
              )}
            </div>

          {wishlistItems.length === 0 ? (
            <div className="bg-surface-alt backdrop-blur rounded-cyber-2xl p-12 text-center border-subtle">
              <div className="w-20 h-20 bg-[var(--cyber-pink-muted)] rounded-cyber-2xl flex items-center justify-center mx-auto mb-6">
                <Heart size={40} className="text-[var(--cyber-pink-primary)]" />
              </div>
              <h2 className="text-2xl font-semibold text-white mb-4">Wishlist Kosong</h2>
              <p className="text-secondary mb-8 max-w-md mx-auto">
                Belum ada produk yang ditambahkan ke wishlist. 
                Jelajahi katalog dan tambahkan produk favorit Anda!
              </p>
              <Link
                to="/products"
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-[var(--cyber-pink-primary)] to-[var(--cyber-purple)] hover:opacity-90 text-white px-8 py-4 rounded-cyber-lg transition-all transform hover:scale-105"
              >
                <ShoppingCart size={20} />
                <span>Jelajahi Produk</span>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {wishlistItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-[var(--cyber-bg-pure)]/40 backdrop-blur rounded-cyber-lg p-4 border border-[var(--cyber-pink-muted)] flex items-center space-x-4"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-20 h-20 rounded-cyber-lg object-cover"
                    loading="lazy"
                  />
                  
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">{item.name}</h3>
                    <p className="text-tertiary text-sm mb-2">{item.category}</p>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-[var(--cyber-pink-primary)] font-bold text-lg">
                        {formatCurrency(item.price)}
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <Star size={16} className="text-yellow-400 fill-current" />
                        <span className="text-secondary text-sm">{item.rating}</span>
                      </div>
                      
                      <div className={`text-xs px-2 py-1 rounded ${
                        item.available 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {item.available ? 'Tersedia' : 'Habis'}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2">
                    <Link
                      to={`/products/${item.id}`}
                      className="cyber-btn cyber-btn-primary cyber-btn-sm w-full"
                    >
                      Lihat Detail
                    </Link>
                    
                    <button
                      onClick={() => removeFromWishlist(item.id)}
                      className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-cyber-lg text-sm transition-colors flex items-center justify-center space-x-1"
                    >
                      <Trash2 size={14} />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Stats */}
          {wishlistItems.length > 0 && (
            <div className="mt-6 bg-surface-alt backdrop-blur rounded-cyber-lg p-4 border border-[var(--cyber-pink-muted)]">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-[var(--cyber-pink-primary)]">{wishlistItems.length}</div>
                  <div className="text-tertiary text-sm">Total Item</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-400">
                    {wishlistItems.filter(item => item.available).length}
                  </div>
                  <div className="text-tertiary text-sm">Tersedia</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-400">
                    {formatCurrency(wishlistItems.reduce((sum, item) => sum + item.price, 0))}
                  </div>
                  <div className="text-[var(--cyber-text-muted)] text-sm">Total Nilai</div>
                </div>
              </div>
            </div>
          )}
          </PNSection>
        </PNContainer>
      </div>
    </AuthRequired>
  );
};

export default WishlistPage;
