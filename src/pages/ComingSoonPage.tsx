import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Home, 
  ArrowLeft, 
  Clock, 
  Sparkles, 
  Construction,
  Calendar,
  Bell
} from 'lucide-react';
import { PNButton } from '../components/ui/CyberDesignSystem';

const ComingSoonPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[var(--cyber-bg-pure)] flex items-center justify-center relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-pink-500/20 to-fuchsia-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-full blur-2xl animate-pulse delay-500" />
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
        
        {/* Main Content */}
        <div className="mb-12">
          {/* Construction Icon with Glow */}
          <div className="relative inline-flex items-center justify-center mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-fuchsia-600 rounded-full blur-2xl opacity-60 animate-pulse" />
            <div className="relative p-8 bg-gradient-to-br from-pink-500 to-fuchsia-600 rounded-full shadow-2xl">
              <Construction className="w-16 h-16 text-white" strokeWidth={1.5} />
            </div>
          </div>

          {/* Coming Soon Badge */}
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/5 backdrop-blur-xl border border-white/20 rounded-full mb-6">
            <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
            <span className="text-white/80 text-sm font-medium">Segera Hadir</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500 animate-pulse">
              Akan Segera Hadir
            </span>
          </h1>

          <p className="text-xl lg:text-2xl text-white/70 mb-8 max-w-2xl mx-auto leading-relaxed">
            Halaman yang Anda cari sedang dalam tahap pengembangan. 
            <br className="hidden sm:block" />
            <span className="text-[var(--cyber-pink-secondary)]">Silahkan kembali lagi nanti!</span>
          </p>
        </div>

        {/* Features Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-3xl mx-auto">
          <FeatureCard 
            icon={Clock}
            title="Pengembangan Aktif"
            description="Tim kami sedang bekerja keras untuk menghadirkan fitur terbaik"
            color="from-blue-500 to-cyan-500"
          />
          <FeatureCard 
            icon={Sparkles}
            title="Fitur Premium"
            description="Hadir dengan teknologi terdepan dan pengalaman terbaik"
            color="from-pink-500 to-rose-500"
          />
          <FeatureCard 
            icon={Bell}
            title="Notifikasi Update"
            description="Dapatkan pemberitahuan ketika fitur sudah tersedia"
            color="from-purple-500 to-indigo-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <Link to="/">
            <PNButton 
              variant="primary"
              size="lg"
              className="bg-gradient-to-r from-pink-500 to-fuchsia-600 hover:from-pink-600 hover:to-fuchsia-700 shadow-lg shadow-pink-500/30"
            >
              <div className="flex items-center gap-3">
                <Home className="w-5 h-5" />
                <span>Kembali ke Beranda</span>
              </div>
            </PNButton>
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-3 px-6 py-3 interactive-card backdrop-blur-sm rounded-cyber-lg text-white hover:text-[var(--cyber-pink-secondary)] transition-all duration-300"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Halaman Sebelumnya</span>
          </button>
        </div>

        {/* Estimated Timeline */}
        <div className="bg-[var(--cyber-bg-card)]/20 backdrop-blur-xl border border-white/10 rounded-cyber-2xl p-6 max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-5 h-5 text-[var(--cyber-pink-primary)]" />
            <h3 className="text-white font-semibold">Estimasi Peluncuran</h3>
          </div>
          <p className="text-white/70 text-sm mb-3">
            Kami menargetkan untuk meluncurkan fitur ini dalam waktu dekat. 
            Ikuti media sosial kami untuk update terbaru!
          </p>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-[var(--cyber-pink-primary)] rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-[var(--cyber-pink-primary)] rounded-full animate-bounce delay-100" />
            <div className="w-2 h-2 bg-[var(--cyber-pink-primary)] rounded-full animate-bounce delay-200" />
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-white/50 text-sm mt-8">
          Jika Anda mengalami masalah atau memiliki pertanyaan, 
          <Link to="/help" className="text-[var(--cyber-pink-primary)] hover:text-[var(--cyber-pink-secondary)] ml-1 underline">
            hubungi tim support kami
          </Link>
        </p>
      </div>
    </div>
  );
};

// Feature Card Component
interface FeatureCardProps {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  color: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, description, color }) => (
  <div className="group relative">
    <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-10 rounded-cyber-2xl transition-opacity duration-300" 
         style={{ background: `linear-gradient(135deg, var(--tw-gradient-stops))` }} />
    
  <div className="relative p-6 interactive-card backdrop-blur-sm rounded-cyber-2xl transition-all duration-300 group-hover:scale-[1.01]">
      <div className={`inline-flex p-3 rounded-cyber-lg bg-gradient-to-br ${color} mb-4 shadow-lg`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      
      <h3 className="text-white font-semibold mb-2 group-hover:text-[var(--cyber-pink-secondary)] transition-colors">
        {title}
      </h3>
      
      <p className="text-white/70 text-sm leading-relaxed">
        {description}
      </p>
    </div>
  </div>
);

export default ComingSoonPage;
