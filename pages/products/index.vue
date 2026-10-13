<script setup lang="ts">
import { ArrowLeft, ArrowUpLeft, MoveDown } from 'lucide-vue-next'
import type { Product } from '../../shared'
import { categories, categoryName, formatPrice } from '../../shared'

const route = useRoute()
const { data: products } = await useFetch<Product[]>('/api/products')
const pieces = computed<Product[]>(() => products.value || [])
const selected = computed(() => typeof route.query.category === 'string' ? route.query.category : 'all')
const filtered = computed(() => selected.value === 'all' ? pieces.value : pieces.value.filter((p: Product) => p.category === selected.value))

// The photographs and product records come straight from the existing catalogue.
// Only the backdrop and presentation change from chapter to chapter.
const tones = [
  { bg: '#eeeae2', ink: '#29333a', soft: '#686e6b', dark: false },
  { bg: '#b5826b', ink: '#fcf6ef', soft: '#f5e5dc', dark: true },
  { bg: '#28333b', ink: '#f6f2e9', soft: '#c5c9c7', dark: true },
  { bg: '#d7d6ce', ink: '#29333a', soft: '#6b706d', dark: false },
  { bg: '#777f76', ink: '#fffaf1', soft: '#e0e7dc', dark: true },
  { bg: '#a97762', ink: '#fffaf2', soft: '#f3e2d6', dark: true }
] as const
const tone = (index: number) => tones[index % tones.length]!
const number = (index: number) => String(index + 1).padStart(2, '0')
const transparent = (src: string) => /\.(png|webp)(?:\?|$)/i.test(src)

const story = ref<HTMLElement | null>(null)
const gallery = ref<HTMLElement | null>(null)
const activeIndex = ref(0)
const storyVisible = ref(true)
let matchMedia: ReturnType<typeof import('gsap').gsap.matchMedia> | undefined
let scrollToChapter: ((index: number) => void) | undefined

function jumpTo(index: number) {
  if (scrollToChapter) scrollToChapter(index)
  else story.value?.querySelectorAll<HTMLElement>('.story-panel')[index]?.scrollIntoView({ behavior: 'smooth' })
}

