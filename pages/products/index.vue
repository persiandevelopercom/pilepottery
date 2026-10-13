<script setup lang="ts">
import { ArrowLeft, MoveDown } from 'lucide-vue-next'
import type { Product } from '../../shared'
import { categories, categoryName, formatPrice } from '../../shared'

type Tone = { bg: string; ink: string; soft: string; dark: boolean }
type GSAP = typeof import('gsap').gsap

// Clay, kiln, and paper — the same family as the brand, pushed far enough
// that each chapter reads as its own room.
const tones: Tone[] = [
  { bg: '#f3ece4', ink: '#2b231e', soft: '#6d645c', dark: false },
  { bg: '#8e4030', ink: '#fbf6f1', soft: '#f6ddd4', dark: true },
  { bg: '#14110f', ink: '#f6f1ea', soft: '#d0c6bb', dark: true },
  { bg: '#e7dfd4', ink: '#2b231e', soft: '#6d645c', dark: false },
  { bg: '#5e5348', ink: '#f8f3ec', soft: '#e4d9ce', dark: true },
  { bg: '#a56a45', ink: '#fff8f2', soft: '#f8e4d4', dark: true }
]
const asides = ['HANDMADE', 'FIRED CLAY', 'QUIET FORM', 'THE TABLE', 'WITH CARE', 'IN STUDIO']

const route = useRoute()
const { data: products } = await useFetch<Product[]>('/api/products')
const pieces = computed<Product[]>(() => products.value || [])
const featured = computed<Product[]>(() => {
  const marked = pieces.value.filter((product: Product) => product.featured)
  return marked.length ? marked : pieces.value.slice(0, 3)
})
const selected = computed(() => typeof route.query.category === 'string' ? route.query.category : 'all')
const filtered = computed<Product[]>(() => selected.value === 'all' ? pieces.value : pieces.value.filter((product: Product) => product.category === selected.value))

const story = ref<HTMLElement | null>(null)
const gallery = ref<HTMLElement | null>(null)
const activeIndex = ref(0)
const progress = ref(0)
const storyVisible = ref(true)
const pinned = ref(false)

const tone = (index: number) => tones[index % tones.length]!
const number = (index: number) => String(index + 1).padStart(2, '0')
const englishName = (key: string) => categories.find(category => category.key === key)?.english || key
const aside = computed(() => asides[activeIndex.value % asides.length] || 'HANDMADE')
const countLabel = computed(() => new Intl.NumberFormat('fa-IR').format(pieces.value.length))

let matchMedia: ReturnType<GSAP['matchMedia']> | undefined
let galleryContext: { revert: () => void } | undefined
let scrollToChapter: ((index: number) => void) | undefined
let revealGallery = () => {}
let detachMotion: (() => void) | undefined

