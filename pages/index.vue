<script setup lang="ts">
import type { Product } from '../shared'

const pieces = [
  { slug: 'mug-marble', name: 'ماگ سفید مرمری' },
  { slug: 'wall-sunflower', name: 'دیوارکوب گل زرد' },
  { slug: 'wall-crow', name: 'بشقاب دیوارکوب کلاغ' },
  { slug: 'clock-butterfly', name: 'ساعت دیواری پروانه' },
  { slug: 'wall-rose', name: 'دیوارکوب گل سرخ' },
  { slug: 'shot-trio-ridged', name: 'ست سه‌تایی شات شیاردار' },
  { slug: 'shot-pair-sage-blue', name: 'ست دوتایی شات سبز و آبی' },
  { slug: 'shot-pair-clay-green', name: 'ست دوتایی شات قهوه‌ای و سبز' },
  { slug: 'ashtray-bloom', name: 'زیرسیگاری گل‌دار' },
  { slug: 'shot-tray-set', name: 'ست شات با سینی' },
  { slug: 'gift-floral-set', name: 'ست هدیه' }
]

const { data: products } = await useFetch<Product[]>('/api/products')
const cards = computed(() => pieces.map(piece => {
  const product = products.value?.find(item => item.slug === piece.slug)
  return { slug: piece.slug, name: product?.name || piece.name, image: product?.image || '' }
}))

const gl = ref<HTMLCanvasElement | null>(null)
const cta = ref<HTMLElement | null>(null)
const track = ref<HTMLElement | null>(null)
const walkQuery = '(min-width: 901px) and (prefers-reduced-motion: no-preference)'
let stopWalk: (() => void) | undefined
let generation = 0

async function syncWalk(tries = 0) {
  const on = window.matchMedia(walkQuery).matches
  if (!on) {
    generation += 1
    stopWalk?.()
    stopWalk = undefined
    return
  }
  if (!gl.value || !track.value) {
    if (tries < 12) requestAnimationFrame(() => syncWalk(tries + 1))
    return
  }
  if (stopWalk) return
  const token = ++generation
  const { mountGallery } = await import('../utils/gallery.js')
  if (token !== generation || !gl.value || !track.value) return
  const names: Record<string, string> = {}
  const images: Record<string, string> = {}
  for (const product of products.value || []) {
    names[product.slug] = product.name
    images[product.slug] = product.image
  }
  stopWalk = await mountGallery({ canvas: gl.value, cta: cta.value, track: track.value, names, images })
}

let media: MediaQueryList | undefined
function onMotionChange() { syncWalk() }

onMounted(() => {
  media = window.matchMedia(walkQuery)
  media.addEventListener('change', onMotionChange)
  syncWalk()
})

onBeforeUnmount(() => {
  generation += 1
  media?.removeEventListener('change', onMotionChange)
  stopWalk?.()
  stopWalk = undefined
})

useSeoMeta({
  title: 'پیله پاتری | گالری',
  description: 'گالری پیله پاتری؛ هر قطعه یک قصه و هر قصه برای شماست.'
})
</script>

