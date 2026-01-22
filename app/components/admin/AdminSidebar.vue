<template>
  <!-- Mobile backdrop -->
  <div 
    v-if="isOpen" 
    class="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
    @click="$emit('close')"
  />

  <!-- Sidebar -->
  <aside
    :class="[
      'fixed inset-y-0 left-0 z-50 w-72 bg-gray-900 transform transition-transform duration-300 ease-in-out',
      'lg:translate-x-0',
      isOpen ? 'translate-x-0' : '-translate-x-full'
    ]"
  >
    <!-- Logo -->
    <div class="flex h-16 items-center gap-3 px-6 border-b border-gray-800">
      <div class="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-900 font-bold">
        ♥
      </div>
      <div>
        <h1 class="text-white font-semibold">RS Sehat Sejahtera</h1>
        <p class="text-gray-400 text-xs">Admin Panel</p>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="flex flex-col gap-1 p-4">
      <p class="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Menu Utama
      </p>
      
      <NuxtLink
        v-for="item in menuItems"
        :key="item.path"
        :to="item.path"
        :class="[
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition',
          isActive(item.path)
            ? 'bg-gray-800 text-white'
            : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
        ]"
        @click="$emit('close')"
      >
        <component :is="item.icon" class="w-5 h-5" />
        {{ item.label }}
      </NuxtLink>

      <div class="border-t border-gray-800 my-4" />

      <p class="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Master Data
      </p>

      <NuxtLink
        v-for="item in masterDataItems"
        :key="item.path"
        :to="item.path"
        :class="[
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition',
          isActive(item.path)
            ? 'bg-gray-800 text-white'
            : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
        ]"
        @click="$emit('close')"
      >
        <component :is="item.icon" class="w-5 h-5" />
        {{ item.label }}
      </NuxtLink>

      <div class="border-t border-gray-800 my-4" />

      <p class="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Lainnya
      </p>

      <NuxtLink
        v-for="item in otherItems"
        :key="item.path"
        :to="item.path"
        :class="[
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition',
          isActive(item.path)
            ? 'bg-gray-800 text-white'
            : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
        ]"
        @click="$emit('close')"
      >
        <component :is="item.icon" class="w-5 h-5" />
        {{ item.label }}
      </NuxtLink>
    </nav>
  </aside>
</template>

<script setup>
import { 
  LayoutDashboard, 
  Building2, 
  Stethoscope, 
  Calendar, 
  ListTodo,
  Users,
  BarChart3,
  Settings
} from 'lucide-vue-next'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

defineEmits(['close'])

const route = useRoute()

const menuItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard }
]

const masterDataItems = [
  { path: '/admin/polys', label: 'Poliklinik', icon: Building2 },
  { path: '/admin/doctors', label: 'Dokter', icon: Stethoscope },
  { path: '/admin/schedules', label: 'Jadwal Layanan', icon: Calendar },
  { path: '/admin/queue-types', label: 'Jenis Antrian', icon: ListTodo }
]

const otherItems = [
  { path: '/admin/staff', label: 'Manajemen Staff', icon: Users },
  { path: '/admin/settings', label: 'Sistem Setting', icon: Settings },
  { path: '/admin/reports', label: 'Laporan & Statistik', icon: BarChart3 }
]

const isActive = (path) => {
  if (path === '/admin') {
    return route.path === '/admin'
  }
  return route.path.startsWith(path)
}
</script>
