# Cloudflare Email Routing — auctorum.com.mx

## Overview

Email routing for @auctorum.com.mx is handled by Cloudflare Email Routing (free tier). These are **forwards only** — there are no mailboxes. Sending FROM @auctorum.com.mx uses Resend with DKIM already configured.

## Configured Routes

| Address | Forwards to | Purpose |
|---------|-------------|---------|
| marco@auctorum.com.mx | marco's personal email | Co-founder |
| zertuche@auctorum.com.mx | zertuche's personal email | Co-founder |
| armando@auctorum.com.mx | armandofloressal@gmail.com | BDFL |
| privacidad@auctorum.com.mx | armandofloressal@gmail.com | Privacy policy contact |
| citas@auctorum.com.mx | (Resend sending-only) | Transactional emails |

## How to Add a New Route

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) > auctorum.com.mx > Email > Email Routing
2. Click "Create address"
3. Enter the custom address (e.g., `soporte@auctorum.com.mx`)
4. Set the destination email (must be verified first under "Destination addresses")
5. Save

## Important Notes

- **Receiving**: Cloudflare routes inbound emails to personal inboxes
- **Sending**: All outbound emails use Resend API (`from: citas@auctorum.com.mx`). DKIM + SPF are configured in Cloudflare DNS.
- **Reply-to**: When patients reply to appointment emails, they hit the Cloudflare forward (goes to the clinic owner's inbox via the tenant config `contact.email`)
- **Catch-all**: Not enabled — unmatched addresses bounce

## DNS Records (already configured)

```
MX   auctorum.com.mx  route1.mx.cloudflare.net  priority 69
MX   auctorum.com.mx  route2.mx.cloudflare.net  priority 30
MX   auctorum.com.mx  route3.mx.cloudflare.net  priority 86
TXT  auctorum.com.mx  v=spf1 include:_spf.mx.cloudflare.net include:amazonses.com ~all
```

Resend DKIM is via CNAME records (configured during Resend domain verification).
