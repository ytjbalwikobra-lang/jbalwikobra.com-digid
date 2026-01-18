// Dev-only mock endpoints for CRA dev server
// This allows testing Admin WhatsApp Settings locally without Vercel serverless
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  // In development, register mock endpoints for /api/admin-whatsapp and /api/admin
  if (process.env.NODE_ENV !== 'production') {
    // Mock in-memory settings storage
    let mockSettings = {
      id: 1,
      site_name: 'JB ALWIKOBRA',
      contact_email: 'jbalwikobra@gmail.com',
      whatsapp_number: '+6281234567890',
      hero_button_url: 'https://www.alwikobra.com',
      topup_game_url: 'https://www.alwikobrastore.com',
      whatsapp_channel_url: 'https://whatsapp.com/channel/0029VaZgVaZGOj9tyv9b8Y0E',
      jual_akun_whatsapp_url: 'https://www.alwikobra.com',
      logo_url: null,
      favicon_url: null,
      updated_at: new Date().toISOString()
    };

    // Mock admin API endpoint
    app.get('/api/admin', (req, res) => {
      const action = req.query.action;
      
      if (action === 'settings') {
        console.log('🔧 Mock API: GET settings');
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(JSON.stringify({ 
          data: mockSettings 
        }));
        return;
      }
      
      // Default response for other actions
      res.setHeader('Content-Type', 'application/json');
      res.status(400).send(JSON.stringify({ error: 'unsupported_action', action }));
    });

    app.post('/api/admin', (req, res) => {
      const action = req.query.action;
      
      if (action === 'update-settings') {
        let buf = '';
        req.on('data', (chunk) => (buf += chunk));
        req.on('end', () => {
          try {
            const updates = buf ? JSON.parse(buf) : {};
            console.log('🔧 Mock API: POST settings update', updates);
            
            // Update mock settings
            Object.assign(mockSettings, updates);
            mockSettings.updated_at = new Date().toISOString();
            
            res.setHeader('Content-Type', 'application/json');
            res.status(200).send(JSON.stringify({ 
              success: true, 
              data: mockSettings 
            }));
          } catch (e) {
            console.error('Mock API parse error:', e);
            res.setHeader('Content-Type', 'application/json');
            res.status(400).send(JSON.stringify({ error: 'parse_error' }));
          }
        });
        return;
      }
      
      // Default response for other actions
      res.setHeader('Content-Type', 'application/json');
      res.status(400).send(JSON.stringify({ error: 'unsupported_action', action }));
    });

    // In-memory mock provider and API key
    const provider = {
      id: 'dev-mock',
      name: 'dev-mock',
      display_name: 'Dev Mock Provider',
      base_url: 'https://notifapi.com',
      settings: { default_group_id: 'DEV-GROUP-ID' },
    };
    
    let mockApiKey = {
      id: 'mock-key-id',
      key_name: 'Development Key',
      api_key: 'dev-mock-api-key-placeholder',
      is_active: true,
      is_primary: true,
      usage_count: 0,
      last_used_at: null
    };

    app.get('/api/admin-whatsapp', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.status(200).send(JSON.stringify({
        provider,
        api_key: mockApiKey
      }));
    });

    const handleWrite = (req, res) => {
      let buf = '';
      req.on('data', (chunk) => (buf += chunk));
      req.on('end', () => {
        try {
          const body = buf ? JSON.parse(buf) : {};
          if (body && typeof body === 'object') {
            const { default_group_id, settings, api_key, group_configurations } = body;
            
            // Handle API key update
            if (api_key && typeof api_key === 'string' && api_key.trim()) {
              mockApiKey.api_key = api_key.trim();
              console.log('🔧 Mock API: API key updated to:', api_key.substring(0, 8) + '...');
              res.setHeader('Content-Type', 'application/json');
              res.status(200).send(JSON.stringify({ 
                success: true, 
                message: 'API key updated successfully',
                api_key: mockApiKey,
                provider,
                dev: true 
              }));
              return;
            }
            
            // Handle settings update
            if (default_group_id !== undefined) {
              provider.settings.default_group_id = default_group_id || null;
            }
            if (group_configurations !== undefined) {
              provider.settings.group_configurations = group_configurations || {};
            }
            if (settings && typeof settings === 'object') {
              Object.assign(provider.settings, settings);
            }
          }
        } catch (e) {
          console.error('🔧 Mock API: Parse error', e);
        }
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(JSON.stringify({ success: true, provider, dev: true }));
      });
    };

    app.post('/api/admin-whatsapp', handleWrite);
    app.put('/api/admin-whatsapp', handleWrite);

    // Mock list groups endpoint for local dev
    app.get('/api/admin-whatsapp-groups', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.status(200).send(JSON.stringify({
        dev: true,
        groups: [
          { id: '120363421819020887@g.us', name: 'ORDERAN WEBSITE' },
          { id: '120363421819020999@g.us', name: 'OPS SUPPORT' },
          { id: '120363421819021234@g.us', name: 'MARKETING' }
        ]
      }));
    });

    // Mock create-direct-payment endpoint for development testing
    app.post('/api/xendit/create-direct-payment', (req, res) => {
      let buf = '';
      req.on('data', (chunk) => (buf += chunk));
      req.on('end', () => {
        try {
          const body = buf ? JSON.parse(buf) : {};
          console.log('🔧 Mock Xendit API: create-direct-payment', body);
          
          // Mock successful Fixed VA response
          const mockResponse = {
            id: `mock-invoice-${Date.now()}`,
            external_id: body.external_id || `test-${Date.now()}`,
            amount: body.amount || 150000,
            currency: 'IDR',
            status: 'PENDING',
            payment_method: body.payment_method_id || 'mandiri',
            
            // Fixed VA mock data
            virtual_account_number: `8808${Date.now().toString().slice(-8)}`,
            account_number: `8808${Date.now().toString().slice(-8)}`,
            bank_code: body.payment_method_id?.toUpperCase() || 'MANDIRI',
            bank_name: body.payment_method_id?.includes('mandiri') ? 'Mandiri Virtual Account' : 
                       body.payment_method_id?.includes('bni') ? 'BNI Virtual Account' :
                       body.payment_method_id?.includes('bri') ? 'BRI Virtual Account' : 'Virtual Account',
            account_holder_name: body.customer?.given_names || 'Test Customer',
            transfer_amount: body.amount || 150000,
            fixed_va_id: `va-${Date.now()}`,
            
            // Additional fields
            expiry_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            invoice_url: `https://checkout.xendit.co/web/mock-${Date.now()}`,
            created: new Date().toISOString(),
            description: body.description || 'Mock payment for development'
          };
          
          res.setHeader('Content-Type', 'application/json');
          res.status(200).send(JSON.stringify(mockResponse));
        } catch (error) {
          console.error('🔧 Mock API Error:', error);
          res.setHeader('Content-Type', 'application/json');
          res.status(400).send(JSON.stringify({ error: 'Invalid request body' }));
        }
      });
    });

    // Minimal mock for webhook test send used by AdminWhatsAppSettingsEnhanced
    app.post('/api/xendit/webhook', (req, res) => {
      if (req.url.includes('testGroupSend')) {
        let buf = '';
        req.on('data', (chunk) => (buf += chunk));
        req.on('end', () => {
          let body = {};
          try { body = buf ? JSON.parse(buf) : {}; } catch {}
          console.log('🔧 Mock API: Test WhatsApp group message received:', body);
          res.setHeader('Content-Type', 'application/json');
          res.status(200).send(JSON.stringify({ 
            success: true, 
            dev: true, 
            messageId: `mock-msg-${Date.now()}`,
            provider: 'Mock Provider (Dev)',
            responseTime: Math.floor(Math.random() * 500) + 100,
            message: body.message || 'Test message',
            groupId: body.groupId || 'default-group'
          }));
        });
      } else {
        res.status(204).end();
      }
    });
  }

  // Attach Supabase REST proxy if env is configured
  if (process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY) {
    app.use(
      '/api',
      createProxyMiddleware({
        target: process.env.REACT_APP_SUPABASE_URL,
        changeOrigin: true,
        // Skip proxy for Xendit and admin API calls - let them be handled by local Vercel functions or mocks
        skip: function (req) {
          return req.url.startsWith('/api/xendit') || req.url.startsWith('/api/admin');
        },
        pathRewrite: (path) => {
          // 1. Remove /api prefix
          const newPath = path.replace('/api', '');

          // 2. Handle special auth routes
          if (newPath.startsWith('/auth')) {
            // e.g., /api/auth/check -> /auth/v1/user
            return newPath.replace('/auth/check', '/auth/v1/user');
          }

          // 3. Handle specific routes for banner and feed with proper table names
          if (newPath === '/banner') {
            console.log('[Proxy] Banner rewrite: /api/banner -> /rest/v1/banners');
            return '/rest/v1/banners';
          }

          if (newPath === '/posts' || newPath === '/feed') {
            console.log('[Proxy] Feed rewrite: /api/posts or /api/feed -> /rest/v1/feed_posts');
            return '/rest/v1/feed_posts';
          }

          // Products
          if (newPath === '/products') {
            console.log('[Proxy] Products rewrite: /api/products -> /rest/v1/products');
            return '/rest/v1/products';
          }

          // 4. Handle standard Supabase REST routes
          console.log(`[Proxy] Default rewrite: /api${newPath} -> /rest/v1${newPath}`);
          return `/rest/v1${newPath}`;
        },
        onProxyReq: (proxyReq, req) => {
          // Supabase requires an API key for all requests
          proxyReq.setHeader('apikey', process.env.REACT_APP_SUPABASE_ANON_KEY);
          proxyReq.setHeader('Authorization', `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`);
          console.log(`[Proxy] Rewriting ${req.url} to ${proxyReq.path}`);
        },
        headers: {
          apikey: process.env.REACT_APP_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        logLevel: 'debug',
      })
    );
  } else {
    console.warn('[Proxy] REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY not set - Supabase proxy disabled');
  }
};