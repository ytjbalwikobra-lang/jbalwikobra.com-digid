import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Home, 
  ArrowLeft, 
  Clock, 
  Construction, 
  Zap,
  Package,
  MessageSquare,
  Heart
} from 'lucide-react';
import { PNButton } from '../components/ui/CyberDesignSystem';
import { SEOHead } from '../components/seo';

const NotFoundPage: React.FC = () => {
  const quickActions = [
    { label: 'Beranda', path: '/', icon: Home, color: 'from-blue-500 to-indigo-600' },
    { label: 'Produk', path: '/products', icon: Package, color: 'from-green-500 to-emerald-600' },
    { label: 'Flash Sale', path: '/flash-sales', icon: Zap, color: 'from-orange-500 to-red-600' },
    { label: 'Feed', path: '/feed', icon: MessageSquare, color: 'from-purple-500 to-violet-600' },
  ];

  return (
    <div className="min-h-screen bg-[var(--cyber-bg-pure)] text-white flex items-center justify-center relative overflow-hidden">
      <SEOHead
        title="Halaman Tidak Ditemukan | JBal WiKobra"
        description="Halaman yang Anda cari tidak ditemukan atau sedang dalam pengembangan. Kembali ke beranda untuk menjelajahi produk gaming kami."
        url="/404"
      />
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-pink-500/20 to-fuchsia-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-fuchsia-500/10 to-pink-500/10 rounded-full blur-2xl animate-pulse delay-500" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* Main Content */}
        <div className="bg-[var(--cyber-bg-pure)]/40 backdrop-blur-xl border border-[var(--cyber-border)] rounded-cyber-3xl p-8 lg:p-12 shadow-2xl">
          
          {/* Construction Icon */}
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-pink-500 to-fuchsia-600 rounded-cyber-2xl mb-8 shadow-lg shadow-pink-500/30">
            <Construction className="w-12 h-12 text-white" />
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/50 to-fuchsia-500/50 rounded-cyber-2xl blur-lg animate-pulse" />
          </div>

          {/* Main Message */}
          <h1 className="text-4xl lg:text-6xl font-bold mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500">
              Akan Segera Hadir
            </span>
          </h1>

          <div className="space-y-4 mb-8">
            <p className="text-xl lg:text-2xl text-[var(--cyber-text-primary)] font-medium">
              Halaman yang Anda cari sedang dalam pengembangan
            </p>
            <p className="text-[var(--cyber-text-secondary)] text-lg max-w-2xl mx-auto leading-relaxed">
              Tim kami sedang bekerja keras untuk memberikan pengalaman terbaik. 
              Silakan kembali lagi nanti untuk melihat fitur-fitur menarik yang akan datang!
            </p>
          </div>

          {/* Coming Soon Badge */}
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-pink-500/20 to-fuchsia-500/20 backdrop-blur-sm border border-pink-500/30 rounded-cyber-2xl mb-12">
            <Clock className="w-5 h-5 text-[var(--cyber-pink-primary)]" />
            <span className="text-[var(--cyber-pink-primary)] font-medium">Coming Soon</span>
            <div className="w-2 h-2 bg-[var(--cyber-pink-primary)] rounded-full animate-ping" />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.path}
                  to={action.path}
                  className="group relative p-6 interactive-card backdrop-blur-sm rounded-cyber-2xl transition-all duration-300 hover:scale-105"
                >
                  <div className={`inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br ${action.color} rounded-cyber-lg mb-3 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-[var(--cyber-text-secondary)] group-hover:text-white font-medium text-sm transition-colors duration-300">
                    {action.label}
                  </p>
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-500/0 to-fuchsia-500/0 group-hover:from-pink-500/5 group-hover:to-fuchsia-500/5 rounded-cyber-2xl transition-all duration-300" />
                </Link>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <PNButton
              onClick={() => window.history.back()}
              variant="ghost"
              className="interactive-card text-white px-6 py-3"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </PNButton>
            
            <Link to="/">
              <PNButton
                variant="primary"
                className="bg-gradient-to-r from-pink-500 to-fuchsia-600 hover:from-pink-600 hover:to-fuchsia-700"
              >
                <Home className="w-4 h-4 mr-2" />
                Ke Beranda
              </PNButton>
            </Link>
          </div>

          {/* Support Message */}
          <div className="mt-12 pt-8 border-t border-[var(--cyber-border)]">
            <div className="flex items-center justify-center gap-2 text-[var(--cyber-text-muted)]">
              <Heart className="w-4 h-4 text-[var(--cyber-pink-primary)]" />
              <span className="text-sm">
                Butuh bantuan? Hubungi{' '}
                <Link to="/help" className="text-[var(--cyber-pink-primary)] hover:text-[var(--cyber-pink-secondary)] transition-colors underline">
                  tim support
                </Link>
                {' '}kami
              </span>
            </div>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-gradient-to-br from-pink-500/30 to-transparent rounded-full blur-xl animate-pulse delay-300" />
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-gradient-to-br from-fuchsia-500/30 to-transparent rounded-full blur-xl animate-pulse delay-700" />
      </div>
    </div>
  );
};

export default NotFoundPage;
