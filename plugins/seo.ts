export default defineNuxtPlugin(() => {
  const route = useRoute()
  useHead(() => ({
    link: [{ rel: 'canonical', href: 'https://pilepottery.ir' + (route.path === '/' ? '/' : route.path) }],
    meta: [{ property: 'og:url', content: 'https://pilepottery.ir' + (route.path === '/' ? '/' : route.path) }]
  }))
})
