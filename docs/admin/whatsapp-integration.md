# WhatsApp Settings Admin Panel Guide

## Overview
The WhatsApp Settings panel provides a comprehensive interface for managing WhatsApp notifications and integrations.

## Access
Navigate to: **Admin Panel → Settings → WhatsApp** or `/admin/whatsapp`

## Features

### 1. Provider Status Dashboard
Real-time monitoring of:
- **Connection Status**: Shows if WooWA service is connected
- **Active Groups**: Number of available WhatsApp groups
- **Provider Info**: Current provider details (WooWA/NotifAPI)
- **API Usage**: Total requests and last activity

### 2. API Key Management
- **View Current Key**: See active API key with masked display
- **Update Key**: Change WooWA API key instantly
- **Copy to Clipboard**: One-click copy functionality
- **Usage Statistics**: Track API calls and last used timestamp

**How to Update API Key:**
1. Get new API key from [WooWA Dashboard](https://notifapi.com/dashboard)
2. Paste into "New API Key" field
3. Click "Update API Key"
4. System will validate and apply immediately

### 3. Group Discovery
- **Auto-fetch Groups**: Click "Reload Groups" to discover all available WhatsApp groups
- **Visual Selection**: Click any group card to set as default
- **Quick Apply**: Selected group applies to all empty configurations

**Discovered Groups Show:**
- Group name (e.g., "ORDERAN WEBSITE ✅")
- Group ID (e.g., "120363405729592501@g.us")

### 4. Notification Routing Configuration

Configure specific groups for different notification types:

#### Purchase Orders
- Notifications when customers complete game account purchases
- Shows order details, customer info, action items

#### Rental Orders  
- Notifications for rental payments
- Includes rental duration and verification requirements

#### Flash Sales
- Notifications for flash sale purchases
- Special urgency indicators

#### General Notifications
- System alerts and announcements
- Catch-all for other notification types

**Configuration Options:**
- Select specific group from dropdown
- Leave empty to use default fallback group
- Visual confirmation shows selected group name

### 5. Default Fallback Group
- Set primary group ID for notifications
- Used when specific configurations are not set
- Can be typed manually or selected from discovered groups

### 6. Message Testing
- **Target Group**: Override default for test
- **Custom Message**: Write test message content
- **Send Test**: Instantly sends to selected/default group
- Confirms delivery in admin panel

## Best Practices

### API Key Security
✅ Keep API key secure - never share publicly  
✅ Rotate keys periodically for security  
✅ Test after updating to ensure connectivity  

### Group Configuration
✅ Use specific groups for clear organization  
✅ Set descriptive group names in WhatsApp  
✅ Test each configuration after changes  

### Testing Workflow
1. Update configuration
2. Save changes
3. Send test message to verify
4. Check WhatsApp group for delivery
5. Adjust if needed

## Troubleshooting

### Groups Not Loading
**Problem**: "Reload Groups" shows 0 groups  
**Solution**:
1. Check API key is valid
2. Ensure WooWA service is active (scan QR if needed)
3. Verify WhatsApp bot is admin in groups

### Test Messages Not Arriving
**Problem**: Test message sent but not received  
**Solution**:
1. Confirm group ID is correct
2. Check bot is member of target group
3. Verify API key hasn't expired
4. Review API usage count (check rate limits)

### Configuration Not Saving
**Problem**: Changes revert after save  
**Solution**:
1. Check admin authentication is valid
2. Verify database connection
3. Look for error messages in panel
4. Try refreshing page and saving again

### API Key Update Fails
**Problem**: "Invalid API key" or update error  
**Solution**:
1. Copy key carefully (no extra spaces)
2. Verify key is from correct WooWA account
3. Ensure key hasn't been revoked
4. Check WooWA dashboard for key status

## Configuration Examples

### Single Group for All (Simple Setup)
```
Default Fallback: 120363405729592501@g.us
Purchase Orders: (empty - uses default)
Rental Orders: (empty - uses default)
Flash Sales: (empty - uses default)
General: (empty - uses default)
```

### Separate Groups by Type (Advanced)
```
Default Fallback: 120363405729592501@g.us (general)
Purchase Orders: 120363123456789012@g.us
Rental Orders: 120363987654321098@g.us
Flash Sales: 120363456789012345@g.us
General: 120363405729592501@g.us
```

## Integration with Payment System

The WhatsApp system automatically sends notifications when:

1. **Purchase Order Paid**
   - Triggers: Xendit webhook with COMPLETED status
   - Sends to: Customer phone + Purchase Orders group
   - Contains: Order ID, product, amount, action items

2. **Rental Order Paid**
   - Triggers: Xendit webhook with COMPLETED status
   - Sends to: Customer phone + Rental Orders group
   - Contains: Duration, verification requirements

3. **Flash Sale Purchase**
   - Triggers: Flash sale order completion
   - Sends to: Customer phone + Flash Sales group
   - Contains: Countdown urgency, limited stock info

## API Endpoints Used

- `GET /api/admin-whatsapp` - Fetch current configuration
- `PUT /api/admin-whatsapp` - Update settings or API key
- `GET /api/admin-whatsapp-groups` - Discover WhatsApp groups
- `POST /api/xendit/webhook?testGroupSend=1` - Send test message

## Security Notes

🔒 **Authentication**: Requires valid admin session token  
🔒 **Authorization**: Only admin users can access  
🔒 **Rate Limiting**: API calls are rate-limited by provider  
🔒 **Audit Trail**: All changes logged to whatsapp_message_logs  

## Support

For issues or questions:
- Check Vercel logs for detailed error messages
- Review whatsapp_message_logs table for delivery status
- Contact WooWA support for API key or service issues
- Check #support channel for known issues

## Changelog

### v2.0 - January 2026
- ✨ Added API key management UI
- ✨ Live group discovery and selection
- ✨ Visual group routing configuration
- ✨ Real-time status monitoring
- ✨ Enhanced test message functionality
- 🐛 Fixed import path issues in Vercel
- 🐛 Fixed COMPLETED status recognition
- 🧹 Cleaned up test scripts

### v1.0 - December 2025
- Initial WhatsApp settings panel
- Basic group configuration
- Test message sending
