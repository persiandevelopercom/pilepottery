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

`/products` opens with a pinned, scroll-scrubbed story of the featured pieces (falling back to the first three when none are flagged), then the complete filterable archive. No product records or image files are modified. Each chapter reuses that product's existing `image`, name, description and price, and still links into the existing detail page.

Desktop (RTL) mirrors the split: copy on the right (~40%), the photograph as a floating print on the left (~60%). Scroll progress drives a GSAP timeline — the print turns, drifts and scales, then rushes forward until it fills the viewport while the next chapter slides up over it. Chapter fields move from warm paper to burnt clay to kiln black, and the fixed header inverts with them. A `01 / 02 / 03` rail sits on the right edge. Below the story, every product is revealed with a staggered clip and zooms on hover.

`plugins/scroll.client.ts` is client-only. It registers ScrollTrigger and runs Lenis from the GSAP ticker. The page creates its ScrollTriggers inside `gsap.matchMedia()` and reverts them, plus the archive tween, on unmount. Viewports under 900px stack the copy above the photograph and scrub a short fade. `prefers-reduced-motion` keeps the chapters in normal flow, skips the archive clip, and leaves scrolling native. Test with `npx nuxi typecheck` and `npm run build`.