function headerEl() {
  return document.querySelector<HTMLElement>('.site-header')
}
function paintHeader(mode: 'story' | 'solid', index = activeIndex.value) {
  const header = headerEl()
  if (!header) return
  if (mode === 'solid') {
    header.removeAttribute('data-gallery-dark')
    header.setAttribute('data-gallery-solid', 'true')
    return
  }
  header.removeAttribute('data-gallery-solid')
  if (tone(index).dark) header.setAttribute('data-gallery-dark', 'true')
  else header.removeAttribute('data-gallery-dark')
}
function setActive(index: number) {
  activeIndex.value = index
  if (storyVisible.value) paintHeader('story', index)
}
function clearHeader() {
  const header = headerEl()
  header?.removeAttribute('data-gallery-dark')
  header?.removeAttribute('data-gallery-solid')
}
function jumpTo(index: number) {
  if (scrollToChapter) scrollToChapter(index)
  else story.value?.querySelectorAll<HTMLElement>('.story-panel')[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

watch(() => route.fullPath, async () => {
  if (!import.meta.client || route.path !== '/products') return
  await nextTick()
  revealGallery()
  if (route.hash === '#collection' || typeof route.query.category === 'string') {
    const target = document.getElementById('collection')
    const scroll = useNuxtApp().$galleryScrollTo as (target: number | HTMLElement, offset?: number) => void
    if (target) scroll(target, -110)
  }
})

onMounted(async () => {
  await nextTick()
  const nuxt = useNuxtApp()
  const gsap = nuxt.$gsap as GSAP
  const ScrollTrigger = nuxt.$ScrollTrigger as typeof import('gsap/ScrollTrigger').ScrollTrigger
  const galleryScrollTo = nuxt.$galleryScrollTo as (target: number | HTMLElement, offset?: number) => void
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

  featured.value.forEach((product: Product, index: number) => {
    if (!index) return
    const preload = new Image()
    preload.decoding = 'async'
    preload.src = product.image
  })

  revealGallery = () => {
    galleryContext?.revert()
    galleryContext = undefined
    if (reduced.matches || !gallery.value) return
    const cards = [...gallery.value.querySelectorAll<HTMLElement>('.clip-reveal')]
    if (!cards.length) return
    galleryContext = gsap.context(() => {
      const grid = gallery.value!.querySelector('.archive-grid') || gallery.value!
      const tween = gsap.fromTo(cards,
        { clipPath: 'inset(100% 0% 0% 0%)', opacity: 0, y: 36 },
        {
          clipPath: 'inset(0% 0% 0% 0%)',
          opacity: 1,
          y: 0,
          duration: 1.2,
          stagger: 0.1,
          ease: 'power4.out',
          scrollTrigger: { trigger: grid, start: 'top 84%', toggleActions: 'play none none reverse' }
        })
      if (grid.getBoundingClientRect().top < window.innerHeight * 0.9) tween.play()
    }, gallery.value)
  }

  const root = story.value
  if (root && featured.value.length) {
    const panels = [...root.querySelectorAll<HTMLElement>('.story-panel')]
    matchMedia = gsap.matchMedia()

    matchMedia.add('(min-width: 901px) and (prefers-reduced-motion: no-preference)', () => {
      pinned.value = true
      paintHeader('story', 0)
      const context = gsap.context(() => {
        const plateOf = (panel: HTMLElement) => panel.querySelector<HTMLElement>('.plate')!
        const photoOf = (panel: HTMLElement) => panel.querySelector<HTMLElement>('.plate img')!
        const copyOf = (panel: HTMLElement) => [...panel.querySelectorAll<HTMLElement>('.story-reveal')]
        const orbitOf = (panel: HTMLElement) => panel.querySelector<HTMLElement>('.stage-orbit')
        const rest = { rotationX: 4, rotationY: -9, rotationZ: -2.5, y: 0, xPercent: 0, scale: 1, opacity: 1, transformPerspective: 1700, transformOrigin: '50% 50%' }

        panels.forEach((panel, index) => {
          gsap.set(photoOf(panel), { scale: 1.04, transformOrigin: '50% 46%' })
          if (index === 0) gsap.set(plateOf(panel), rest)
          else {
            // The stylesheet parks later cards at translateY(101%) before JS.
            // Clear that first: GSAP otherwise records it as both yPercent and y,
            // so the card settles a full viewport too low and never covers the previous scene.
            panel.style.transform = 'none'
            gsap.set(panel, { y: 0, yPercent: 101 })
            gsap.set(plateOf(panel), { ...rest, y: 72, scale: 0.86, opacity: 0, rotationY: 16, rotationZ: 6 })
            gsap.set(copyOf(panel), { y: 42, opacity: 0 })
          }
        })

        const HOLD = 0.7
        const ZOOM = 0.9
        const PHASE = 1.28
        const anchors = [0]
        let cursor = 0
        const timeline = gsap.timeline({
          defaults: { overwrite: false },
          scrollTrigger: {
            trigger: root,
            start: 'top top',
            end: () => '+=' + Math.round(Math.max(window.innerHeight, 680) * (panels.length * 1.05 + 0.25)),
            pin: true,
            scrub: 0.6,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onEnter: () => { storyVisible.value = true; setActive(0) },
            onEnterBack: () => { storyVisible.value = true; setActive(activeIndex.value) },
            onLeave: () => { storyVisible.value = false; paintHeader('solid') },
            onLeaveBack: () => { storyVisible.value = true; setActive(0) },
            onUpdate: self => {
              progress.value = self.progress
              if (!storyVisible.value) return
              const time = self.progress * timeline.duration()
              let index = 0
              for (let i = 1; i < anchors.length; i++) {
                const previous = anchors[i - 1] ?? 0
                const next = anchors[i] ?? previous
                if (time >= previous + (next - previous) * 0.86) index = i
              }
              if (index !== activeIndex.value) setActive(index)
            }
          }
        })

        panels.forEach((panel, index) => {
          const plate = plateOf(panel)
          const photo = photoOf(panel)
          const orbit = orbitOf(panel)
          timeline.addLabel(`hold-${index}`, cursor)
          timeline.to(plate, { rotationY: 8, rotationX: -3, rotationZ: 2.4, y: -28, xPercent: -5, scale: 1.055, duration: HOLD, ease: 'none' }, `hold-${index}`)
          timeline.to(photo, { scale: 1.14, yPercent: -2.5, duration: HOLD, ease: 'none' }, `hold-${index}`)
          if (orbit) timeline.to(orbit, { rotation: 20, duration: HOLD, ease: 'none' }, `hold-${index}`)

          if (index === panels.length - 1) return
          const zoomAt = cursor + HOLD
          const zoom = `zoom-${index}`
          const strong = index === panels.length - 2
          timeline.addLabel(zoom, zoomAt)
          timeline.to(plate, {
            scale: strong ? 4.15 : 3.65,
            rotationX: 0,
            rotationY: 0,
            rotationZ: 0,
            xPercent: 0,
            y: 0,
            duration: ZOOM,
            ease: 'power2.in',
            transformPerspective: 1700
          }, zoom)
          timeline.to(photo, { scale: 1.2, duration: ZOOM, ease: 'power2.in' }, zoom)
          timeline.to(copyOf(panel), { y: -48, opacity: 0, stagger: 0.035, duration: 0.42, ease: 'power2.in' }, zoom)
          if (orbit) timeline.to(orbit, { scale: 1.35, opacity: 0, duration: 0.45, ease: 'power2.in' }, zoom)

          const next = panels[index + 1]!
          timeline.to(next, { yPercent: 0, y: 0, duration: 0.82, ease: 'power3.inOut' }, `${zoom}+=0.28`)
          timeline.to(plateOf(next), { ...rest, duration: 0.72, ease: 'power3.out' }, `${zoom}+=0.46`)
          timeline.to(copyOf(next), { y: 0, opacity: 1, stagger: 0.06, duration: 0.42, ease: 'power2.out' }, `${zoom}+=0.58`)

          cursor = zoomAt + PHASE
          timeline.addLabel(`land-${index + 1}`, cursor)
          anchors.push(cursor)
        })

        scrollToChapter = index => {
          const trigger = timeline.scrollTrigger
          if (!trigger) return
          const span = Math.max(timeline.duration(), 0.001)
          const ratio = Math.min(0.995, (anchors[index] ?? 0) / span)
          galleryScrollTo(trigger.start + (trigger.end - trigger.start) * ratio)
        }
      }, root)

      return () => {
        pinned.value = false
        context.revert()
        scrollToChapter = undefined
        paintHeader('solid')
      }
    })

    matchMedia.add('(max-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
      const context = gsap.context(() => {
        panels.forEach((panel, index) => {
          ScrollTrigger.create({
            trigger: panel,
            start: 'top 58%',
            end: 'bottom 42%',
            onEnter: () => { storyVisible.value = true; setActive(index) },
            onEnterBack: () => { storyVisible.value = true; setActive(index) },
            onLeave: () => { if (index === panels.length - 1) { storyVisible.value = false; paintHeader('solid') } }
          })
          if (!index) return
          gsap.fromTo(panel.querySelectorAll('.story-reveal, .plate'),
            { y: 32, opacity: 0 },
            { y: 0, opacity: 1, stagger: 0.05, ease: 'none', scrollTrigger: { trigger: panel, start: 'top 92%', end: 'top 46%', scrub: 0.45 } })
        })
        scrollToChapter = index => galleryScrollTo(panels[index]!, -8)
      }, root)
      return () => {
        context.revert()
        scrollToChapter = undefined
        paintHeader('solid')
      }
    })

    matchMedia.add('(prefers-reduced-motion: reduce)', () => {
      const context = gsap.context(() => {
        panels.forEach((panel, index) => {
          ScrollTrigger.create({
            trigger: panel,
            start: 'top 58%',
            end: 'bottom 42%',
            onEnter: () => { storyVisible.value = true; setActive(index) },
            onEnterBack: () => { storyVisible.value = true; setActive(index) },
            onLeave: () => { if (index === panels.length - 1) { storyVisible.value = false; paintHeader('solid') } }
          })
        })
        scrollToChapter = index => galleryScrollTo(panels[index]!, -8)
      }, root)
      return () => {
        context.revert()
        scrollToChapter = undefined
        paintHeader('solid')
      }
    })
  }

  revealGallery()
  const onMotion = () => revealGallery()
  reduced.addEventListener('change', onMotion)
  const onLoad = () => ScrollTrigger.refresh()
  window.addEventListener('load', onLoad, { once: true })
  document.fonts?.ready.then(() => ScrollTrigger.refresh()).catch(() => {})
  detachMotion = () => {
    reduced.removeEventListener('change', onMotion)
    window.removeEventListener('load', onLoad)
  }

  if (route.hash === '#collection' || typeof route.query.category === 'string') {
    const target = document.getElementById('collection')
    if (target) requestAnimationFrame(() => galleryScrollTo(target, -110))
  }
})

onBeforeUnmount(() => {
  matchMedia?.revert()
  galleryContext?.revert()
  detachMotion?.()
  scrollToChapter = undefined
  pinned.value = false
  clearHeader()
})

useSeoMeta({
  title: 'فروشگاه | پیله پاتری',
  description: 'مجموعه‌ی سفال‌های دست‌ساز پیله پاتری؛ ماگ، شات، ست، پک هدیه، ساعت و دیوارکوب.'
})
</script>

<template>
  <div class="story-page">
    <div v-if="featured.length" ref="story" class="story-viewport" aria-label="روایت تصویری محصولات">
      <article
        v-for="(product, index) in featured"
        :key="product.id"
        class="story-panel"
        :data-chapter="number(index)"
        :style="{ '--tone': tone(index).bg, '--ink': tone(index).ink, '--soft': tone(index).soft, zIndex: index + 1 }"
        :inert="pinned && activeIndex !== index ? true : undefined"
        :aria-label="`${number(index)} — ${product.name}`"
      >
        <div class="story-copy">
          <p class="story-kicker story-reveal" dir="ltr"><span>PILE POTTERY</span><i></i><span>STUDIO OBJECTS</span></p>
          <div class="story-main">
            <p class="story-index story-reveal" dir="ltr"><span>{{ number(index) }}</span><i></i><span>{{ number(featured.length - 1) }}</span></p>
            <p class="story-en story-reveal" dir="ltr">{{ englishName(product.category) }}</p>
            <h1 v-if="index === 0" class="story-title story-reveal" :class="{ 'is-long': product.name.length > 14 }">{{ product.name }}</h1>
            <h2 v-else class="story-title story-reveal" :class="{ 'is-long': product.name.length > 14 }">{{ product.name }}</h2>
            <p class="story-text story-reveal">{{ product.description }}</p>
            <p class="story-price story-reveal">{{ formatPrice(product.price) }} <small>تومان</small></p>
            <NuxtLink :to="'/products/' + product.slug" class="story-cta story-reveal">
              <span>کشف این قطعه</span>
              <ArrowLeft :size="18" :stroke-width="1.4" />
            </NuxtLink>
          </div>
          <p class="story-foot story-reveal" dir="ltr"><span>{{ categoryName(product.category) }}</span><span>HANDCRAFTED IN IRAN</span></p>
        </div>
        <div class="story-stage">
          <span class="stage-index" aria-hidden="true">{{ number(index) }}</span>
          <span class="stage-orbit" aria-hidden="true"></span>
          <NuxtLink class="plate" :to="'/products/' + product.slug" :aria-label="'دیدن ' + product.name">
            <img
              :src="product.image"
              alt=""
              :loading="index === 0 ? 'eager' : 'lazy'"
              :fetchpriority="index === 0 ? 'high' : 'low'"
              decoding="async"
            />
          </NuxtLink>
          <p class="stage-caption" dir="ltr"><span>{{ englishName(product.category) }}</span> — handmade</p>
        </div>
      </article>
    </div>

    <nav
      v-if="featured.length > 1"
      class="story-progress"
      :class="{ 'is-light': tone(activeIndex).dark, 'is-hidden': !storyVisible }"
      aria-label="حرکت بین محصولات"
    >
      <span class="progress-aside" dir="ltr">{{ aside }}</span>
      <span class="progress-track" aria-hidden="true"><span class="progress-fill" :style="{ transform: `scaleY(${Math.max(progress, 0.04)})` }"></span></span>
      <span class="progress-nums">
        <button
          v-for="(product, index) in featured"
          :key="product.id"
          type="button"
          :class="{ active: activeIndex === index }"
          :aria-current="activeIndex === index ? 'step' : undefined"
          :aria-label="`رفتن به ${number(index)}، ${product.name}`"
          @click="jumpTo(index)"
        >
          <i class="progress-dash"></i>
          <span>{{ number(index) }}</span>
        </button>
      </span>
    </nav>

    <section v-if="featured.length" class="exhale">
      <span class="exhale-mark" aria-hidden="true">✳</span>
      <p>هر قطعه، یک قصه.<br>هر قصه، برای شما.</p>
      <span class="exhale-en" dir="ltr">THE ARCHIVE CONTINUES</span>
      <MoveDown :size="22" :stroke-width="1.2" />
    </section>

    <section ref="gallery" class="archive" aria-label="گالری همه محصولات">
      <div class="container">
        <div class="archive-head">
          <div>
            <span class="archive-kicker" dir="ltr">THE COMPLETE COLLECTION / {{ String(pieces.length).padStart(2, '0') }} PIECES</span>
            <h2>همه‌ی <em>قصه‌ها</em> اینجاست.</h2>
            <p>نگاهی نزدیک‌تر به تمام قطعه‌های دست‌ساز پیله پاتری.</p>
          </div>
          <span class="archive-count" dir="ltr">{{ countLabel }}</span>
        </div>
        <div class="filter-row">
          <div class="filter-tabs">
            <NuxtLink to="/products#collection" :class="{ active: selected === 'all' }">همه‌ی محصولات</NuxtLink>
            <NuxtLink v-for="category in categories" :key="category.key" :to="`/products?category=${category.key}#collection`" :class="{ active: selected === category.key }">{{ category.name }}</NuxtLink>
          </div>
          <span class="result-count">{{ filtered.length }} محصول</span>
        </div>
        <div id="collection" v-if="filtered.length" class="product-grid archive-grid">
          <div v-for="product in filtered" :key="product.id" class="clip-reveal">
            <ProductCard :product="product" />
          </div>
        </div>
        <div v-else class="empty-state">هنوز محصولی در این دسته قرار نگرفته است.</div>
        <NuxtLink to="/" class="back-home">بازگشت به خانه <ArrowLeft :size="18" /></NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.story-page {
  --serif: 'Markazi Text', Georgia, serif;
  background: #f3ece4;
  color: #2b231e;
}
.story-viewport {
  position: relative;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: #f3ece4;
}
.story-panel {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: 40% 60%;
  background: var(--tone);
  color: var(--ink);
  overflow: hidden;
}
.story-panel + .story-panel {
  transform: translateY(101%);
  box-shadow: 0 -42px 60px rgba(16, 10, 8, 0.28);
}
.story-copy {
  grid-column: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
  padding: clamp(108px, 13vh, 148px) clamp(124px, 9vw, 168px) 34px clamp(22px, 2.4vw, 42px);
}
.story-stage { grid-column: 2; }
.story-kicker,
.story-foot,
.story-index,
.story-en,
.stage-caption,
.archive-kicker,
.exhale-en {
  direction: ltr;
}
.story-kicker,
.story-foot {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin: 0;
  font: 10px/1.4 Georgia, serif;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--soft);
  white-space: nowrap;
}
.story-kicker { justify-content: flex-end; }
.story-kicker i,
.story-index i {
  display: block;
  width: 36px;
  height: 1px;
  background: currentColor;
  opacity: 0.55;
}
.story-main { margin-block: auto; padding-block: 22px; }
.story-index {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin: 0 0 18px;
  font: 13px/1 Georgia, serif;
  letter-spacing: 0.16em;
  color: var(--soft);
}
.story-en {
  margin: 0 0 8px;
  font: 12px/1 Georgia, serif;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  text-align: right;
  color: var(--soft);
}
.story-title {
  margin: 0;
  max-width: 8em;
  font-family: var(--serif);
  font-weight: 500;
  font-size: clamp(68px, 6.5vw, 112px);
  line-height: 1.02;
  letter-spacing: -0.03em;
  text-wrap: balance;
}
.story-title.is-long {
  max-width: none;
  font-size: clamp(42px, 4.3vw, 72px);
  line-height: 1.18;
}
.story-text {
  max-width: 36em;
  margin: 18px 0 0;
  font-size: 15px;
  line-height: 2.05;
  color: var(--soft);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.story-price {
  margin: 22px 0 0;
  font-size: 18px;
  letter-spacing: 0.01em;
}
.story-price small { font-size: 12px; margin-inline-start: 4px; }
.story-cta {
  min-width: 214px;
  min-height: 54px;
  margin-top: 26px;
  padding: 0 22px;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  border: 1px solid color-mix(in srgb, var(--ink) 72%, transparent);
  border-radius: 999px;
  font-size: 14px;
  transition: background-color 0.35s ease, color 0.35s ease;
}
.story-cta svg { transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1); }
.story-cta:hover { background: var(--ink); color: var(--tone); }
.story-cta:hover svg { transform: translateX(-5px); }
.story-cta:focus-visible,
.story-progress button:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 4px;
}
.story-stage {
  position: relative;
  display: grid;
  place-items: center;
  min-width: 0;
  overflow: visible;
}
.stage-index {
  position: absolute;
  font-family: Georgia, serif;
  font-size: clamp(160px, 20vw, 320px);
  line-height: 0.8;
  letter-spacing: -0.06em;
  color: var(--ink);
  opacity: 0.055;
  user-select: none;
  pointer-events: none;
}
.stage-orbit {
  position: absolute;
  width: min(78%, 680px);
  aspect-ratio: 1;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--ink) 18%, transparent);
  pointer-events: none;
}
.plate {
  position: relative;
  z-index: 1;
  width: min(78%, 68vh);
  aspect-ratio: 1;
  display: block;
  overflow: hidden;
  background: color-mix(in srgb, var(--ink) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--ink) 18%, transparent);
  box-shadow: 0 34px 70px rgba(22, 12, 8, 0.28);
  transform: perspective(1700px) rotateX(4deg) rotateY(-9deg) rotateZ(-2.5deg);
  will-change: transform;
}
.plate img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  will-change: transform;
}
.stage-caption {
  position: absolute;
  z-index: 1;
  bottom: 34px;
  left: 8%;
  margin: 0;
  font: italic 13px/1 Georgia, serif;
  letter-spacing: 0.04em;
  color: var(--soft);
}
.stage-caption span { font-style: normal; letter-spacing: 0.16em; text-transform: uppercase; font-size: 10px; margin-inline-end: 6px; }
.story-progress {
  position: fixed;
  z-index: 45;
  top: 50%;
  right: 22px;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 16px;
  color: #2b231e;
  transition: color 0.4s ease, opacity 0.4s ease;
}
.story-progress.is-light { color: #f6f1ea; }
.story-progress.is-hidden { opacity: 0; pointer-events: none; }
.progress-aside {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  font: 10px/1 Georgia, serif;
  letter-spacing: 0.34em;
  text-transform: uppercase;
  opacity: 0.72;
}
.progress-track {
  position: relative;
  width: 1px;
  align-self: stretch;
  background: color-mix(in srgb, currentColor 28%, transparent);
}
.progress-fill {
  position: absolute;
  inset: 0 auto 0 0;
  width: 1px;
  background: currentColor;
  transform-origin: top center;
}
.progress-nums { display: flex; flex-direction: column; gap: 16px; }
.progress-nums button {
  border: 0;
  background: none;
  color: inherit;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
  opacity: 0.38;
  font: 11px/1 Georgia, serif;
  letter-spacing: 0.14em;
}
.progress-nums button.active,
.progress-nums button:hover { opacity: 1; }
.progress-dash {
  display: block;
  width: 18px;
  height: 1px;
  background: currentColor;
  transform: scaleX(0.35);
  transform-origin: right center;
  transition: transform 0.35s ease;
}
.progress-nums button.active .progress-dash { transform: scaleX(1); }
.exhale {
  min-height: 88vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
  background: #efe6da;
  color: #2b231e;
  padding: 80px 20px;
}
.exhale-mark { color: var(--rust); font-size: 22px; }
.exhale p {
  margin: 8px 0 12px;
  font-family: var(--serif);
  font-size: clamp(48px, 6vw, 92px);
  font-weight: 500;
  line-height: 1.2;
}
.exhale-en {
  font: 11px/1 Georgia, serif;
  letter-spacing: 0.28em;
  color: #7a7068;
}
.exhale svg { margin-top: 18px; color: var(--rust); }
.archive {
  background: var(--paper);
  padding: 120px 0 110px;
  min-height: 100vh;
}
.archive-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 48px;
}
.archive-kicker {
  display: block;
  text-align: right;
  font: 11px/1 Georgia, serif;
  letter-spacing: 0.22em;
  color: var(--rust);
}
.archive-head h2 {
  margin: 12px 0 0;
  font-family: var(--serif);
  font-weight: 500;
  font-size: clamp(60px, 7vw, 108px);
  line-height: 1.05;
}
.archive-head h2 em { font-style: normal; color: var(--rust); }
.archive-head p { margin: 10px 0 0; color: var(--muted); font-size: 15px; }
.archive-count {
  font-family: var(--serif);
  font-size: clamp(72px, 8vw, 120px);
  line-height: 0.8;
  color: #ddd6cc;
}
.filter-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 42px;
}
.filter-tabs { display: flex; gap: 26px; overflow-x: auto; white-space: nowrap; }
.filter-tabs a {
  font-size: 13px;
  color: var(--muted);
  padding: 12px 0 16px;
  border-bottom: 2px solid transparent;
}
.filter-tabs a:hover,
.filter-tabs a.active { color: var(--ink); border-bottom-color: var(--rust); }
.result-count { font-size: 12px; color: var(--muted); white-space: nowrap; }
.archive-grid { row-gap: 64px; }
#collection { scroll-margin-top: 110px; }
.clip-reveal { min-width: 0; }
.clip-reveal :deep(.product-image-wrap img) { transition: transform 0.9s cubic-bezier(0.16, 1, 0.3, 1); }
.clip-reveal :deep(.product-image-wrap:hover img) { transform: scale(1.08); }
.back-home {
  display: flex;
  align-items: center;
  gap: 12px;
  width: max-content;
  margin: 72px auto 0;
  border-bottom: 1px solid var(--rust);
  padding-bottom: 8px;
  font-size: 14px;
  color: var(--olive);
}
@media (max-width: 1100px) {
  .story-copy { padding-right: 96px; padding-left: 18px; }
  .story-title { font-size: clamp(54px, 6vw, 84px); }
  .progress-aside { display: none; }
  .plate { width: min(82%, 58vh); }
}
@media (max-width: 900px) {
  .story-viewport { height: auto; overflow: visible; }
  .story-panel,
  .story-panel + .story-panel {
    position: relative;
    inset: auto;
    display: flex;
    flex-direction: column;
    min-height: 100svh;
    height: auto;
    transform: none;
    box-shadow: none;
  }
  .story-copy {
    order: 1;
    padding: 108px 24px 12px;
    min-height: 0;
  }
  .story-foot { display: none; }
  .story-title { font-size: clamp(56px, 14vw, 84px); }
  .story-title.is-long { font-size: clamp(38px, 9vw, 56px); }
  .story-text { font-size: 14px; -webkit-line-clamp: 3; }
  .story-stage {
    order: 2;
    min-height: 68vw;
    flex: 1;
    padding: 12px 0 72px;
    overflow: hidden;
  }
  .plate {
    width: min(78%, 420px);
    transform: none;
    box-shadow: 0 22px 40px rgba(22, 12, 8, 0.22);
  }
  .stage-index { font-size: 42vw; }
  .stage-caption { bottom: 64px; left: 0; right: 0; text-align: center; white-space: nowrap; }
  .story-progress {
    top: auto;
    bottom: 16px;
    right: auto;
    left: 50%;
    transform: translateX(-50%);
    gap: 0;
    padding: 7px 8px;
    border-radius: 999px;
    background: rgba(20, 16, 14, 0.84);
    color: #f6f1ea !important;
  }
  .progress-aside,
  .progress-track,
  .progress-dash { display: none; }
  .progress-nums { flex-direction: row; gap: 2px; }
  .progress-nums button { padding: 7px 9px; font-size: 10px; }
  .archive { padding: 84px 0 80px; }
  .archive-head h2 { font-size: 64px; }
}
@media (max-width: 650px) {
  .story-copy { padding: 96px 20px 8px; }
  .story-kicker { font-size: 8px; letter-spacing: 0.14em; }
  .story-title { font-size: clamp(48px, 13vw, 68px); }
  .story-cta { min-width: 0; width: 100%; }
  .stage-caption { font-size: 11px; }
  .exhale { min-height: 62vh; }
  .exhale p { font-size: 46px; }
  .archive { padding: 68px 0 72px; }
  .archive-head { display: block; margin-bottom: 28px; }
  .archive-head h2 { font-size: 52px; }
  .archive-count { display: none; }
  .filter-row { display: block; }
  .filter-tabs { gap: 18px; }
  .result-count { display: block; padding: 10px 0; }
  .archive-grid { row-gap: 32px; }
}
@media (prefers-reduced-motion: reduce) {
  .story-viewport { height: auto; overflow: visible; }
  .story-panel,
  .story-panel + .story-panel {
    position: relative;
    inset: auto;
    height: auto;
    min-height: 100vh;
    transform: none;
    box-shadow: none;
  }
  .plate,
  .story-reveal,
  .clip-reveal,
  .stage-caption { transform: none !important; opacity: 1 !important; clip-path: none !important; }
  .story-cta,
  .story-cta svg,
  .clip-reveal :deep(.product-image-wrap img) { transition: none; }
}
@media (prefers-reduced-motion: reduce) and (min-width: 901px) {
  .story-panel,
  .story-panel + .story-panel {
    display: grid;
    grid-template-columns: 40% 60%;
  }
  .story-stage { min-height: 70vh; }
}
</style>
