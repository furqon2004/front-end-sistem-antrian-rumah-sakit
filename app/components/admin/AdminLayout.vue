<template>
  <div class="min-h-screen bg-gray-100">
    <!-- Admin Sidebar -->
    <AdminSidebar :is-open="sidebarOpen" @close="sidebarOpen = false" />

    <!-- Main Content -->
    <div class="lg:pl-72">
      <!-- Top Header -->
      <header class="sticky top-0 z-40 bg-white shadow-sm">
        <div class="flex h-16 items-center gap-4 px-4 sm:px-6 lg:px-8">
          <!-- Mobile menu button -->
          <button
            @click="sidebarOpen = true"
            class="lg:hidden -m-2.5 p-2.5 text-gray-700"
          >
            <Menu class="h-6 w-6" />
          </button>

          <!-- Page Title -->
          <div class="flex-1">
            <h1 class="text-lg font-semibold text-gray-900">
              <slot name="title">Admin Panel</slot>
            </h1>
          </div>

          <!-- Right side -->
          <div class="flex items-center gap-4">
            <!-- User info -->
            <div class="hidden sm:flex items-center gap-3">
              <div class="text-right">
                <p class="text-sm font-medium text-gray-900">{{ userName }}</p>
                <p class="text-xs text-gray-500">Administrator</p>
              </div>
              <div class="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-white font-medium">
                {{ userInitials }}
              </div>
            </div>

            <!-- Logout button -->
            <button
              @click="showLogoutModal = true"
              class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
              title="Logout"
            >
              <LogOut class="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <!-- Page Content -->
      <main class="p-4 sm:p-6 lg:p-8">
        <slot />
      </main>
    </div>

    <!-- Logout Confirmation Modal -->
    <ConfirmModal
      :show="showLogoutModal"
      title="Logout"
      message="Apakah Anda yakin ingin keluar dari Admin Panel?"
      confirm-text="Ya, Logout"
      cancel-text="Batal"
      type="warning"
      @confirm="handleLogout"
      @cancel="showLogoutModal = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Menu, LogOut } from 'lucide-vue-next'
import AdminSidebar from './AdminSidebar.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'

const { logout } = useStaffAuth()

const sidebarOpen = ref(false)
const showLogoutModal = ref(false)

// Get user info from localStorage
const userName = ref('Admin')
const userInitials = computed(() => {
  return userName.value.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
})

onMounted(() => {
  if (process.client) {
    const userStr = localStorage.getItem('staff_user')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        userName.value = user.name || 'Admin'
      } catch (e) {}
    }
  }
})

const handleLogout = async () => {
  showLogoutModal.value = false
  await logout()
}
</script>