<template>
  <div class="home">
    <section class="walk" aria-label="گالری">
      <ClientOnly>
        <canvas ref="gl" class="gl" />
      </ClientOnly>
      <div class="vignette" aria-hidden="true" />
      <header class="walk-bar">
        <div class="walk-brand">پیله پاتری</div>
        <nav class="walk-nav" aria-label="منوی گالری">
          <NuxtLink to="/" class="on">گالری</NuxtLink>
          <NuxtLink to="/products">فروشگاه</NuxtLink>
          <NuxtLink to="/#story">درباره‌ی ما</NuxtLink>
          <NuxtLink to="/#contact">ارتباط</NuxtLink>
        </nav>
        <div class="walk-lang" dir="ltr">FA</div>
      </header>
      <div ref="cta" class="walk-cta">
        <h2>هر قطعه، روایتی از خاک</h2>
        <p>پایان بازدید</p>
        <NuxtLink to="/products">مشاهده‌ی همه‌ی آثار</NuxtLink>
      </div>
      <div ref="track" class="walk-track" />
    </section>

    <section class="fallback" aria-label="آثار پیله پاتری">
      <img class="fallback-logo" src="/gallery/img/logo.png" alt="نشان پیله پاتری" />
      <p class="fallback-slogan">هر قطعه یک قصه و هر قصه برای شماست</p>
      <p class="fallback-slogan">نبوغ در سادگی‌ست</p>
      <div class="fallback-grid">
        <NuxtLink v-for="card in cards" :key="card.slug" :to="'/products/' + card.slug" class="fallback-card">
          <img v-if="card.image" :src="card.image" :alt="card.name" />
          <span>{{ card.name }}</span>
        </NuxtLink>
      </div>
      <NuxtLink to="/products" class="fallback-cta">مشاهده‌ی همه‌ی آثار</NuxtLink>
    </section>
  </div>
</template>

<style scoped>
.home { background: #e8e4de; color: #2f3a45; font-family: Farhang, Vazirmatn, sans-serif; }
.walk { display: none; }
.gl { position: fixed; inset: 0; width: 100vw; height: 100vh; display: block; z-index: 0; }
.vignette { position: fixed; inset: 0; z-index: 1; pointer-events: none; background: radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(40, 36, 32, .18) 100%); }
.walk-bar { position: fixed; top: 0; left: 0; right: 0; z-index: 2; height: 64px; display: flex; align-items: center; justify-content: space-between; padding: 0 48px; }
.walk-bar::after { content: ""; position: absolute; left: 48px; right: 48px; bottom: 0; height: 1px; background: rgba(47, 58, 69, .25); }
.walk-brand { font-weight: 500; font-size: 24px; }
.walk-nav { display: flex; gap: 44px; font-weight: 300; font-size: 15px; }
.walk-nav .on { color: #a88a6a; }
.walk-lang { font-weight: 300; font-size: 13px; }
.walk-cta { position: fixed; left: 24%; top: 52%; z-index: 2; transform: translate(-50%, -50%); text-align: center; opacity: 0; pointer-events: none; color: #2f3a45; }
.walk-cta h2 { font-weight: 300; font-size: 40px; margin: 0 0 10px; }
.walk-cta p { font-size: 16px; color: #70543a; margin: 0 0 28px; }
.walk-cta a { display: inline-block; padding: 14px 38px; border: 1px solid #be9c68; color: #5d4428; background: rgba(244, 240, 233, .55); font-size: 18px; }
.walk-track { height: 1400vh; }
.fallback { display: block; background: #f2ede6; color: #2f3a45; padding: 48px 22px 72px; text-align: center; }
.fallback-logo { width: 92px; height: auto; margin: 12px auto 28px; }
.fallback-slogan { font-weight: 300; font-size: clamp(28px, 6vw, 40px); line-height: 1.7; margin: 0 auto 8px; max-width: 16em; }
.fallback-slogan + .fallback-slogan { margin-bottom: 36px; }
.fallback-slogan::after { content: ""; display: block; width: 72px; height: 2px; margin: 14px auto 0; background: #a88a6a; }
.fallback-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 12px; text-align: right; }
.fallback-card { color: inherit; }
.fallback-card img { width: 100%; aspect-ratio: 1; object-fit: cover; background: #e6e4e0; }
.fallback-card span { display: block; margin-top: 8px; font-size: 14px; font-weight: 400; }
.fallback-cta { display: inline-block; margin-top: 36px; padding: 14px 28px; border: 1px solid #a88a6a; color: #5d4428; font-size: 16px; }
@media (min-width: 901px) and (prefers-reduced-motion: no-preference) {
  .walk { display: block; }
  .fallback { display: none; }
}
@media (min-width: 700px) {
  .fallback-grid { grid-template-columns: repeat(3, 1fr); gap: 28px 18px; }
}
</style>
