export default defineNuxtPlugin(() => {
  const cart = useState<{ id: number; quantity: number }[]>('cart', () => [])
  onNuxtReady(() => {
  try {
    const saved = JSON.parse(localStorage.getItem('pile-cart') || '[]')
    if (Array.isArray(saved)) cart.value = saved.filter(i => Number.isSafeInteger(i.id) && Number.isSafeInteger(i.quantity) && i.quantity > 0 && i.quantity <= 20).slice(0, 30)
  } catch { /* Invalid browser storage is ignored. */ }
  watch(cart, (value: { id: number; quantity: number }[]) => localStorage.setItem('pile-cart', JSON.stringify(value)), { deep: true })
  })
})
