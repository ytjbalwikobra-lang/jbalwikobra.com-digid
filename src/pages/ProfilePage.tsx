import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Phone, 
  ShoppingBag, 
  Heart, 
  Settings, 
  LogOut, 
  Edit,
  ChevronRight,
  Package,
  Star,
  Trophy,
  Crown,
  Shield,
  Zap,
  Check,
  X
} from 'lucide-react';
import PhoneInput from '../components/PhoneInput';
import { AuthRequired } from '../components/ProtectedRoute';
import { useAuth } from '../contexts/TraditionalAuthContext';
import { useWishlist } from '../contexts/WishlistContext';
import { useConfirmation } from '../components/ConfirmationModal';
import { useToast } from '../components/Toast';
import { supabase } from '../services/supabase';
import { PNSection, PNContainer, PNCard, PNHeading, PNText, PNButton } from '../components/ui/PinkNeonDesignSystem';
import { getCurrentUserProfile } from '../services/authService';

interface UserProfile {
  name: string;
  email: string;
  whatsapp: string;
  joinDate: string;
  totalOrders: number;
  wishlistCount: number;
}

interface RecentOrder {
  id: string;
  amount: number;
  status: 'pending' | 'paid' | 'completed' | 'cancelled';
  created_at: string;
  payment_channel?: string | null;
}

