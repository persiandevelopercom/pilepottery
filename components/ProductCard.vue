<script setup lang="ts">
import type { Product } from '../shared'
import { ArrowUpLeft, Plus } from 'lucide-vue-next'
import { formatPrice, categoryName } from '../shared'
const props = defineProps<{ product: Product }>()
const { add } = useCart()
const added = ref(false)
function addItem() { add(props.product.id, props.product.stock); added.value = true; setTimeout(() => { added.value = false }, 1800) }
</script>
<template>
  <article class="product-card"><NuxtLink :to="'/products/' + product.slug" class="product-image-wrap"><img :src="product.image" :alt="product.name" loading="lazy"/><span v-if="!product.stock" class="sold-out">ناموجود</span><span class="image-arrow"><ArrowUpLeft :size="19"/></span></NuxtLink><div class="product-meta"><div><span class="product-category">{{ categoryName(product.category) }}</span><NuxtLink :to="'/products/' + product.slug" class="product-name">{{ product.name }}</NuxtLink></div><button class="add-icon" :disabled="!product.stock" :aria-label="'افزودن ' + product.name + ' به سبد'" @click="addItem"><Plus :size="20" :stroke-width="1.5"/></button></div><div class="product-price">{{ formatPrice(product.price) }} <small>تومان</small></div><span v-if="added" class="added-note">به سبد اضافه شد ✓</span></article>
</template>
