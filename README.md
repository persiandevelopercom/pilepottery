# پیله پاتری — Pile Pottery

A Persian RTL, server-rendered Nuxt 3 pottery storefront with a product gallery, cart, SQLite-backed admin dashboard, image uploads and ZarinPal payment request/verification.

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

Open the local URL shown by Nuxt. The admin area is at `/admin/login`. **Local development only:** if `ADMIN_PASSWORD` is empty, the preview login is `admin` / `atelier-demo-2026`. In production there is **no fallback login**.

## Production settings

The planned public domain is `https://pilepottery.ir/`. Point its DNS and HTTPS hosting to the deployed app before enabling payments.

Set `ADMIN_USERNAME`, a strong `ADMIN_PASSWORD`, a random `SESSION_SECRET` of at least 32 characters, `SITE_URL` (the public HTTPS origin), and `ZARINPAL_MERCHANT_ID` (36-character merchant UUID). Optionally set `ZARINPAL_SANDBOX=true` while testing. Without a valid merchant ID and HTTPS site URL, checkout intentionally refuses payment requests. The payment amount is sent as **IRT (toman)** explicitly, matching the storefront prices. The browser never supplies the payable amount or the verification amount; the server uses its own order record. The callback URL is `SITE_URL/api/payments/callback` and must be reachable from ZarinPal. Verify your account's gateway settings and perform a sandbox/real transaction before going live.

The SQLite database and uploaded images live under `DATA_DIR` (default: `.data/`); mount this directory on persistent storage and back it up. Deploy as a persistent Node server (`npm run build && node .output/server/index.mjs`), not a stateless serverless function. A single server instance is recommended for this setup. Prices are in toman; shipping is arranged separately and **not** included in checkout total. The initial six products and all artwork are illustrative placeholders. The site has been renamed to «پیله پاتری» and is prepared for pilepottery.ir; replace the illustrative photos, prices, descriptions and text-only wordmark with the actual brand assets before launch.

Admin users can add/edit/archive products, upload a cover photo and up to eight gallery photos for each product, review payment statuses (including manual recheck when a callback is missed) and change fulfillment stages on paid orders. Payment status cannot be manually marked paid. Inventory is reserved for 45 minutes during checkout, returned on failure/expiry, and checked again if a late verified callback arrives. An unavailable stock item after a late payment is flagged for manual review. Refunds, automated shipping rates, transactional messaging and automatic background reconciliation are not included. Pending payments can be rechecked manually in the admin panel.

## Security note

`npm audit` currently flags transitive advisories in the Nuxt 3 toolchain (including packages pulled in by Nuxt devtools); `npm audit fix` does not provide a non-breaking resolution. Keep the runtime/framework dependencies updated and review advisories before a production launch. Never expose the local preview login in production.


## Scroll-driven product gallery

`/products` presents the existing catalogue as a full-screen editorial sequence on desktop, followed by the complete filterable product grid. No product records or image files are modified by this gallery. The stage uses the existing `product.image` path (PNG/WebP files also work as transparent cutouts), and product links still open the existing detail and purchase flow.

The client-only `plugins/scroll.client.ts` registers GSAP/ScrollTrigger and drives Lenis from the GSAP ticker (lerp 0.08). `pages/products/index.vue` owns its ScrollTriggers through GSAP matchMedia contexts and reverts them when the route unmounts. Desktop chapters use a pinned, scrubbed timeline; mobile chapters use simple in-flow reveals; reduced-motion visitors get the in-flow layout and native scrolling. The final grid reveal is disabled for reduced motion. Test with `npx nuxi typecheck` and `npm run build`.
