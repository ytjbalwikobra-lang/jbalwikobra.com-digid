// Cookie Consent Manager - ISO 27001 A.18.1.4 Compliance
// Handles user consent for analytics and marketing cookies
(function() {
  'use strict';
  
  var CONSENT_KEY = 'jba_cookie_consent';
  var CONSENT_VERSION = '1.0';
  
  // Check if consent was already given
  function getConsent() {
    try {
      var stored = localStorage.getItem(CONSENT_KEY);
      if (stored) {
        var parsed = JSON.parse(stored);
        if (parsed.version === CONSENT_VERSION) {
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  }
  
  // Save consent
  function saveConsent(analytics, marketing) {
    var consent = {
      version: CONSENT_VERSION,
      analytics: analytics,
      marketing: marketing,
      timestamp: new Date().toISOString()
    };
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    } catch (e) {}
    return consent;
  }
  
  // Load GTM if analytics consent is given
  function loadGTM() {
    if (window.gtmLoaded) return;
    var gtmId = document.querySelector('meta[name="gtm-container-id"]');
    if (!gtmId) return;
    
    var containerId = gtmId.getAttribute('content');
    if (!containerId || containerId.indexOf('%') === 0) return;
    
    (function(w,d,s,l,i){
      w[l]=w[l]||[];
      w[l].push({'gtm.start': new Date().getTime(), event:'gtm.js'});
      var f=d.getElementsByTagName(s)[0];
      var j=d.createElement(s);
      var dl=l!='dataLayer'?'&l='+l:'';
      j.async=true;
      j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
      f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer',containerId);
    
    window.gtmLoaded = true;
  }
  
  // Create consent banner
  function createBanner() {
    var banner = document.createElement('div');
    banner.id = 'cookie-consent-banner';
    banner.innerHTML = '\
      <div style="position:fixed;bottom:0;left:0;right:0;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);color:#fff;padding:16px 20px;z-index:99999;box-shadow:0 -4px 20px rgba(0,0,0,0.3);font-family:Inter,system-ui,sans-serif;font-size:14px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;">\
        <div style="flex:1;min-width:280px;">\
          <strong style="color:#ec4899;">🍪 Kami menggunakan cookies</strong>\
          <p style="margin:4px 0 0;opacity:0.9;font-size:13px;">Untuk meningkatkan pengalaman Anda, kami menggunakan cookies analytics dan marketing. <a href="/privacy-policy" style="color:#8b5cf6;text-decoration:underline;">Kebijakan Privasi</a></p>\
        </div>\
        <div style="display:flex;gap:8px;flex-shrink:0;">\
          <button id="consent-essential" style="background:#374151;color:#fff;border:none;padding:10px 16px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;">Hanya Esensial</button>\
          <button id="consent-all" style="background:linear-gradient(135deg,#ec4899,#8b5cf6);color:#fff;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;">Terima Semua</button>\
        </div>\
      </div>';
    document.body.appendChild(banner);
    
    document.getElementById('consent-essential').onclick = function() {
      saveConsent(false, false);
      banner.remove();
    };
    
    document.getElementById('consent-all').onclick = function() {
      saveConsent(true, true);
      loadGTM();
      banner.remove();
    };
  }
  
  // Initialize
  function init() {
    var consent = getConsent();
    if (consent) {
      if (consent.analytics) {
        loadGTM();
      }
    } else {
      // Show banner after page load
      if (document.readyState === 'complete') {
        createBanner();
      } else {
        window.addEventListener('load', createBanner);
      }
    }
  }
  
  // Expose for external use
  window.CookieConsent = {
    getConsent: getConsent,
    saveConsent: saveConsent,
    loadGTM: loadGTM,
    showBanner: createBanner
  };
  
  init();
})();
