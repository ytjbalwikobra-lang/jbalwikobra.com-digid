import { supabase } from './supabase';
import { WebsiteSettings } from '../types';
import { uploadFile, deletePublicUrls } from './storageService';

const DEFAULT_SETTINGS: WebsiteSettings = {
  id: 'default',
  siteName: 'JB Alwikobra',
  heroTitle: 'Jual Beli & Rental Akun Game',
  heroSubtitle: 'Aman, cepat, terpercaya',
};

export class SettingsService {
  // Small in-memory cache to minimize repeated DB fetches across the SPA session
  private static cache: { v: WebsiteSettings; t: number } | null = null;
  private static TTL = 5 * 60 * 1000; // 5 minutes

  // Method to clear cache - useful for debugging and after updates
  static clearCache(): void {
    console.log('🧹 Clearing SettingsService cache');
    this.cache = null;
  }

  // Method to force refresh settings without cache
  static async forceRefresh(): Promise<WebsiteSettings> {
    console.log('🔄 Force refreshing settings (bypassing cache)');
    this.clearCache();
    return await this.get();
  }

  // Debug method to check current cache and database state
  static async debugStatus(): Promise<void> {
    console.log('🐛 SettingsService Debug Status:');
    console.log('📦 Cache state:', this.cache ? {
      cached: true,
      age: Date.now() - this.cache.t,
      ttl: this.TTL,
      expired: (Date.now() - this.cache.t) > this.TTL
    } : { cached: false });
    
    try {
      const fresh = await this.forceRefresh();
      console.log('🌐 Fresh database data:', {
        heroButtonUrl: fresh.heroButtonUrl,
        topupGameUrl: fresh.topupGameUrl,
        whatsappChannelUrl: fresh.whatsappChannelUrl
      });
    } catch (e) {
      console.error('❌ Failed to fetch fresh data:', e);
    }
  }

