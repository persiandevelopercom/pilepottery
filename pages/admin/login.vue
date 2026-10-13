<script setup lang="ts">
definePageMeta({ layout: false })
const session = await useRequestFetch()< { authenticated: boolean; demo: boolean; configured: boolean } >('/api/admin/session', { headers: adminHeaders() })
if (session.authenticated) await navigateTo('/admin')
const username = ref(''), password = ref(''), busy = ref(false), error = ref('')
async function login() {
  busy.value = true; error.value = ''
  try {
    const result = await $fetch<{ ok: boolean; token?: string }>('/api/admin/login', { method: 'POST', body: { username: username.value.trim(), password: password.value } })
    if (result.token) sessionStorage.setItem('pile-preview-session', result.token)
    await navigateTo('/admin')
  }
  catch (e: any) { error.value = e?.data?.statusMessage || 'ورود انجام نشد.' }
  finally { busy.value = false }
}
useSeoMeta({ title: 'ورود مدیریت | پیله پاتری', robots: 'noindex' })
</script>
<template><div class="login-page"><NuxtLink to="/" class="login-home">← بازگشت به فروشگاه</NuxtLink><div class="login-card"><div class="login-logo">پیله پاتری<span>.</span></div><span class="login-eyebrow">PILE POTTERY STUDIO</span><h1>ورود به مدیریت</h1><p>برای مدیریت محصولات و سفارش‌ها وارد شوید.</p><form @submit.prevent="login"><label class="form-field">نام کاربری<input v-model="username" required autocomplete="username" placeholder="نام کاربری"/></label><label class="form-field">رمز عبور<input v-model="password" type="password" required autocomplete="current-password" placeholder="رمز عبور"/></label><p v-if="error" class="error-msg">{{ error }}</p><button class="btn login-button" :disabled="busy">{{ busy ? 'در حال ورود...' : 'ورود به پنل' }}</button></form><p v-if="session.demo" class="demo-hint">نسخه‌ی نمایشی: نام کاربری <b>admin</b> و رمز <b>atelier-demo-2026</b></p><p v-else-if="!session.configured" class="error-msg">اطلاعات ورود روی سرور تنظیم نشده است. متغیرهای محیطی را در فایل راهنما ببینید.</p></div></div></template>
<style scoped>.login-page{min-height:100vh;background:#e8e9df;display:grid;place-items:center;padding:50px 20px;position:relative}.login-home{position:absolute;top:28px;right:36px;color:#5b6556;font-size:12px}.login-card{background:#fff;padding:50px;width:min(440px,100%);box-shadow:0 20px 70px #35413212}.login-logo{font-size:50px;font-weight:700;letter-spacing:-.1em;line-height:1}.login-logo span{color:var(--rust)}.login-eyebrow{font:9px Georgia,serif;letter-spacing:.2em;color:#92998c}.login-card h1{font-size:24px;font-weight:500;margin:35px 0 5px}.login-card>p{font-size:12px;color:var(--muted);line-height:2}.login-card form{display:flex;flex-direction:column;gap:18px;margin-top:28px}.login-button{width:100%;margin-top:5px}.demo-hint{background:#f5f2e8;padding:12px;font-size:11px!important;word-break:break-word}.demo-hint b{font-family:monospace;direction:ltr}@media(max-width:500px){.login-card{padding:30px}}</style>
