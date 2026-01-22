<template>
<header class="bg-white border-b sticky top-0 z-50">
  <div class="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
    <!-- KIRI -->
    <div class="flex items-center gap-3">
      <NuxtLink to="/" class="flex items-center gap-3">
        <div class="w-9 h-9 md:w-10 md:h-10 rounded-full bg-black flex items-center justify-center text-white">
          ♥
        </div>
        <div class="hidden sm:block">
          <h1 class="font-semibold text-sm md:text-base leading-tight">
            RS Sehat Sejahtera
          </h1>
          <p class="text-xs text-gray-500">
            Sistem Antrian Online
          </p>
        </div>
      </NuxtLink>
    </div>

    <!-- KANAN -->
    <div class="flex items-center gap-3 md:gap-6">
      <div class="text-right hidden sm:block">
        <p class="text-xs text-gray-500">Waktu Sekarang</p>
        <p class="font-semibold text-sm">{{ time }}</p>
      </div>
      
      <!-- Dropdown Menu -->
      <div class="relative">
        <button 
          @click="toggleDropdown"
          class="flex items-center gap-2 px-3 md:px-4 py-2 border rounded-lg text-xs md:text-sm font-medium hover:bg-black hover:text-white transition duration-50"
        >
          <Ticket class="w-4 h-4" />
          <span>Tiket Saya</span>
          <ChevronDown class="w-4 h-4 transition-transform" :class="{ 'rotate-180': isOpen }" />
        </button>
        
        <!-- Dropdown Items -->
        <div 
          v-show="isOpen"
          class="absolute right-0 mt-2 w-48 bg-white border rounded-xl shadow-lg py-1 z-50"
        >
          <NuxtLink 
            to="/ticket"
            @click="closeDropdown"
            class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition"
          >
            <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Ticket class="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p class="text-sm font-medium">Tiket Aktif</p>
              <p class="text-xs text-gray-500">Lihat antrian aktif</p>
            </div>
          </NuxtLink>
          
          <NuxtLink 
            to="/history"
            @click="closeDropdown"
            class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition border-t"
          >
            <div class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <History class="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p class="text-sm font-medium">Histori Tiket</p>
              <p class="text-xs text-gray-500">Riwayat kunjungan</p>
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</header>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Ticket, ChevronDown, History } from 'lucide-vue-next'

const time = ref('')
let timer = null

// Dropdown state
const isOpen = ref(false)

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
}

const closeDropdown = () => {
  isOpen.value = false
}

// Close dropdown when clicking outside
const handleClickOutside = (e) => {
  if (!e.target.closest('.relative')) {
    isOpen.value = false
  }
}

const updateTime = () => {
  time.value = new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 60000)
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  clearInterval(timer)
  document.removeEventListener('click', handleClickOutside)
})
</script>