  static async get(): Promise<WebsiteSettings> {
    try {
      console.log('🔍 SettingsService.get() called');
      
      // Serve from cache if fresh
      if (this.cache && Date.now() - this.cache.t < this.TTL) {
        console.log('📦 Serving from cache');
        return this.cache.v;
      }

      if (!supabase) {
        console.log('⚠️ No Supabase client, using DEFAULT_SETTINGS');
        this.cache = { v: DEFAULT_SETTINGS, t: Date.now() };
        return DEFAULT_SETTINGS;
      }
      
      // Try admin API first if we have a session token
      const sessionToken = localStorage.getItem('session_token');
      if (sessionToken) {
        console.log('🔧 Trying admin API for settings fetch');
        try {
          const response = await fetch('/api/admin?action=settings', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionToken}`
            }
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log('✅ Settings fetched via admin API');
            if (result.data) {
              // Map the database format to our interface format
              const data = result.data;
              const mappedResult: WebsiteSettings = {
                id: data.id ?? 'default',
                siteName: data.site_name ?? DEFAULT_SETTINGS.siteName,
                logoUrl: data.logo_url ?? undefined,
                faviconUrl: data.favicon_url ?? undefined,
                contactEmail: data.contact_email ?? undefined,
                supportEmail: data.support_email ?? undefined,
                contactPhone: data.contact_phone ?? undefined,
                whatsappNumber: data.whatsapp_number ?? undefined,
                address: data.address ?? undefined,
                businessHours: data.business_hours ?? undefined,
                companyDescription: data.company_description ?? undefined,
                facebookUrl: data.facebook_url ?? undefined,
                instagramUrl: data.instagram_url ?? undefined,
                tiktokUrl: data.tiktok_url ?? undefined,
                youtubeUrl: data.youtube_url ?? undefined,
                twitterUrl: data.twitter_url ?? undefined,
                heroTitle: data.hero_title ?? undefined,
                heroSubtitle: data.hero_subtitle ?? undefined,
                footerCopyrightText: data.footer_copyright_text ?? undefined,
                newsletterEnabled: data.newsletter_enabled ?? true,
                socialMediaEnabled: data.social_media_enabled ?? true,
                topupGameUrl: data.topup_game_url ?? undefined,
                whatsappChannelUrl: data.whatsapp_channel_url ?? undefined,
                heroButtonUrl: data.hero_button_url ?? undefined,
                jualAkunWhatsappUrl: data.jual_akun_whatsapp_url ?? undefined,
                updatedAt: data.updated_at ?? undefined,
              };
              
              this.cache = { v: mappedResult, t: Date.now() };
              return mappedResult;
            }
          } else {
            console.log('⚠️ Admin API failed, falling back to direct Supabase');
          }
        } catch (apiError) {
          console.log('⚠️ Admin API error, falling back to direct Supabase:', apiError);
        }
      }

      console.log('🌐 Fetching from database...');
      const { data, error } = await (supabase as any)
        .from('website_settings')
        .select('id, site_name, logo_url, favicon_url, contact_email, support_email, contact_phone, whatsapp_number, address, business_hours, company_description, facebook_url, instagram_url, tiktok_url, youtube_url, twitter_url, hero_title, hero_subtitle, footer_copyright_text, newsletter_enabled, social_media_enabled, topup_game_url, whatsapp_channel_url, hero_button_url, jual_akun_whatsapp_url, updated_at')
        .limit(1)
        .maybeSingle();
        
      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }
      
      if (!data) {
        console.log('📭 No data found, using DEFAULT_SETTINGS');
        return DEFAULT_SETTINGS;
      }
      
      console.log('✅ Database data fetched:', {
        id: data.id,
        site_name: data.site_name,
        contact_email: data.contact_email,
        whatsapp_number: data.whatsapp_number
      });
      const result: WebsiteSettings = {
        id: data.id ?? 'default',
        siteName: data.site_name ?? DEFAULT_SETTINGS.siteName,
        logoUrl: data.logo_url ?? undefined,
        faviconUrl: data.favicon_url ?? undefined,
        contactEmail: data.contact_email ?? undefined,
        supportEmail: data.support_email ?? undefined,
        contactPhone: data.contact_phone ?? undefined,
        whatsappNumber: data.whatsapp_number ?? undefined,
        address: data.address ?? undefined,
        businessHours: data.business_hours ?? undefined,
        companyDescription: data.company_description ?? undefined,
        facebookUrl: data.facebook_url ?? undefined,
        instagramUrl: data.instagram_url ?? undefined,
        tiktokUrl: data.tiktok_url ?? undefined,
        youtubeUrl: data.youtube_url ?? undefined,
        twitterUrl: data.twitter_url ?? undefined,
        heroTitle: data.hero_title ?? undefined,
        heroSubtitle: data.hero_subtitle ?? undefined,
        footerCopyrightText: data.footer_copyright_text ?? undefined,
        newsletterEnabled: data.newsletter_enabled ?? true,
        socialMediaEnabled: data.social_media_enabled ?? true,
        topupGameUrl: data.topup_game_url ?? undefined,
        whatsappChannelUrl: data.whatsapp_channel_url ?? undefined,
        heroButtonUrl: data.hero_button_url ?? undefined,
        jualAkunWhatsappUrl: data.jual_akun_whatsapp_url ?? undefined,
        updatedAt: data.updated_at ?? undefined,
      };
      
      console.log('🎯 Mapped result:', {
        siteName: result.siteName,
        contactEmail: result.contactEmail,
        whatsappNumber: result.whatsappNumber,
        businessHours: result.businessHours,
        whatsappChannelUrl: result.whatsappChannelUrl,
        topupGameUrl: result.topupGameUrl
      });
      
      this.cache = { v: result, t: Date.now() };
      return result;
    } catch (e) {
      console.error('SettingsService.get error:', e);
      return DEFAULT_SETTINGS;
    }
  }

  static async upsert(input: Partial<WebsiteSettings> & { logoFile?: File | null; faviconFile?: File | null }): Promise<WebsiteSettings | null> {
    try {
      if (!supabase) return null;
      
      // For admin operations, try to use the admin API endpoint instead of direct Supabase
      // This ensures proper authentication and permissions
      const sessionToken = localStorage.getItem('session_token');
      if (sessionToken) {
        console.log('🔧 Using admin API for settings update');
        try {
          // Transform interface format to database column names
          const dbInput: any = {};
          if ('siteName' in input) dbInput.site_name = input.siteName;
          if ('logoUrl' in input) dbInput.logo_url = input.logoUrl;
          if ('faviconUrl' in input) dbInput.favicon_url = input.faviconUrl;
          if ('contactEmail' in input) dbInput.contact_email = input.contactEmail;
          if ('supportEmail' in input) dbInput.support_email = input.supportEmail;
          if ('contactPhone' in input) dbInput.contact_phone = input.contactPhone;
          if ('whatsappNumber' in input) dbInput.whatsapp_number = input.whatsappNumber;
          if ('address' in input) dbInput.address = input.address;
          if ('businessHours' in input) dbInput.business_hours = input.businessHours;
          if ('companyDescription' in input) dbInput.company_description = input.companyDescription;
          if ('facebookUrl' in input) dbInput.facebook_url = input.facebookUrl;
          if ('instagramUrl' in input) dbInput.instagram_url = input.instagramUrl;
          if ('tiktokUrl' in input) dbInput.tiktok_url = input.tiktokUrl;
          if ('youtubeUrl' in input) dbInput.youtube_url = input.youtubeUrl;
          if ('twitterUrl' in input) dbInput.twitter_url = input.twitterUrl;
          if ('heroTitle' in input) dbInput.hero_title = input.heroTitle;
          if ('heroSubtitle' in input) dbInput.hero_subtitle = input.heroSubtitle;
          if ('footerCopyrightText' in input) dbInput.footer_copyright_text = input.footerCopyrightText;
          if ('newsletterEnabled' in input) dbInput.newsletter_enabled = input.newsletterEnabled;
          if ('socialMediaEnabled' in input) dbInput.social_media_enabled = input.socialMediaEnabled;
          if ('topupGameUrl' in input) dbInput.topup_game_url = input.topupGameUrl;
          if ('whatsappChannelUrl' in input) dbInput.whatsapp_channel_url = input.whatsappChannelUrl;
          if ('heroButtonUrl' in input) dbInput.hero_button_url = input.heroButtonUrl;
          if ('jualAkunWhatsappUrl' in input) dbInput.jual_akun_whatsapp_url = input.jualAkunWhatsappUrl;
          
          console.log('📤 Sending to admin API:', dbInput);

          const response = await fetch('/api/admin?action=update-settings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionToken}`
            },
            body: JSON.stringify(dbInput)
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log('✅ Settings updated via admin API');
            this.cache = null; // Clear cache
            return await this.get(); // Return fresh data
          } else {
            console.log('⚠️ Admin API failed, falling back to direct Supabase');
          }
        } catch (apiError) {
          console.log('⚠️ Admin API error, falling back to direct Supabase:', apiError);
        }
      }
      