onMounted(async () => {
  await nextTick()
  if (!story.value || !pieces.value.length) return
  const { $gsap, $ScrollTrigger, $galleryScrollTo } = useNuxtApp()
  const panels = [...story.value.querySelectorAll<HTMLElement>('.story-panel')]
  const header = document.querySelector<HTMLElement>('.site-header')
  const setNav = (dark: boolean) => {
    if (dark) header?.setAttribute('data-gallery-dark', 'true')
    else header?.removeAttribute('data-gallery-dark')
  }
  const setActive = (index: number) => {
    activeIndex.value = index
    setNav(tone(index).dark)
  }
  setActive(0)

  matchMedia = $gsap.matchMedia()
  matchMedia.add('(min-width: 901px) and (prefers-reduced-motion: no-preference)', () => {
    const context = $gsap.context(() => {
      if (panels.length < 2) return
      const text = (panel: HTMLElement) => [...panel.querySelectorAll<HTMLElement>('.story-reveal')]
      const image = (panel: HTMLElement) => panel.querySelector<HTMLElement>('.stage-piece')!

      $gsap.set(panels.slice(1), { yPercent: 105 })
      $gsap.set(panels.slice(1).flatMap(text), { y: 40, opacity: 0 })
      $gsap.set(panels.slice(1).map(image), { y: 70, rotation: 8, scale: 0.86, opacity: 0.75 })

      const timeline = $gsap.timeline({
        scrollTrigger: {
          trigger: story.value,
          start: 'top top',
          end: () => `+=${(panels.length - 1) * Math.max(window.innerHeight, 650) * 1.3}`,
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onEnter: () => { storyVisible.value = true; setActive(0) },
          onEnterBack: () => { storyVisible.value = true },
          onLeave: () => { storyVisible.value = false; setNav(false) },
          onLeaveBack: () => { storyVisible.value = false; setNav(false) },
          onUpdate: self => setActive(Math.min(panels.length - 1, Math.round(self.progress * (panels.length - 1))))
        }
      })

      for (let index = 1; index < panels.length; index++) {
        const previous = panels[index - 1]!
        const incoming = panels[index]!
        const label = `chapter-${index}`
        timeline.addLabel(label)
          .to(image(previous), { scale: 1.32, rotation: -6, y: -35, opacity: 0.24, duration: 1, ease: 'power2.in' }, label)
          .to(text(previous), { y: -48, opacity: 0, stagger: 0.035, duration: 0.48, ease: 'power2.in' }, label)
          .to(incoming, { yPercent: 0, duration: 1, ease: 'power3.inOut' }, `${label}+=0.08`)
          .to(image(incoming), { y: 0, rotation: 0, scale: 1, opacity: 1, duration: 0.85, ease: 'power3.out' }, `${label}+=0.23`)
          .to(text(incoming), { y: 0, opacity: 1, stagger: 0.055, duration: 0.48, ease: 'power2.out' }, `${label}+=0.5`)
        timeline.addLabel(`land-${index}`)
      }

      scrollToChapter = (index: number) => {
        const position = index === 0 ? 0 : Math.min(0.97, timeline.labels[`land-${index}`] / timeline.duration())
        const trigger = timeline.scrollTrigger
        if (trigger) $galleryScrollTo(trigger.start + (trigger.end - trigger.start) * position)
      }
    }, story.value)
    return () => { context.revert(); scrollToChapter = undefined; setNav(false) }
  })

  matchMedia.add('(max-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
    const context = $gsap.context(() => {
      panels.forEach((panel, index) => {
        $ScrollTrigger.create({
          trigger: panel,
          start: 'top center',
          end: 'bottom center',
          onEnter: () => { storyVisible.value = true; setActive(index) },
          onEnterBack: () => { storyVisible.value = true; setActive(index) },
          onLeave: () => { if (index === panels.length - 1) { storyVisible.value = false; setNav(false) } }
        })
        if (index === 0) return
        $gsap.fromTo(panel.querySelectorAll('.story-reveal, .stage-piece'),
          { y: 35, opacity: 0 },
          { y: 0, opacity: 1, stagger: 0.06, ease: 'power2.out', scrollTrigger: { trigger: panel, start: 'top 88%', end: 'top 32%', scrub: 0.6 } })
      })
      scrollToChapter = index => $galleryScrollTo(panels[index]!)
    }, story.value)
    return () => { context.revert(); scrollToChapter = undefined; setNav(false) }
  })

  matchMedia.add('(prefers-reduced-motion: reduce)', () => {
    const context = $gsap.context(() => {
      panels.forEach((panel, index) => {
        $ScrollTrigger.create({
          trigger: panel,
          start: 'top center',
          end: 'bottom center',
          onEnter: () => { storyVisible.value = true; setActive(index) },
          onEnterBack: () => { storyVisible.value = true; setActive(index) },
          onLeave: () => { if (index === panels.length - 1) { storyVisible.value = false; setNav(false) } }
        })
      })
      scrollToChapter = index => window.scrollTo({ top: panels[index]!.getBoundingClientRect().top + window.scrollY, behavior: 'instant' })
    }, story.value)
    return () => { context.revert(); scrollToChapter = undefined; setNav(false) }
  })

  matchMedia.add('(prefers-reduced-motion: no-preference)', () => {
    if (!gallery.value) return
    const context = $gsap.context(() => {
      $gsap.fromTo('.final-card',
        { clipPath: 'inset(100% 0 0 0)', y: 30, opacity: 0 },
        { clipPath: 'inset(0% 0 0 0)', y: 0, opacity: 1, duration: 1.1, stagger: 0.1, ease: 'expo.out',
          scrollTrigger: { trigger: '.final-grid', start: 'top 85%', toggleActions: 'play none none reverse' } })
    }, gallery.value)
    return () => context.revert()
  })

  $ScrollTrigger.refresh()
  const categoryIndex = pieces.value.findIndex((p: Product) => p.category === route.query.category)
  if (categoryIndex > 0 && route.hash !== '#collection') requestAnimationFrame(() => scrollToChapter?.(categoryIndex))
})

onBeforeUnmount(() => {
  matchMedia?.revert()
  scrollToChapter = undefined
  document.querySelector('.site-header')?.removeAttribute('data-gallery-dark')
})

useSeoMeta({ title: 'فروشگاه | پیله پاتری', description: 'مجموعه‌ی سفال‌های دست‌ساز پیله پاتری؛ ماگ، شات، ست، پک هدیه، ساعت و دیوارکوب.' })
</script>

