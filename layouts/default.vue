<script setup lang="ts">
import { ShoppingBag, Menu, X, ArrowLeft, Instagram } from 'lucide-vue-next'
const { count } = useCart()
const mobileOpen = ref(false)
const route = useRoute()
watch(() => route.fullPath, () => { mobileOpen.value = false })
</script>
<template>
  <div class="site-shell" :class="{ 'story-shell': route.path === '/products' }">
    <div v-if="route.path !== '/products'" class="announcement">سفالی از دل خاک، برای لحظه‌های شما <span>✦</span> ارسال به سراسر ایران</div>
    <header class="site-header" :class="{ 'story-header': route.path === '/products' }">
      <div class="container header-inner">
        <NuxtLink to="/" class="brand" aria-label="پیله پاتری، صفحه اصلی"><span class="brand-mark">پیله پاتری<span class="brand-dot">.</span></span><small>PILE POTTERY STUDIO</small></NuxtLink>
        <nav class="desktop-nav" aria-label="منوی اصلی"><NuxtLink to="/">خانه</NuxtLink><NuxtLink to="/products">فروشگاه</NuxtLink><NuxtLink to="/#story">درباره‌ی پیله پاتری</NuxtLink><NuxtLink to="/#contact">ارتباط با ما</NuxtLink></nav>
        <div class="header-actions"><NuxtLink to="/cart" class="bag-link" aria-label="سبد خرید"><ShoppingBag :size="21" :stroke-width="1.6" /><span v-if="count" class="cart-badge">{{ count }}</span></NuxtLink><button class="menu-toggle" aria-label="باز کردن منو" @click="mobileOpen = !mobileOpen"><X v-if="mobileOpen" :size="24"/><Menu v-else :size="24"/></button></div>
      </div>
      <nav v-if="mobileOpen" class="mobile-nav" aria-label="منوی موبایل"><NuxtLink to="/">خانه</NuxtLink><NuxtLink to="/products">فروشگاه</NuxtLink><NuxtLink to="/#story">درباره‌ی پیله پاتری</NuxtLink><NuxtLink to="/#contact">ارتباط با ما</NuxtLink></nav>
    </header>
    <main><slot /></main>
    <footer id="contact" class="footer"><div class="container footer-top"><div class="footer-about"><NuxtLink to="/" class="brand brand-light"><span class="brand-mark">پیله پاتری<span class="brand-dot">.</span></span><small>PILE POTTERY STUDIO</small></NuxtLink><p>از خاک تا خانه؛ هر قطعه با عشق و دستانی صبور ساخته می‌شود تا گوشه‌ای از زندگی شما را گرم‌تر کند.</p></div><div class="footer-col"><h4>گشت‌وگذار</h4><NuxtLink to="/products">همه‌ی محصولات</NuxtLink><NuxtLink to="/#story">داستان ما</NuxtLink><NuxtLink to="/cart">سبد خرید</NuxtLink></div><div class="footer-col"><h4>همراه پیله پاتری باشید</h4><p>برای سفارش‌های خاص و پرسش‌های شما، از راه شبکه‌های اجتماعی کنار شما هستیم.</p><span class="social-chip"><Instagram :size="17"/> Instagram</span></div></div><div class="container footer-bottom"><span>© {{ new Date().getFullYear() }} پیله پاتری. ساخته‌شده با عشق.</span><a href="https://pilepottery.ir/" class="footer-domain" dir="ltr">pilepottery.ir</a></div></footer>
  </div>
</template>