      const current = await this.get();
      const payload: any = {
        site_name: input.siteName ?? current.siteName ?? null,
        contact_email: input.contactEmail ?? current.contactEmail ?? null,
        support_email: input.supportEmail ?? current.supportEmail ?? null,
        contact_phone: input.contactPhone ?? current.contactPhone ?? null,
        whatsapp_number: input.whatsappNumber ?? current.whatsappNumber ?? null,
        address: input.address ?? current.address ?? null,
        business_hours: input.businessHours ?? current.businessHours ?? null,
        company_description: input.companyDescription ?? current.companyDescription ?? null,
        facebook_url: input.facebookUrl ?? current.facebookUrl ?? null,
        instagram_url: input.instagramUrl ?? current.instagramUrl ?? null,
        tiktok_url: input.tiktokUrl ?? current.tiktokUrl ?? null,
        youtube_url: input.youtubeUrl ?? current.youtubeUrl ?? null,
        twitter_url: input.twitterUrl ?? current.twitterUrl ?? null,
        hero_title: input.heroTitle ?? current.heroTitle ?? null,
        hero_subtitle: input.heroSubtitle ?? current.heroSubtitle ?? null,
        footer_copyright_text: input.footerCopyrightText ?? current.footerCopyrightText ?? null,
        newsletter_enabled: input.newsletterEnabled ?? current.newsletterEnabled ?? true,
        social_media_enabled: input.socialMediaEnabled ?? current.socialMediaEnabled ?? true,
        topup_game_url: input.topupGameUrl ?? current.topupGameUrl ?? null,
        whatsapp_channel_url: input.whatsappChannelUrl ?? current.whatsappChannelUrl ?? null,
        hero_button_url: input.heroButtonUrl ?? current.heroButtonUrl ?? null,
        jual_akun_whatsapp_url: input.jualAkunWhatsappUrl ?? current.jualAkunWhatsappUrl ?? null,
      };
      if (input.logoFile instanceof File) {
        const result = await uploadFile(input.logoFile, 'settings');
        if (result.url) payload.logo_url = result.url;
      } else if (input.logoUrl) {
        payload.logo_url = input.logoUrl;
      }
      if (input.faviconFile instanceof File) {
        const result = await uploadFile(input.faviconFile, 'settings');
        if (result.url) payload.favicon_url = result.url;
      } else if (input.faviconUrl) {
        payload.favicon_url = input.faviconUrl;
      }
      const { data, error } = await (supabase as any)
        .from('website_settings')
        .upsert({ id: current.id === 'default' ? undefined : current.id, ...payload }, { onConflict: 'id' })
        .select()
        .maybeSingle();
      if (error) throw error;
      const row = data || payload;
  const result: WebsiteSettings = {
        id: row.id ?? current.id ?? 'default',
        siteName: row.site_name ?? current.siteName,
        logoUrl: row.logo_url ?? current.logoUrl,
        faviconUrl: row.favicon_url ?? current.faviconUrl,
        contactEmail: row.contact_email ?? current.contactEmail,
        supportEmail: row.support_email ?? current.supportEmail,
        contactPhone: row.contact_phone ?? current.contactPhone,
        whatsappNumber: row.whatsapp_number ?? current.whatsappNumber,
        address: row.address ?? current.address,
        businessHours: row.business_hours ?? current.businessHours,
        companyDescription: row.company_description ?? current.companyDescription,
        facebookUrl: row.facebook_url ?? current.facebookUrl,
        instagramUrl: row.instagram_url ?? current.instagramUrl,
        tiktokUrl: row.tiktok_url ?? current.tiktokUrl,
        youtubeUrl: row.youtube_url ?? current.youtubeUrl,
        twitterUrl: row.twitter_url ?? current.twitterUrl,
        heroTitle: row.hero_title ?? current.heroTitle,
        heroSubtitle: row.hero_subtitle ?? current.heroSubtitle,
        footerCopyrightText: row.footer_copyright_text ?? current.footerCopyrightText,
        newsletterEnabled: row.newsletter_enabled ?? current.newsletterEnabled ?? true,
        socialMediaEnabled: row.social_media_enabled ?? current.socialMediaEnabled ?? true,
        topupGameUrl: row.topup_game_url ?? current.topupGameUrl,
        whatsappChannelUrl: row.whatsapp_channel_url ?? current.whatsappChannelUrl,
        heroButtonUrl: row.hero_button_url ?? current.heroButtonUrl,
        jualAkunWhatsappUrl: row.jual_akun_whatsapp_url ?? current.jualAkunWhatsappUrl,
        updatedAt: row.updated_at ?? new Date().toISOString(),
      };
      
      console.log('✅ Settings upsert successful:', {
        id: result.id,
        heroButtonUrl: result.heroButtonUrl,
        topupGameUrl: result.topupGameUrl,
        whatsappChannelUrl: result.whatsappChannelUrl
      });
      
      // Invalidate/refresh cache
      this.cache = { v: result, t: Date.now() };
      return result;
    } catch (e) {
      console.error('SettingsService.upsert error:', e);
      // Clear cache on error to force fresh fetch next time
      this.cache = null;
      return null;
    }
  }
}

// Expose debug methods to window for easier testing in browser console
declare global {
  interface Window {
    debugSettings?: {
      clearCache: () => void;
      forceRefresh: () => Promise<WebsiteSettings>;
      debugStatus: () => Promise<void>;
    };
  }
}

if (typeof window !== 'undefined') {
  window.debugSettings = {
    clearCache: () => SettingsService.clearCache(),
    forceRefresh: () => SettingsService.forceRefresh(),
    debugStatus: () => SettingsService.debugStatus()
  };
}
