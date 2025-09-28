# Development Webhook Setup Guide

## Cloudflared Tunnel Setup

### 1. Install Cloudflared
```bash
# macOS
brew install cloudflared

# Or download from https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
```

### 2. Start Tunnel
```bash
# Start tunnel (URL changes each time)
cloudflared tunnel --url http://localhost:3000

# For a stable URL, create a named tunnel:
cloudflared tunnel create dealforge-dev
cloudflared tunnel route dns dealforge-dev dealforge-dev.your-domain.com
cloudflared tunnel run dealforge-dev --url http://localhost:3000
```

### 3. Update Clerk Webhook Endpoint
1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **Webhooks** section
3. Update the endpoint URL to your tunnel URL:
   - Development: `https://your-tunnel-url.trycloudflare.com/api/clerk/webhook`
   - Production: `https://your-domain.com/api/clerk/webhook`

### 4. Set Webhook Secret
```bash
# Generate a webhook secret
openssl rand -base64 32

# Add to your .env.local
CLERK_WEBHOOK_SECRET=your_generated_secret_here
```

## Webhook Events to Subscribe To

Enable these events in Clerk Dashboard:
- `user.created`
- `user.updated` 
- `user.deleted`
- `organization.created`
- `organization.updated`
- `organization.deleted`
- `organizationMembership.created`
- `organizationMembership.updated`
- `organizationMembership.deleted`
- `organizationInvitation.accepted`

## Testing Webhooks

### 1. Test with ngrok (alternative to cloudflared)
```bash
# Install ngrok
brew install ngrok

# Start tunnel
ngrok http 3000

# Use the https URL in Clerk webhook settings
```

### 2. Verify Webhook Delivery
```bash
# Check webhook logs in Clerk Dashboard
# Or monitor your server logs for webhook events
```

### 3. Test Events
1. Create a new user in Clerk Dashboard
2. Create an organization
3. Add a member to the organization
4. Check Supabase tables for mirrored data

## Troubleshooting

### Webhook Not Receiving Events
- Check tunnel is running and accessible
- Verify webhook URL in Clerk Dashboard
- Check webhook secret matches
- Ensure webhook events are enabled

### Webhook Signature Verification Fails
- Verify `CLERK_WEBHOOK_SECRET` matches Clerk Dashboard
- Check webhook endpoint is using the correct secret

### Database Errors
- Run migrations: `20240927_team_view_and_one_org_per_user.sql`
- Run vendor/competitor indexes: `20250127_add_vendor_competitor_indexes.sql`
- Check foreign key constraints

## Production Setup

For production, use a stable domain instead of tunnels:
1. Deploy your app to a hosting service
2. Set up a custom domain
3. Update Clerk webhook to use your production domain
4. Ensure `CLERK_WEBHOOK_SECRET` is set in production environment


