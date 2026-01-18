# 🎯 Step 6: Create Additional GTM Tags for Key Events

✅ **You have:** Basic page view tracking working
🎯 **Next:** Add tags for purchases, product views, wishlist, etc.

Your React app is now sending these events to dataLayer:
- `view_item` (when viewing products)
- `purchase` (when completing purchase) 
- `add_to_wishlist` (when adding to wishlist)
- `begin_checkout` (when starting checkout)
- `sign_up` (when registering)
- `login` (when logging in)

Now create GTM tags to capture these events and send them to Google Analytics.

## 📊 **Create These Additional Tags in GTM:**

### **Tag 2: Purchase Event**
1. **Click "Add a new tag"** in GTM
2. **Tag Name:** "GA4 Event - Purchase"
3. **Tag Type:** "Google Analytics: GA4 Event"
4. **Measurement ID:** `G-4K6YY64XKN`
5. **Event Name:** `purchase`
6. **Trigger:** Click "+" → Create new trigger:
   - **Trigger Name:** "Purchase Event"
   - **Trigger Type:** "Custom Event"
   - **Event Name:** `purchase`
   - **Save**
7. **Save the tag**

### **Tag 3: Product View Event**
1. **Click "Add a new tag"** in GTM
2. **Tag Name:** "GA4 Event - Product View"
3. **Tag Type:** "Google Analytics: GA4 Event"
4. **Measurement ID:** `G-4K6YY64XKN`
5. **Event Name:** `view_item`
6. **Trigger:** Click "+" → Create new trigger:
   - **Trigger Name:** "Product View Event"
   - **Trigger Type:** "Custom Event"
   - **Event Name:** `view_item`
   - **Save**
7. **Save the tag**

### **Tag 4: Add to Wishlist Event**
1. **Click "Add a new tag"** in GTM
2. **Tag Name:** "GA4 Event - Add to Wishlist"
3. **Tag Type:** "Google Analytics: GA4 Event"
4. **Measurement ID:** `G-4K6YY64XKN`
5. **Event Name:** `add_to_wishlist`
6. **Trigger:** Click "+" → Create new trigger:
   - **Trigger Name:** "Add to Wishlist Event"
   - **Trigger Type:** "Custom Event"
   - **Event Name:** `add_to_wishlist`
   - **Save**
7. **Save the tag**

### **Tag 5: User Registration Event**
1. **Click "Add a new tag"** in GTM
2. **Tag Name:** "GA4 Event - Sign Up"
3. **Tag Type:** "Google Analytics: GA4 Event"
4. **Measurement ID:** `G-4K6YY64XKN`
5. **Event Name:** `sign_up`
6. **Trigger:** Click "+" → Create new trigger:
   - **Trigger Name:** "Sign Up Event"
   - **Trigger Type:** "Custom Event"
   - **Event Name:** `sign_up`
   - **Save**
7. **Save the tag**

### **Tag 6: Begin Checkout Event**
1. **Click "Add a new tag"** in GTM
2. **Tag Name:** "GA4 Event - Begin Checkout"
3. **Tag Type:** "Google Analytics: GA4 Event"
4. **Measurement ID:** `G-4K6YY64XKN`
5. **Event Name:** `begin_checkout`
6. **Trigger:** Click "+" → Create new trigger:
   - **Trigger Name:** "Begin Checkout Event"
   - **Trigger Type:** "Custom Event"
   - **Event Name:** `begin_checkout`
   - **Save**
7. **Save the tag**

## 🚀 **After Creating All Tags:**

1. **Click "Submit"** in GTM (top right)
2. **Add a version name:** "E-commerce Tracking Setup"
3. **Click "Publish"**

## 🧪 **Test Your Tracking:**

### **Method 1: GTM Preview Mode**
1. In GTM, click **"Preview"** button
2. Enter your website URL: `http://localhost:3000` (or your live site)
3. Navigate your site and see events firing in the GTM debug panel

### **Method 2: Browser Console**
1. Open your website
2. Press **F12** → Console tab
3. Type: `dataLayer` and press Enter
4. You should see events being tracked

### **Method 3: Google Analytics Real-Time**
1. Go to your Google Analytics dashboard
2. **Reports** → **Real-time** → **Events**
3. Navigate your site and watch events appear

## 📱 **Events You Should See:**

✅ **page_view** - When you visit any page
✅ **view_item** - When you visit a product detail page
✅ **begin_checkout** - When you click "Beli Sekarang"
✅ **purchase** - When payment is initiated
✅ **add_to_wishlist** - When you add to wishlist
✅ **sign_up** - When you complete registration
✅ **login** - When you log in

## 🎯 **Next Steps:**

Once you confirm these events are working:
1. **Set up Google Ads conversion tracking**
2. **Create custom audiences in GA4**
3. **Set up enhanced e-commerce reports**
4. **Launch your Google Ads campaigns**

Let me know when you've created these tags and we can test them!