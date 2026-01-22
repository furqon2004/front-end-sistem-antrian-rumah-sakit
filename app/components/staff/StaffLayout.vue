<script setup>
import { 
  LayoutDashboard, 
  Users, 
  LogOut, 
  Menu, 
  X,
  ChevronRight,
  Activity
} from 'lucide-vue-next'

import ConfirmModal from '@/components/common/ConfirmModal.vue'

// Composables
const { username, user, poly, logout } = useStaffAuth()
const route = useRoute()
const router = useRouter()

// State
const isMobileMenuOpen = ref(false)
const showLogoutConfirm = ref(false)
const currentTime = ref(new Date())

// Navigation configuration
const NAV_ITEMS = [
  { 
    name: 'Dashboard', 
    path: '/staff/dashboard', 
    icon: LayoutDashboard,
    description: 'Statistik & Overview'
  },
  { 
    name: 'Kelola Antrian', 
    path: '/staff/queue', 
    icon: Users,
    description: 'Panggil & Layani Pasien'
  }
]

// Computed
const isActive = (path) => route.path === path

const displayName = computed(() => {
  return user.value?.name || username.value || 'Staff'
})

const displayPoly = computed(() => {
  return poly.value?.name || 'Loading...'
})

// Methods
const handleLogout = () => {
  showLogoutConfirm.value = true
}

const confirmLogout = () => {
  showLogoutConfirm.value = false
  logout()
}

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false
}

// Update time every second
onMounted(() => {
  setInterval(() => {
    currentTime.value = new Date()
  }, 1000)
})

// Format time
const formattedTime = computed(() => {
  return currentTime.value.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
})

const formattedDate = computed(() => {
  return currentTime.value.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Desktop Sidebar -->
    <aside class="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-72 bg-gradient-to-b from-gray-900 to-black text-white shadow-2xl">
      <!-- Logo & Branding -->
      <div class="p-6 border-b border-gray-800">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
            <Activity class="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 class="text-xl font-bold">Staff Panel</h1>
            <p class="text-xs text-gray-400">Queue Management</p>
          </div>
        </div>
        
        <!-- User Info -->
        <div class="bg-gray-800/50 rounded-xl p-3 border border-gray-700">
          <p class="text-xs text-gray-400 mb-1">Logged in as</p>
          <p class="font-semibold text-white">{{ displayName }}</p>
          <p class="text-xs text-gray-500 mt-1">{{ displayPoly }}</p>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 p-4 space-y-2 overflow-y-auto">
        <NuxtLink
          v-for="item in NAV_ITEMS"
          :key="item.path"
          :to="item.path"
          :class="[
            'group flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200',
            isActive(item.path)
              ? 'bg-white text-black shadow-lg'
              : 'text-gray-300 hover:bg-gray-800 hover:text-white'
          ]"
        >
          <component 
            :is="item.icon" 
            :class="[
              'w-5 h-5 transition-transform duration-200',
              isActive(item.path) ? 'scale-110' : 'group-hover:scale-110'
            ]"
          />
          <div class="flex-1">
            <p class="font-medium">{{ item.name }}</p>
            <p :class="[
              'text-xs',
              isActive(item.path) ? 'text-gray-600' : 'text-gray-500'
            ]">
              {{ item.description }}
            </p>
          </div>
          <ChevronRight 
            v-if="isActive(item.path)" 
            class="w-4 h-4" 
          />
        </NuxtLink>
      </nav>

      <!-- Clock & Logout -->
      <div class="p-4 border-t border-gray-800 space-y-3">
        <!-- Live Clock -->
        <ClientOnly>
          <div class="bg-gray-800/50 rounded-xl p-3 text-center border border-gray-700">
            <p class="text-2xl font-bold text-white mb-1">{{ formattedTime }}</p>
            <p class="text-xs text-gray-400">{{ formattedDate }}</p>
          </div>
        </ClientOnly>
        
        <!-- Logout Button -->
        <button
          @click="handleLogout"
          class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-gray-300 hover:bg-red-600 hover:text-white transition-all duration-200 border border-gray-700 hover:border-red-600"
        >
          <LogOut class="w-5 h-5" />
          <span class="font-medium">Keluar</span>
        </button>
      </div>
    </aside>

    <!-- Mobile Header -->
    <header class="lg:hidden bg-gradient-to-r from-gray-900 to-black text-white p-4 flex items-center justify-between shadow-lg sticky top-0 z-40">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
          <Activity class="w-5 h-5 text-black" />
        </div>
        <div>
          <h1 class="font-bold">Staff Panel</h1>
          <p class="text-xs text-gray-400">{{ username }}</p>
        </div>
      </div>
      <button
        @click="isMobileMenuOpen = !isMobileMenuOpen"
        class="p-2 hover:bg-gray-800 rounded-lg transition"
      >
        <Menu v-if="!isMobileMenuOpen" class="w-6 h-6" />
        <X v-else class="w-6 h-6" />
      </button>
    </header>

    <!-- Mobile Menu -->
    <Transition
      enter-active-class="transition-all duration-200"
      enter-from-class="opacity-0 -translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-4"
    >
      <div
        v-if="isMobileMenuOpen"
        class="lg:hidden bg-gray-900 text-white p-4 space-y-2 shadow-xl"
      >
        <NuxtLink
          v-for="item in NAV_ITEMS"
          :key="item.path"
          :to="item.path"
          @click="closeMobileMenu"
          :class="[
            'flex items-center gap-3 px-4 py-3 rounded-xl transition',
            isActive(item.path)
              ? 'bg-white text-black'
              : 'text-gray-300 hover:bg-gray-800'
          ]"
        >
          <component :is="item.icon" class="w-5 h-5" />
          <div class="flex-1">
            <p class="font-medium">{{ item.name }}</p>
            <p class="text-xs opacity-70">{{ item.description }}</p>
          </div>
        </NuxtLink>
        
        <button
          @click="handleLogout"
          class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-red-600 hover:text-white transition"
        >
          <LogOut class="w-5 h-5" />
          <span class="font-medium">Keluar</span>
        </button>
      </div>
    </Transition>

    <!-- Main Content -->
    <main class="lg:ml-72 min-h-screen">
      <div class="p-4 md:p-8">
        <slot />
      </div>
    </main>

    <!-- Logout Confirmation Modal -->
    <ConfirmModal
      :show="showLogoutConfirm"
      title="Konfirmasi Keluar"
      message="Apakah Anda yakin ingin keluar dari aplikasi?"
      confirm-text="Ya, Keluar"
      cancel-text="Batal"
      type="danger"
      @confirm="confirmLogout"
      @cancel="showLogoutConfirm = false"
    />
  </div>
</template>
