export type CartItem = { id: number; quantity: number }
export function useCart() {
  const items = useState<CartItem[]>('cart', () => [])
  const count = computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0))
  function add(id: number, max = 20) {
    const found = items.value.find(item => item.id === id)
    if (found) items.value = items.value.map(item => item.id === id ? { ...item, quantity: Math.min(max, item.quantity + 1) } : item)
    else items.value = [...items.value, { id, quantity: 1 }]
  }
  function update(id: number, quantity: number) {
    if (quantity <= 0) items.value = items.value.filter(item => item.id !== id)
    else items.value = items.value.map(item => item.id === id ? { ...item, quantity } : item)
  }
  function clear() { items.value = [] }
  return { items, count, add, update, clear }
}
