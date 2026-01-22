<script setup>
import { ref } from 'vue'
import { LogIn, User, Lock, AlertCircle, Eye, EyeOff } from 'lucide-vue-next'

definePageMeta({
  layout: false
})

const { login, isLoading, error: authError, user } = useStaffAuth()
const router = useRouter()

// Form state
const username = ref('')
const password = ref('')
const showPassword = ref(false)
const error = ref('')

// Handle login
const handleLogin = async () => {
  if (!username.value.trim()) {
    error.value = 'Username wajib diisi'
    return
  }
  
  if (!password.value) {
    error.value = 'Password wajib diisi'
    return
  }
  
  error.value = ''
  
  const result = await login(username.value, password.value)
  
  if (result.success) {
    // Check user role and redirect accordingly
    const userData = user.value
    const isAdmin = userData?.admin || userData?.role === 'admin' || userData?.is_admin
    
    if (isAdmin) {
      console.log('🔐 Admin login detected, redirecting to /admin')
      router.push('/admin')
    } else {
      console.log('👤 Staff login detected, redirecting to /staff/dashboard')
      router.push('/staff/dashboard')
    }
  } else {
    error.value = result.error || 'Login gagal'
  }
}

// Check if already logged in
onMounted(() => {
  const savedToken = localStorage.getItem('staff_token')
  if (savedToken) {
    const userStr = localStorage.getItem('staff_user')
    if (userStr) {
      try {
        const userData = JSON.parse(userStr)
        const isAdmin = userData?.admin || userData?.role === 'admin' || userData?.is_admin
        
        if (isAdmin) {
          router.push('/admin')
        } else {
          router.push('/staff/dashboard')
        }
      } catch (e) {
        router.push('/staff/dashboard')
      }
    } else {
      router.push('/staff/dashboard')
    }
  }
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <!-- Logo/Header -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-black rounded-full mb-4">
          <LogIn class="w-8 h-8 text-white" />
        </div>
        <h1 class="text-3xl font-bold text-gray-900 mb-2">
          Login
        </h1>
        <p class="text-gray-600">
          Sistem Manajemen Antrian RS Sehat Sejahtera
        </p>
      </div>

      <!-- Login Card -->
      <div class="bg-white rounded-2xl shadow-xl p-8">
        <form @submit.prevent="handleLogin" class="space-y-6">
          <!-- Username -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <div class="relative">
              <User class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                v-model="username"
                type="text"
                placeholder="Masukkan username"
                class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition"
                :disabled="isLoading"
              />
            </div>
          </div>

          <!-- Password -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div class="relative">
              <Lock class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Masukkan password"
                class="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition"
                :disabled="isLoading"
                @keyup.enter="handleLogin"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              >
                <EyeOff v-if="showPassword" class="w-5 h-5" />
                <Eye v-else class="w-5 h-5" />
              </button>
            </div>
          </div>

          <!-- Error Message -->
          <div v-if="error || authError" class="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p class="text-sm text-red-800">
              {{ error || authError }}
            </p>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            class="w-full bg-black text-white py-3 rounded-xl font-medium hover:bg-gray-800 transition active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            :disabled="isLoading"
          >
            <span v-if="isLoading">Memproses...</span>
            <span v-else>Masuk</span>
          </button>
        </form>

        <!-- Footer -->
        <div class="mt-6 text-center text-sm text-gray-500">
          <p>Login untuk Admin & Staff</p>
        </div>
      </div>
    </div>
  </div>
</template>
