# 📊 Google Tag Manager Implementation Plan
# JB Alwikobra Gaming E-commerce Platform

## 🎯 **Objectives**
- Track all user interactions for Google Ads optimization
- Implement Enhanced E-commerce tracking
- Monitor conversion funnel performance
- Track both guest and authenticated user behavior
- Optimize for gaming account sales & rental campaigns

## 📋 **Container Setup Requirements**

### 1. **GTM Container Configuration**
```
Container Name: JB Alwikobra E-commerce
Container Type: Web
Account: [Your Google Account]
```

### 2. **Core Tags to Configure**

#### **A. Google Analytics 4 (GA4)**
- **Tag Type:** Google Analytics: GA4 Configuration
- **Measurement ID:** G-4K6YY64XKN
- **Enhanced E-commerce:** Enabled
- **Custom Dimensions:**
  - user_type (authenticated/guest)
  - product_category (mobile_legends/pubg/free_fire/genshin_impact)
  - transaction_type (purchase/rental)
  - payment_method
  - flash_sale_status

#### **B. Google Ads Conversion Tracking**
- **Tag Type:** Google Ads Conversion Tracking
- **Conversion ID:** AW-XXXXXXXXX
- **Conversion Labels:**
  - Purchase: AW-XXXXXXXXX/xxxxx
  - Rental: AW-XXXXXXXXX/xxxxx
  - Sign Up: AW-XXXXXXXXX/xxxxx
  - Add to Wishlist: AW-XXXXXXXXX/xxxxx

### 3. **Custom Variables**

#### **Built-in Variables (Enable These)**
- Page URL
- Page Title
- Referrer
- User Agent
- Random Number
- Container Version
- Debug Mode

#### **User-Defined Variables**
```javascript
// User Authentication Status
Variable Name: user_auth_status
Type: Custom JavaScript
Value: function() {
  return localStorage.getItem('auth_user') ? 'authenticated' : 'guest';
}

// Current Product ID
Variable Name: current_product_id
Type: Data Layer Variable
Data Layer Variable Name: product_id

// Transaction Value
Variable Name: transaction_value
Type: Data Layer Variable
Data Layer Variable Name: value

// Product Category
Variable Name: product_category
Type: Data Layer Variable
Data Layer Variable Name: item_category

// User ID (for authenticated users)
Variable Name: user_id
Type: Custom JavaScript
Value: function() {
  var user = localStorage.getItem('auth_user');
  return user ? JSON.parse(user).id : undefined;
}
```

### 4. **Triggers**

#### **Page View Triggers**
- **All Pages:** Page View - All Pages
- **Home Page:** Page URL contains "/"
- **Product Detail:** Page URL contains "/products/"
- **Flash Sale:** Page URL contains "/flash-sales"
- **Checkout:** Page URL contains "/payment"
- **Auth Pages:** Page URL contains "/auth"

#### **Custom Event Triggers**
- **Product View:** Custom Event - product_view
- **Add to Wishlist:** Custom Event - add_to_wishlist
- **Remove from Wishlist:** Custom Event - remove_from_wishlist
- **Purchase Intent:** Custom Event - begin_checkout
- **Purchase Complete:** Custom Event - purchase
- **Rental Complete:** Custom Event - rental_complete
- **User Registration:** Custom Event - sign_up
- **User Login:** Custom Event - login

### 5. **Enhanced E-commerce Events**