<template>
  <div class="story-page">
    <div v-if="pieces.length" ref="story" class="story-viewport" aria-label="روایت تصویری محصولات">
      <article
        v-for="(product, index) in pieces" :key="product.id"
        class="story-panel" :style="{ '--tone': tone(index).bg, '--tone-ink': tone(index).ink, '--tone-soft': tone(index).soft, zIndex: index + 1 }"
        :aria-label="`${number(index)} — ${product.name}`"
      >
        <div class="story-copy">
          <div class="story-top story-reveal"><span class="chapter-line"></span><span>PILE POTTERY / OBJECTS WITH SOUL</span></div>
          <div class="story-copy-main">
            <div class="story-number story-reveal"><span>{{ number(index) }}</span><span class="number-rule"></span><span>{{ number(pieces.length - 1) }}</span></div>
            <p class="story-category story-reveal">{{ categoryName(product.category) }}</p>
            <h1 v-if="index === 0" class="story-title story-reveal">{{ product.name }}</h1>
            <h2 v-else class="story-title story-reveal">{{ product.name }}</h2>
            <p class="story-description story-reveal">{{ product.description }}</p>
            <p class="story-price story-reveal">{{ formatPrice(product.price) }} <small>تومان</small></p>
            <NuxtLink :to="'/products/' + product.slug" class="story-cta story-reveal">کشف این قطعه <ArrowUpLeft :size="20" :stroke-width="1.4" /></NuxtLink>
          </div>
          <div class="story-bottom story-reveal"><span>ساخته‌شده با دست، برای زندگی</span><span>HANDMADE IN IRAN</span></div>
        </div>
        <div class="story-stage">
          <span class="stage-watermark" aria-hidden="true">{{ number(index) }}</span>
          <span class="stage-orbit" aria-hidden="true"></span>
          <div class="stage-piece"><div class="piece-float" :class="{ cutout: transparent(product.image) }"><img :src="product.image" :alt="product.name" :loading="index === 0 ? 'eager' : 'lazy'" :fetchpriority="index === 0 ? 'high' : undefined" /></div></div>
          <span class="stage-note">{{ categoryName(product.category) }} <span>✳</span> پیله پاتری</span>
        </div>
      </article>
    </div>

    <nav v-if="pieces.length > 1 && storyVisible" class="story-progress" :class="{ 'progress-light': tone(activeIndex).dark }" aria-label="حرکت بین محصولات">
      <button v-for="(product, index) in pieces" :key="product.id" :class="{ active: activeIndex === index }" :aria-label="`رفتن به محصول ${number(index)}: ${product.name}`" :aria-current="activeIndex === index ? 'step' : undefined" @click="jumpTo(index)"><span class="progress-line"></span>{{ number(index) }}</button>
    </nav>

    <section v-if="pieces.length" class="story-interlude" aria-hidden="true"><span>✳</span><p>هر قطعه، یک قصه. هر قصه، برای شما.</p><MoveDown :size="22" :stroke-width="1" /></section>

    <section ref="gallery" class="final-gallery" aria-label="گالری همه محصولات">
      <div class="container">
        <div class="final-heading"><div><span class="final-kicker">THE COMPLETE COLLECTION / {{ String(pieces.length).padStart(2, '0') }} PIECES</span><h2>همه‌ی <em>قصه‌ها</em> اینجاست.</h2><p>نگاهی نزدیک‌تر به تمام قطعه‌های دست‌ساز پیله پاتری.</p></div><span class="final-asterisk" aria-hidden="true">✳</span></div>
        <div class="filter-row"><div class="filter-tabs"><NuxtLink to="/products#collection" :class="{ active: selected === 'all' }">همه‌ی محصولات</NuxtLink><NuxtLink v-for="category in categories" :key="category.key" :to="`/products?category=${category.key}#collection`" :class="{ active: selected === category.key }">{{ category.name }}</NuxtLink></div><span class="result-count">{{ filtered.length }} محصول</span></div>
        <div id="collection" v-if="filtered.length" class="product-grid final-grid"><div v-for="product in filtered" :key="product.id" class="final-card"><ProductCard :product="product" /></div></div>
        <div v-else class="empty-state">هنوز محصولی در این دسته قرار نگرفته است.</div>
        <NuxtLink to="/" class="back-home">بازگشت به خانه <ArrowLeft :size="18" /></NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.story-page{--story-serif:'Markazi Text',Georgia,serif;background:var(--paper)}