const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { wishlistItems } = useWishlist();
  const { confirm } = useConfirmation();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<UserProfile>({
    name: user?.name || '',
    email: user?.email || '',
    whatsapp: user?.phone || '',
    joinDate: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('id-ID') : new Date().toLocaleDateString('id-ID'),
    totalOrders: 0,
    wishlistCount: wishlistItems.length
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isValidPhone, setIsValidPhone] = useState(false);

  const handleLogout = async () => {
    const confirmed = await confirm({
      title: 'Konfirmasi Logout',
      message: 'Yakin ingin keluar dari akun Anda?',
      type: 'warning',
      confirmText: 'Ya, Keluar',
      cancelText: 'Batal',
      showCancel: true
    });

    if (confirmed) {
      await logout();
      showToast('Berhasil logout', 'success');
      navigate('/');
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // Update wishlist count when wishlistItems change
  useEffect(() => {
    setProfile(prev => ({
      ...prev,
      wishlistCount: wishlistItems.length
    }));
  }, [wishlistItems]);

  // Fetch real order count when user is available
  useEffect(() => {
    const fetchOrderData = async () => {
      if (!user || !supabase) return;
      
      try {
        // Fetch order count
        const { count, error: countError } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);
          
        if (!countError && count !== null) {
          setProfile(prev => ({
            ...prev,
            totalOrders: count
          }));
        }

        // Fetch recent orders (last 3)
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('id, amount, status, created_at, payment_channel')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3);
          
        if (!ordersError && ordersData) {
          setRecentOrders(ordersData);
        }
      } catch (error) {
        console.error('Error fetching order data:', error);
      }
    };

    fetchOrderData();
  }, [user]);

  const loadProfile = async () => {
    try {
      // Prefer unified auth service profile (reads from user_data/user_profile consistently)
      const current = await getCurrentUserProfile();
      const name = current?.name ?? user?.name ?? '';
      const email = current?.email ?? user?.email ?? '';
      const phone = current?.phone ?? user?.phone ?? '';
      setProfile(prev => ({
        ...prev,
        name,
        email,
        whatsapp: phone,
        joinDate: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('id-ID') : prev.joinDate
      }));
      setIsValidPhone(!!phone);
    } catch (e) {
      // Fallback: try legacy key if any (backward-compat)
      const legacy = localStorage.getItem('user_profile') || localStorage.getItem('userProfile');
      if (legacy) {
        try {
          const parsed = JSON.parse(legacy);
          setProfile(prev => ({ ...prev, ...parsed }));
          setIsValidPhone(!!parsed.whatsapp || !!parsed.phone);
        } catch {}
      }
    }
  };

  const saveProfile = async () => {
    if (!profile.name.trim() || !profile.email.trim()) {
      showToast('Nama dan email wajib diisi', 'error');
      return;
    }
    
    if (profile.whatsapp && !isValidPhone) {
      showToast('Silakan masukkan nomor WhatsApp yang valid', 'error');
      return;
    }

    const confirmed = await confirm({
      title: 'Simpan Perubahan',
      message: 'Yakin ingin menyimpan perubahan profil?',
      type: 'info',
      confirmText: 'Ya, Simpan',
      cancelText: 'Batal'
    });

    if (confirmed) {
      try {
        // Get session token for API authentication
        const sessionToken = localStorage.getItem('session_token');
        
        if (!sessionToken) {
          showToast('Sesi Anda telah berakhir. Silakan login kembali.', 'error');
          navigate('/auth');
          return;
        }

        // Call new API endpoint to update profile in database
        const response = await fetch('/api/auth?action=update-profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`
          },
          body: JSON.stringify({
            name: profile.name.trim(),
            email: profile.email.trim(),
            phone: profile.whatsapp || ''
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to update profile');
        }

        // Update localStorage with new data
        const userData = localStorage.getItem('user_data');
        if (userData) {
          const currentUser = JSON.parse(userData);
          const updatedUser = {
            ...currentUser,
            name: profile.name.trim(),
            email: profile.email.trim(),
            phone: profile.whatsapp || currentUser.phone
          };
          localStorage.setItem('user_data', JSON.stringify(updatedUser));
        }

        // Also update user_profile cache
        localStorage.setItem('user_profile', JSON.stringify({
          name: profile.name.trim(),
          email: profile.email.trim(),
          phone: profile.whatsapp
        }));

        setIsEditing(false);
        showToast('Profil berhasil disimpan', 'success');
        
      } catch (error: any) {
        console.error('Failed to save profile:', error);
        showToast(error.message || 'Gagal menyimpan profil. Silakan coba lagi.', 'error');
      }
    }
  };

  const profileMenuItems = [
    {
      icon: Package,
      label: 'Riwayat Pesanan',
      path: '/orders',
      count: profile.totalOrders,
      color: 'text-pink-400'
    },
    {
      icon: Heart,
      label: 'Wishlist',
      path: '/wishlist',
      count: profile.wishlistCount,
      color: 'text-pink-400'
    },
    {
      icon: Settings,
      label: 'Pengaturan',
      path: '/settings',
      color: 'text-gray-400'
    }
  ];

  return (
    <AuthRequired>
      <div className="min-h-screen bg-black text-white">
        {/* Hero header */}
        <PNSection padding="lg" className="border-b border-white/10">
          <PNContainer>
            <PNCard className="relative isolate overflow-hidden p-6 sm:p-8 lg:p-10">
              <div className="absolute inset-0 -z-10 pointer-events-none bg-gradient-to-br from-pink-500/5 via-purple-500/5 to-fuchsia-500/5" />
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                {/* User */}
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-pink-500 to-fuchsia-600 rounded-2xl flex items-center justify-center shadow-xl shadow-pink-500/25">
                      <User size={36} className="text-white" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center ring-4 ring-black/40">
                      <Check size={14} className="text-white" />
                    </div>
                  </div>
                  <div>
                    <PNHeading level={1} className="mb-1">{profile.name || 'Pengguna Baru'}</PNHeading>
                    <PNText className="flex items-center gap-2"><Mail size={14} className="text-white/70" />{profile.email}</PNText>
                    <PNText className="text-sm flex items-center gap-2"><Star size={14} className="text-yellow-400" />Member sejak {profile.joinDate}</PNText>
                  </div>
                </div>

                <PNButton
                  variant={isEditing ? 'ghost' : 'secondary'}
                  size="lg"
                  onClick={() => setIsEditing(!isEditing)}
                  className="flex items-center gap-2"
                >
                  {isEditing ? <X size={18} /> : <Edit size={18} />}
                  {isEditing ? 'Batal' : 'Edit Profil'}
                </PNButton>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                <PNCard className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                      <Package size={18} className="text-pink-400" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{profile.totalOrders}</div>
                      <PNText className="text-sm">Pesanan</PNText>
                    </div>
                  </div>
                </PNCard>
                <PNCard className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-pink-500/20 border border-pink-400/30 flex items-center justify-center">
                      <Heart size={18} className="text-pink-400" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{profile.wishlistCount}</div>
                      <PNText className="text-sm">Wishlist</PNText>
                    </div>
                  </div>
                </PNCard>
                <PNCard className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-yellow-500/20 border border-yellow-400/30 flex items-center justify-center">
                      <Trophy size={18} className="text-yellow-400" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">0</div>
                      <PNText className="text-sm">Poin</PNText>
                    </div>
                  </div>
                </PNCard>
                <PNCard className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-400/30 flex items-center justify-center">
                      <Crown size={18} className="text-purple-400" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">Basic</div>
                      <PNText className="text-sm">Level</PNText>
                    </div>
                  </div>
                </PNCard>
              </div>
            </PNCard>
          </PNContainer>
        </PNSection>

        {/* Recent Orders Section */}
        {recentOrders.length > 0 && (
          <PNSection padding="lg" className="border-b border-white/10">
            <PNContainer>
              <PNCard className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <PNHeading level={3} className="flex items-center gap-2">
                    <Package size={20} className="text-pink-400" />
                    Pesanan Terbaru
                  </PNHeading>
                  <Link 
                    to="/orders" 
                    className="text-pink-400 hover:text-pink-300 text-sm font-medium flex items-center gap-1 transition-colors"
                  >
                    Lihat Semua
                    <ChevronRight size={16} />
                  </Link>
                </div>
                <div className="space-y-3">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-mono text-gray-300">{order.id.slice(0, 8)}...</div>
                          <div className={`text-xs px-2 py-1 rounded ${
                            order.status === 'paid' ? 'bg-green-600 text-white' :
                            order.status === 'pending' ? 'bg-yellow-600 text-white' :
                            order.status === 'completed' ? 'bg-blue-600 text-white' :
                            'bg-red-600 text-white'
                          }`}>
                            {order.status === 'paid' ? 'Lunas' :
                             order.status === 'pending' ? 'Menunggu' :
                             order.status === 'completed' ? 'Selesai' :
                             'Dibatalkan'}
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(order.created_at).toLocaleDateString('id-ID')}
                          {order.payment_channel && (
                            <span className="ml-2">
                              via {order.payment_channel.toLowerCase().replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-white">
                          Rp {Number(order.amount).toLocaleString('id-ID')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </PNCard>
            </PNContainer>
          </PNSection>
        )}

        {/* Edit form */}
        {isEditing && (
          <PNSection padding="lg" className="border-b border-white/10">
            <PNContainer>
              <PNCard className="p-6 sm:p-8">
                <PNHeading level={2} className="mb-6">Edit Informasi Profil</PNHeading>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      <User size={16} className="inline mr-2" />
                      Nama Lengkap
                    </label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile({...profile, name: e.target.value})}
                      className="w-full px-5 py-4 min-h-[52px] border-2 border-white/10 bg-black/50 text-white rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition"
                      placeholder="Masukkan nama lengkap"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      <Mail size={16} className="inline mr-2" />
                      Email
                    </label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({...profile, email: e.target.value})}
                      className="w-full px-5 py-4 min-h-[52px] border-2 border-white/10 bg-black/50 text-white rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition"
                      placeholder="Masukkan email"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      <Phone size={16} className="inline mr-2" />
                      Nomor WhatsApp
                    </label>
                    <PhoneInput
                      value={profile.whatsapp}
                      onChange={(value) => setProfile({...profile, whatsapp: value})}
                      onValidationChange={setIsValidPhone}
                      placeholder="Masukkan Nomor WhatsApp"
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 mt-8">
                  <PNButton size="lg" onClick={saveProfile} className="flex items-center justify-center gap-2">
                    <Check size={18} />
                    Simpan Perubahan
                  </PNButton>
                  <PNButton size="lg" variant="ghost" onClick={() => { setIsEditing(false); loadProfile(); }} className="flex items-center justify-center gap-2">
                    <X size={18} />
                    Batal
                  </PNButton>
                </div>
              </PNCard>
            </PNContainer>
          </PNSection>
        )}

        {/* Menu section */}
        <PNSection padding="lg" className="border-b border-white/10">
          <PNContainer>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {profileMenuItems.map((item, index) => (
                <Link
                  key={index}
                  to={item.path}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
                >
                  <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-pink-500/5 via-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${item.color} bg-opacity-20 border border-current border-opacity-20`}>
                          <item.icon size={24} />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white group-hover:text-white transition-colors">
                            {item.label}
                          </h3>
                          {item.count !== undefined && (
                            <p className="text-white/70 text-sm">{item.count} item</p>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-white/70 group-hover:text-white transition-colors transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="space-y-4 mt-8">
              <Link to="/help" className="group w-full rounded-2xl p-6 border border-white/10 bg-white/5 hover:bg-white/10 transition flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-yellow-500/20 border border-yellow-500/20 flex items-center justify-center">
                    <Shield size={20} className="text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Bantuan & Dukungan</h3>
                    <PNText className="text-sm">FAQ, Kontak Support, Panduan</PNText>
                  </div>
                </div>
                <ChevronRight size={20} className="text-white/70" />
              </Link>

              <PNButton onClick={handleLogout} variant="ghost" size="lg" className="w-full border border-red-500/40 text-red-300 hover:bg-red-500/10">
                <div className="flex items-center justify-center gap-2">
                  <LogOut size={18} />
                  Keluar dari Akun
                </div>
              </PNButton>
            </div>
          </PNContainer>
        </PNSection>
      </div>
    </AuthRequired>
  );
};

export default ProfilePage;