#### **Required DataLayer Events**
```javascript
// Page View
gtag('config', 'GA_MEASUREMENT_ID', {
  page_title: document.title,
  page_location: window.location.href,
  user_id: user_id,
  custom_map: {
    'custom_parameter_1': 'user_type'
  }
});

// View Item (Product Detail)
gtag('event', 'view_item', {
  currency: 'IDR',
  value: product_price,
  items: [{
    item_id: product_id,
    item_name: product_name,
    item_category: product_category,
    price: product_price,
    quantity: 1
  }]
});

// Add to Wishlist
gtag('event', 'add_to_wishlist', {
  currency: 'IDR',
  value: product_price,
  items: [{
    item_id: product_id,
    item_name: product_name,
    item_category: product_category,
    price: product_price
  }]
});

// Begin Checkout
gtag('event', 'begin_checkout', {
  currency: 'IDR',
  value: total_value,
  transaction_type: 'purchase', // or 'rental'
  items: [{
    item_id: product_id,
    item_name: product_name,
    item_category: product_category,
    price: product_price,
    quantity: 1
  }]
});

// Purchase/Rental Complete
gtag('event', 'purchase', {
  transaction_id: order_id,
  value: total_value,
  currency: 'IDR',
  payment_method: payment_method,
  transaction_type: transaction_type,
  items: [{
    item_id: product_id,
    item_name: product_name,
    item_category: product_category,
    price: product_price,
    quantity: 1
  }]
});

// User Registration
gtag('event', 'sign_up', {
  method: 'phone' // or 'email'
});

// User Login
gtag('event', 'login', {
  method: login_method
});
```

## 🎮 **Gaming-Specific Custom Events**

### **Game Category Tracking**
```javascript
// Track game category views
gtag('event', 'view_item_list', {
  item_list_id: 'game_category',
  item_list_name: game_category_name, // mobile_legends, pubg, etc.
  items: products_array
});

// Flash Sale Events
gtag('event', 'view_promotion', {
  promotion_id: 'flash_sale',
  promotion_name: 'Flash Sale',
  items: promoted_items
});

// Rental vs Purchase Selection
gtag('event', 'select_content', {
  content_type: 'transaction_type',
  content_id: transaction_type, // 'purchase' or 'rental'
  item_id: product_id
});
```

## 💰 **Revenue Tracking**

### **Purchase Conversion**
```javascript
// Google Ads Purchase Conversion
gtag('event', 'conversion', {
  send_to: 'AW-XXXXXXXXX/purchase-conversion-label',
  value: purchase_amount,
  currency: 'IDR',
  transaction_id: order_id
});
```

### **Rental Conversion**
```javascript
// Google Ads Rental Conversion
gtag('event', 'conversion', {
  send_to: 'AW-XXXXXXXXX/rental-conversion-label',
  value: rental_amount,
  currency: 'IDR',
  transaction_id: rental_id
});
```

## 🔧 **Implementation Steps**

1. **Create GTM Container** - Set up new container in GTM dashboard
2. **Configure Base Tags** - GA4, Google Ads tracking
3. **Set Up Variables** - Custom variables for user data, product info
4. **Create Triggers** - Page views, custom events
5. **Install GTM Code** - Add container snippet to HTML
6. **Implement DataLayer** - Add tracking events throughout React app
7. **Test & Validate** - Use GTM Preview mode and GA Real-time reports
8. **Publish Container** - Deploy tracking configuration

## 📈 **Key Metrics to Track**

### **E-commerce Metrics**
- Revenue (Total, by game category, by transaction type)
- Conversion Rate (Purchase vs Rental)
- Average Order Value
- Product Performance
- Flash Sale Performance

### **User Engagement**
- Page Views by Category
- Time on Product Pages
- Wishlist Addition Rate
- Authentication Conversion
- User Journey Flow

### **Google Ads Optimization**
- Cost per Acquisition (CPA)
- Return on Ad Spend (ROAS)
- Conversion Rate by Campaign
- Revenue per Click
- Game Category Performance

## 🎯 **Campaign Optimization Data**

This setup will provide Google Ads with:
- **Audience Segments:** Based on game preferences, user behavior
- **Conversion Data:** Purchase/rental completion tracking
- **Product Performance:** Which games/accounts perform best
- **User Journey:** How users navigate from ads to purchase
- **Revenue Attribution:** Which campaigns drive actual sales

## 📱 **Mobile & Cross-Device Tracking**

- **User ID Tracking:** Link authenticated user sessions
- **Cross-Device Conversion:** Track mobile-to-desktop conversions
- **App-like Behavior:** Track PWA interactions
- **WhatsApp Integration:** Track WhatsApp contact events