.story-viewport{height:100svh;min-height:680px;position:relative;overflow:hidden;isolation:isolate}
.story-panel{position:absolute;inset:0;display:grid;grid-template-columns:40% 60%;direction:ltr;background:var(--tone);color:var(--tone-ink);overflow:hidden;will-change:transform}
.story-panel:not(:first-child){transform:translateY(105%);border-radius:24px 24px 0 0;box-shadow:0 -16px 40px #171b1d24}
.story-copy{direction:rtl;position:relative;display:flex;flex-direction:column;justify-content:space-between;padding:clamp(130px,13vh,155px) clamp(34px,5.1vw,95px) 42px clamp(25px,4vw,65px);z-index:2}
.story-top,.story-bottom{display:flex;justify-content:space-between;align-items:center;gap:12px;font:10px Georgia,serif;letter-spacing:.14em;direction:ltr;white-space:nowrap;color:var(--tone-soft)}
.story-top{justify-content:flex-end}.chapter-line{height:1px;width:30px;background:currentColor;opacity:.7}
.story-copy-main{margin-top:auto;margin-bottom:auto;padding:30px 0}
.story-number{display:flex;align-items:center;gap:15px;direction:ltr;justify-content:flex-end;font:13px Georgia,serif;letter-spacing:.08em;color:var(--tone-soft)}.number-rule{width:38px;height:1px;background:currentColor;opacity:.55}
.story-category{font-size:13px;color:var(--tone-soft);margin:25px 0 6px}.story-title{font:500 clamp(64px,7.3vw,120px)/1.12 var(--story-serif);letter-spacing:-.025em;margin:0;max-width:550px}.story-description{font-size:14px;line-height:2.25;color:var(--tone-soft);max-width:390px;margin:15px 0 23px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.story-price{font-size:18px;margin:0 0 27px}.story-price small{font-size:12px}.story-cta{border:1px solid currentColor;min-width:205px;min-height:56px;display:inline-flex;align-items:center;justify-content:space-between;gap:30px;padding:12px 18px;font-size:13px;transition:background .3s,color .3s}.story-cta:hover{background:var(--tone-ink);color:var(--tone)}
.story-stage{position:relative;display:grid;place-items:center;overflow:hidden;border-inline-start:1px solid color-mix(in srgb,var(--tone-ink) 12%,transparent)}.story-stage:before{content:"";position:absolute;inset:12% 8%;border:1px solid color-mix(in srgb,var(--tone-ink) 13%,transparent);pointer-events:none}.stage-watermark{position:absolute;font:500 clamp(240px,35vw,600px)/1 var(--story-serif);letter-spacing:-.1em;opacity:.045;transform:translateY(-3%);user-select:none}.stage-orbit{position:absolute;width:min(67%,70vh);aspect-ratio:1;border-radius:50%;border:1px solid color-mix(in srgb,var(--tone-ink) 15%,transparent);pointer-events:none}.stage-piece{width:82%;height:76%;display:grid;place-items:center;position:relative;z-index:1;will-change:transform,opacity}.piece-float{max-width:100%;max-height:100%;display:grid;place-items:center;animation:idle-float 7s ease-in-out infinite alternate}.piece-float:not(.cutout){box-shadow:0 33px 70px #171b1d38}.piece-float.cutout{filter:drop-shadow(0 32px 28px #171b1d44)}.piece-float img{display:block;width:auto;height:auto;max-width:100%;max-height:min(68vh,690px);object-fit:contain}.stage-note{position:absolute;bottom:37px;left:8%;font-size:11px;color:var(--tone-soft);letter-spacing:.04em}.stage-note span{margin:0 6px;color:var(--tone-ink)}
@keyframes idle-float{from{transform:translate3d(0,0,0)}to{transform:translate3d(0,-12px,0)}}
.story-progress{position:fixed;z-index:50;right:19px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;align-items:flex-end;gap:12px;color:#263139;transition:color .35s}.story-progress.progress-light{color:#f6f3eb}.story-progress button{border:0;background:none;color:inherit;display:flex;flex-direction:row-reverse;align-items:center;gap:9px;opacity:.43;font:11px Georgia,serif;padding:4px;direction:ltr;transition:opacity .25s}.story-progress button.active,.story-progress button:hover{opacity:1}.progress-line{width:10px;height:1px;background:currentColor;transition:width .3s}.story-progress button.active .progress-line{width:27px}
.story-interlude{min-height:53vh;background:#28333b;color:#f5f1e9;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px}.story-interlude>span{font-size:24px;color:#be9474}.story-interlude p{font:500 clamp(36px,5vw,65px)/1.3 var(--story-serif);margin:10px 0 20px}
.final-gallery{background:var(--paper);padding:115px 0 105px;min-height:100vh}.final-heading{display:flex;justify-content:space-between;align-items:center;margin-bottom:60px}.final-kicker{font:11px Georgia,serif;letter-spacing:.2em;color:var(--rust);direction:ltr;display:block;text-align:right}.final-heading h2{font:500 clamp(60px,7vw,105px)/1.2 var(--story-serif);margin:14px 0 0}.final-heading h2 em{font-style:normal;color:var(--rust)}.final-heading p{font-size:14px;color:var(--muted);margin:8px 0 0}.final-asterisk{font-size:160px;font-weight:200;color:#d4d5cd;line-height:1}.filter-row{display:flex;justify-content:space-between;align-items:center;gap:20px;border-bottom:1px solid var(--line);margin:0 0 38px}.filter-tabs{display:flex;gap:28px;overflow-x:auto;white-space:nowrap}.filter-tabs a{font-size:12px;color:var(--muted);padding:13px 0 17px;border-bottom:2px solid transparent}.filter-tabs a:hover,.filter-tabs a.active{color:var(--ink);border-bottom-color:var(--rust)}.result-count{font-size:11px;color:var(--muted);white-space:nowrap}.final-grid{row-gap:55px}.final-card{min-width:0}.back-home{display:flex;align-items:center;gap:12px;width:max-content;margin:72px auto 0;border-bottom:1px solid var(--rust);padding-bottom:9px;font-size:13px;color:var(--olive)}
@media(max-width:1100px){.story-copy{padding-left:25px;padding-right:40px}.story-title{font-size:clamp(59px,7vw,90px)}.story-progress{right:8px}.story-top,.story-bottom{font-size:8px}}
@media(max-width:900px){.story-viewport{height:auto;min-height:0;overflow:visible}.story-panel,.story-panel:not(:first-child){position:relative;inset:auto;display:flex;flex-direction:column;min-height:100svh;transform:none;border-radius:0;box-shadow:none;will-change:auto}.story-copy{padding:110px 30px 30px;min-height:48svh;flex:none}.story-top{font-size:9px}.story-copy-main{padding:17px 0}.story-category{margin-top:15px}.story-title{font-size:clamp(61px,10vw,95px);line-height:1}.story-description{font-size:13px;margin:12px 0 18px}.story-price{margin-bottom:16px}.story-bottom{display:none}.story-stage{min-height:52svh;border-inline-start:0;border-top:1px solid color-mix(in srgb,var(--tone-ink) 10%,transparent)}.story-stage:before{inset:7% 8%}.stage-piece{height:44svh;width:75%;margin:4vh auto}.piece-float img{max-height:42svh}.stage-watermark{font-size:60vw}.stage-note{bottom:16px}.story-progress{top:auto;bottom:15px;transform:none;right:10px;gap:1px;border-radius:20px;padding:7px;background:#28333bda;color:#fff!important;flex-direction:column}.story-progress button{font-size:9px;padding:2px}.story-progress .progress-line{width:5px}.story-progress button.active .progress-line{width:12px}.final-gallery{padding:80px 0}}
@media(max-width:650px){.story-copy{padding:93px 24px 24px;min-height:49svh}.story-title{font-size:clamp(55px,12vw,76px)}.story-description{-webkit-line-clamp:2;line-height:1.85}.story-cta{min-height:47px;min-width:180px}.story-top{font-size:7px}.stage-note{font-size:9px}.story-interlude{min-height:36vh}.final-gallery{padding:68px 0}.final-heading{margin-bottom:36px}.final-heading h2{font-size:57px}.final-asterisk{display:none}.filter-row{display:block}.filter-tabs{gap:20px}.result-count{display:block;padding:10px 0}.final-grid{row-gap:30px}}
@media(prefers-reduced-motion:reduce){.story-viewport{height:auto;min-height:0;overflow:visible}.story-panel,.story-panel:not(:first-child){position:relative;inset:auto;display:flex;flex-direction:column;min-height:100svh;transform:none!important;border-radius:0;box-shadow:none}.story-copy{padding:110px 30px 30px;min-height:48svh}.story-stage{min-height:52svh}.stage-piece{height:45svh}.piece-float{animation:none!important}.piece-float img{max-height:44svh}.story-reveal,.stage-piece,.final-card{transform:none!important;opacity:1!important;clip-path:none!important}*{scroll-behavior:auto!important}}
</style>
