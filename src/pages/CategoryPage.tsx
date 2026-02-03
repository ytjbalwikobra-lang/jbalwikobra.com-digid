import React, { useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Package, Grid3X3, TrendingUp, ShoppingBag } from 'lucide-react';
import { SEOHead, Breadcrumb, ItemListSchema, WebSiteSchema } from '../components/seo';
import { PNSection, PNContainer, PNCard, PNButton, PNHeading, PNText } from '../components/ui/PinkNeonDesignSystem';
import { useCategories } from '../hooks/useCategories';
import { useProductsByCategory } from '../hooks/useProductsByCategory';
import { PNProductCard } from '../components/catalog';
import { ProductCardSkeleton } from '../components/products/ProductCardSkeleton';

// SEO-optimized descriptions for each category
const CATEGORY_SEO_CONTENT: Record<string, {
  title: string;
  description: string;
  content: string;
  benefits: string[];
}> = {
  'akun-premium': {
    title: 'Akun Premium Game',
    description: 'Beli akun premium game berkualitas dengan harga terjangkau. Akun sudah terverifikasi, aman, dan siap pakai langsung.',
    content: 'Akun premium adalah akun game dengan item-item langka, level tinggi, dan fitur eksklusif. Semua akun kami telah melalui proses verifikasi ketat untuk memastikan keamanan dan kualitas.',
    benefits: ['Item Langka & Eksklusif', 'Level Tinggi', 'Terverifikasi Aman', 'Siap Pakai Langsung']
  },
  'akun-fresh': {
    title: 'Akun Fresh Game',
    description: 'Dapatkan akun fresh game baru dengan harga murah. Akun baru, belum pernah dipakai, cocok untuk memulai dari awal.',
    content: 'Akun fresh adalah akun game baru yang belum pernah dimainkan. Cocok untuk Anda yang ingin memulai permainan dari awal dengan akun yang bersih.',
    benefits: ['Akun Baru 100%', 'Belum Pernah Dimainkan', 'Harga Terjangkau', 'Cocok untuk Pemula']
  },
  'jasa-posting': {
    title: 'Jasa Posting Game',
    description: 'Layanan jasa posting profesional untuk akun game Anda. Tim berpengalaman siap membantu meningkatkan akun Anda.',
    content: 'Layanan jasa posting kami menyediakan bantuan profesional untuk meningkatkan level, mendapatkan item, atau menyelesaikan misi di akun game Anda.',
    benefits: ['Tim Profesional', 'Proses Cepat', 'Hasil Terjamin', 'Layanan 24/7']
  },
  default: {
    title: 'Kategori Produk',
    description: 'Temukan berbagai produk game berkualitas dengan harga terbaik. Transaksi aman dan cepat.',
    content: 'Jelajahi koleksi produk kami yang beragam. Semua produk telah melalui verifikasi untuk memastikan kualitas dan keamanan.',
    benefits: ['Produk Berkualitas', 'Harga Terbaik', 'Transaksi Aman', 'Layanan Responsif']
  }
};

const CategoryPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { categories, loading: categoriesLoading } = useCategories();
  
  // Find the current category
  const category = useMemo(() => {
    if (!slug || !categories.length) return null;
    return categories.find(c => c.slug === slug);
  }, [slug, categories]);

  // Fetch products for this category
  const { products, loading: productsLoading, error: productsError } = useProductsByCategory({
    categoryId: category?.id,
    limit: 20
  });

  // Get SEO content for this category
  const seoContent = useMemo(() => {
    if (!slug) return CATEGORY_SEO_CONTENT.default;
    return CATEGORY_SEO_CONTENT[slug] || CATEGORY_SEO_CONTENT.default;
  }, [slug]);

  // Build items for schema
  const schemaItems = useMemo(() => {
    if (!products.length) return [];
    return products.map((product, index) => ({
      position: index + 1,
      name: product.name,
      url: `${window.location.origin}/products/${product.id}`,
      image: product.image,
      price: product.price,
      currency: 'IDR',
      availability: product.stock > 0 ? 'InStock' : 'OutOfStock'
    }));
  }, [products]);

  // Other categories for internal linking
  const otherCategories = useMemo(() => {
    if (!categories.length || !category) return categories.slice(0, 4);
    return categories.filter(c => c.id !== category.id).slice(0, 4);
  }, [categories, category]);

  // Loading state
  if (categoriesLoading) {
    return (
      <main className="min-h-screen bg-gray-950">
        <PNContainer>
          <PNSection padding="lg">
            <div className="animate-pulse space-y-8">
              <div className="h-10 bg-white/10 rounded-xl w-1/3" />
              <div className="h-6 bg-white/5 rounded-lg w-2/3" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            </div>
          </PNSection>
        </PNContainer>
      </main>
    );
  }

  // Category not found
  if (!category && !categoriesLoading && slug) {
    return (
      <main className="min-h-screen bg-gray-950">
        <SEOHead
          title="Kategori Tidak Ditemukan"
          description="Kategori yang Anda cari tidak ditemukan."
          noIndex
        />
        <PNContainer>
          <PNSection padding="lg" className="text-center">
            <Package size={64} className="mx-auto text-gray-600 mb-4" />
            <PNHeading level={1} className="text-white mb-4">Kategori Tidak Ditemukan</PNHeading>
            <PNText color="secondary" className="mb-6">
              Kategori yang Anda cari tidak tersedia atau telah dihapus.
            </PNText>
            <div className="flex justify-center gap-4">
              <Link to="/products">
                <PNButton variant="primary">
                  Lihat Semua Produk
                </PNButton>
              </Link>
              <Link to="/">
                <PNButton variant="secondary">
                  Kembali ke Beranda
                </PNButton>
              </Link>
            </div>
          </PNSection>
        </PNContainer>
      </main>
    );
  }

  const categoryName = category?.name || seoContent.title;
  const pageTitle = `${categoryName} - Beli Akun Game Murah | JBALWIKOBRA`;
  const pageDescription = seoContent.description;

  return (
    <main className="min-h-screen bg-gray-950">
      {/* SEO */}
      <SEOHead
        title={pageTitle}
        description={pageDescription}
        keywords={`${categoryName}, beli akun game, akun game murah, jual beli akun, marketplace game`}
        canonicalUrl={`/kategori/${slug}`}
      />
      <WebSiteSchema />
      {schemaItems.length > 0 && (
        <ItemListSchema
          name={categoryName}
          items={schemaItems}
        />
      )}

      <PNContainer>
        {/* Breadcrumb */}
        <div className="pt-4">
          <Breadcrumb
            items={[
              { label: 'Produk', href: '/products' },
              { label: categoryName, href: `/kategori/${slug}` }
            ]}
          />
        </div>

        {/* Hero Section */}
        <PNSection padding="md">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-pink-500/20 via-purple-500/10 to-transparent border border-white/10 p-6 md:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-pink-500/10 via-transparent to-transparent" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/25">
                  <Grid3X3 size={24} className="text-white" />
                </div>
                <div>
                  <PNHeading level={1} gradient className="text-2xl md:text-3xl">
                    {categoryName}
                  </PNHeading>
                  <PNText color="secondary" className="text-sm">
                    {products.length} produk tersedia
                  </PNText>
                </div>
              </div>
              <PNText color="secondary" className="max-w-2xl mb-6 leading-relaxed">
                {seoContent.content}
              </PNText>
              
              {/* Benefits */}
              <div className="flex flex-wrap gap-2">
                {seoContent.benefits.map((benefit, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300"
                  >
                    <TrendingUp size={12} className="text-pink-400" />
                    {benefit}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </PNSection>

        {/* Products Grid */}
        <PNSection padding="md">
          <div className="flex items-center justify-between mb-6">
            <PNHeading level={2} className="text-white text-xl">
              Produk {categoryName}
            </PNHeading>
            <Link 
              to={`/products?category=${category?.id || ''}`}
              className="text-sm text-pink-300 hover:text-pink-200 transition-colors flex items-center gap-1"
            >
              Lihat Semua <ChevronRight size={16} />
            </Link>
          </div>

          {productsError && (
            <PNCard className="p-6 text-center">
              <PNText color="secondary">Gagal memuat produk. Silakan coba lagi.</PNText>
              <PNButton variant="secondary" className="mt-4" onClick={() => navigate(0)}>
                Coba Lagi
              </PNButton>
            </PNCard>
          )}

          {productsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <PNCard className="p-8 text-center">
              <ShoppingBag size={48} className="mx-auto text-gray-600 mb-4" />
              <PNText color="secondary" className="mb-4">
                Belum ada produk di kategori ini.
              </PNText>
              <Link to="/products">
                <PNButton variant="primary">
                  Lihat Produk Lainnya
                </PNButton>
              </Link>
            </PNCard>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product) => {
                const mainImage = product.image || (product.images && product.images[0]) || '';
                const discountPercent = product.originalPrice && product.originalPrice > product.price
                  ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
                  : null;
                const soldChannel = (product as any).soldChannel || (product as any).sold_channel || null;
                const isSold = !!soldChannel || product.stock === 0;
                
                return (
                  <Link key={product.id} to={`/products/${product.id}`}>
                    <PNProductCard
                      id={String(product.id)}
                      title={product.name}
                      image={mainImage}
                      price={new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(product.price)}
                      rentalAvailable={Boolean(product.hasRental || product.rentalOptions?.length)}
                      discountPercent={discountPercent}
                      gameName={product.gameTitleData?.name}
                      tierName={product.tierData?.name}
                      tierSlug={product.tierData?.slug}
                      soldChannel={soldChannel}
                      stock={product.stock}
                    >
                      <PNButton 
                        variant={isSold ? "secondary" : "primary"} 
                        size="sm" 
                        fullWidth
                        disabled={isSold}
                        className={isSold ? 'opacity-50 cursor-not-allowed' : ''}
                      >
                        {isSold ? 'Tidak Tersedia' : 'Beli Sekarang'}
                      </PNButton>
                    </PNProductCard>
                  </Link>
                );
              })}
            </div>
          )}
        </PNSection>

        {/* Other Categories - Internal Linking */}
        {otherCategories.length > 0 && (
          <PNSection padding="lg">
            <PNHeading level={2} className="text-white text-xl mb-6">
              Kategori Lainnya
            </PNHeading>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {otherCategories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/kategori/${cat.slug}`}
                  className="group"
                >
                  <PNCard className="p-4 text-center hover:bg-white/10 hover:border-pink-500/30 transition-all">
                    <Grid3X3 size={24} className="mx-auto text-pink-400 mb-2 group-hover:scale-110 transition-transform" />
                    <PNText className="text-white font-medium group-hover:text-pink-300 transition-colors">
                      {cat.name}
                    </PNText>
                  </PNCard>
                </Link>
              ))}
            </div>
          </PNSection>
        )}

        {/* SEO Content Section */}
        <PNSection padding="lg">
          <article className="prose prose-invert max-w-none">
            <PNHeading level={2} className="text-white text-xl mb-4">
              Beli {categoryName} di JBALWIKOBRA
            </PNHeading>
            <div className="text-gray-400 space-y-4">
              <p>
                JBALWIKOBRA adalah marketplace terpercaya untuk jual beli akun game di Indonesia. 
                Kami menyediakan berbagai {categoryName.toLowerCase()} dengan harga terjangkau dan kualitas terjamin.
              </p>
              <p>
                Setiap produk di kategori ini telah melalui proses verifikasi ketat untuk memastikan 
                keamanan transaksi dan kepuasan pelanggan. Kami mendukung berbagai metode pembayaran 
                dan menyediakan garansi untuk setiap pembelian.
              </p>
              <p>
                Jika Anda memiliki pertanyaan tentang {categoryName.toLowerCase()}, silakan hubungi 
                tim customer service kami melalui WhatsApp yang tersedia 24/7.
              </p>
            </div>
          </article>
        </PNSection>
      </PNContainer>
    </main>
  );
};

export default CategoryPage;
