/**
 * sampleData.ts
 * Data sampel untuk development/testing ketika Supabase tidak tersedia
 */

import { Product, Tier, GameTitle } from '../../types';

export const sampleTiers: Tier[] = [
  {
    id: '1',
    name: 'Reguler',
    slug: 'reguler',
    description: 'Akun standar untuk pemula',
    color: '#C0C0C0',
    borderColor: '#D1D5DB',
    backgroundGradient: 'from-zinc-400 to-neutral-500',
    icon: 'Trophy',
    priceRangeMin: 0,
    priceRangeMax: 500000,
    isActive: true,
    sortOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Pelajar',
    slug: 'pelajar',
    description: 'Akun premium untuk pelajar',
    color: '#3b82f6',
    borderColor: '#60a5fa',
    backgroundGradient: 'from-blue-500 to-indigo-600',
    icon: 'Users',
    priceRangeMin: 500000,
    priceRangeMax: 2000000,
    isActive: true,
    sortOrder: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Premium',
    slug: 'premium',
    description: 'Akun premium terbaik',
    color: '#f59e0b',
    borderColor: '#fbbf24',
    backgroundGradient: 'from-amber-500 to-orange-600',
    icon: 'Crown',
    priceRangeMin: 2000000,
    isActive: true,
    sortOrder: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const sampleGameTitles: GameTitle[] = [
  {
    id: '1',
    name: 'Mobile Legends',
    slug: 'mobile-legends',
    description: 'MOBA terpopuler di Indonesia',
    icon: 'Sword',
    color: '#10b981',
    isPopular: true,
    isActive: true,
    sortOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'PUBG Mobile',
    slug: 'pubg-mobile',
    description: 'Battle Royale terpopuler',
    icon: 'Target',
    color: '#dc2626',
    isPopular: true,
    isActive: true,
    sortOrder: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Free Fire',
    slug: 'free-fire',
    description: 'Battle Royale ringan',
    icon: 'Zap',
    color: '#ea580c',
    isPopular: true,
    isActive: true,
    sortOrder: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const sampleProducts: Product[] = [
  {
    id: '1',
    name: 'Akun ML Sultan Mythic Glory 1000 Points',
    description: 'Akun Mobile Legends dengan rank Mythic Glory 1000 points. Semua hero unlocked, 500+ skin epic/legend. Akun aman dan terpercaya.',
    price: 2500000,
    originalPrice: 3000000,
    image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400',
    images: ['https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400'],
    tierId: '3',
    gameTitleId: '1',
    tierData: sampleTiers[2],
    gameTitleData: sampleGameTitles[0],
    categoryId: 'sample-cat-1',
    isFlashSale: true,
    flashSaleEndTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    hasRental: true,
    rentalOptions: [
      { id: '1', duration: '1 Hari', price: 150000, description: 'Akses full 24 jam' },
      { id: '2', duration: '3 Hari', price: 400000, description: 'Akses 3x24 jam + bonus coaching' },
    ],
    stock: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Akun PUBG Mobile Conqueror Asia',
    description: 'Akun PUBG Mobile rank Conqueror server Asia. KD ratio 4.5, tier rewards lengkap, senjata mythic tersedia.',
    price: 1800000,
    originalPrice: 2200000,
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400',
    images: ['https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400'],
    tierId: '2',
    gameTitleId: '2',
    tierData: sampleTiers[1],
    gameTitleData: sampleGameTitles[1],
    categoryId: 'sample-cat-1',
    isFlashSale: false,
    hasRental: true,
    rentalOptions: [
      { id: '3', duration: '1 Hari', price: 120000, description: 'Akses ranked full' },
      { id: '4', duration: '3 Hari', price: 300000, description: 'Main sepuasnya 3 hari' },
    ],
    stock: 8,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Akun Free Fire Grandmaster Ranked',
    description: 'Akun Free Fire Grandmaster dengan koleksi bundle lengkap. Pet maxed, gun skin rare, character unlocked semua.',
    price: 800000,
    originalPrice: 1000000,
    image: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400',
    images: ['https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400'],
    tierId: '2',
    gameTitleId: '3',
    tierData: sampleTiers[1],
    gameTitleData: sampleGameTitles[2],
    categoryId: 'sample-cat-1',
    isFlashSale: true,
    flashSaleEndTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    hasRental: false,
    stock: 12,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
