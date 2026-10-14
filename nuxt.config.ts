export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: false },
  css: ['@fontsource/vazirmatn/400.css', '@fontsource/vazirmatn/500.css', '@fontsource/vazirmatn/600.css', '@fontsource/vazirmatn/700.css', '@fontsource/markazi-text/500.css', '@fontsource/markazi-text/600.css', '~/assets/css/main.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'fa', dir: 'rtl' },
      title: 'پیله پاتری | سرامیک برای لحظه‌های ماندگار',
      meta: [
        { name: 'description', content: 'پیله پاتری؛ مجموعه‌ای از سرامیک‌های دست‌ساز برای لحظه‌های ساده و ماندگار زندگی.' },
        { name: 'theme-color', content: '#f5f2ee' },
        { property: 'og:site_name', content: 'پیله پاتری' },
        { property: 'og:type', content: 'website' }
      ]
    }
  }
})
