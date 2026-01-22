<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { History, Clock, ArrowLeft, Trash2, CheckCircle } from 'lucide-vue-next'
import { ticketStorage } from '@/utils/ticketStorage'
import Header from '@/components/layout/Header.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'

const router = useRouter()

// History data
const historyTickets = ref([])
const loading = ref(true)

// Clear confirmation
const showClearConfirm = ref(false)

// Load history from localStorage
const loadHistory = () => {
  historyTickets.value = ticketStorage.getHistoryTickets()
  loading.value = false
}

onMounted(() => {
  loadHistory()
})

// Format date
const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Go back to home
const goHome = () => {
  router.push('/')
}

// Go to active tickets
const goToActiveTickets = () => {
  router.push('/ticket')
}

// Clear all history
const openClearConfirm = () => {
  showClearConfirm.value = true
}

const confirmClearHistory = () => {
  ticketStorage.clearHistory()
  loadHistory()
  showClearConfirm.value = false
}
</script>

<template>
  <Header />
  
  <div class="min-h-screen bg-gray-50 py-12 px-4">
    <div class="max-w-4xl mx-auto">
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-20">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
        <p class="mt-4 text-gray-600">Memuat histori...</p>
      </div>

      <div v-else>
        <!-- Header -->
        <div class="flex items-center justify-between mb-8">
          <div>
            <h1 class="text-2xl md:text-3xl font-bold text-gray-900">Histori Tiket</h1>
            <p class="text-gray-600 mt-1">Riwayat kunjungan yang sudah selesai</p>
          </div>
          
          <div class="flex gap-2">
            <button
              v-if="historyTickets.length > 0"
              @click="openClearConfirm"
              class="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition text-sm"
            >
              <Trash2 class="w-4 h-4" />
              <span class="hidden sm:inline">Hapus Semua</span>
            </button>
            
            <button
              @click="goToActiveTickets"
              class="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition text-sm"
            >
              <ArrowLeft class="w-4 h-4" />
              <span>Tiket Aktif</span>
            </button>
          </div>
        </div>

        <!-- No History -->
        <div v-if="historyTickets.length === 0" class="bg-white rounded-2xl p-8 text-center">
          <History class="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 class="text-2xl font-bold mb-2">Belum Ada Histori</h2>
          <p class="text-gray-600 mb-6">Riwayat kunjungan Anda akan muncul di sini setelah tiket selesai digunakan.</p>
          <button
            @click="goHome"
            class="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition"
          >
            <ArrowLeft class="w-5 h-5" />
            <span>Kembali ke Beranda</span>
          </button>
        </div>

        <!-- History List -->
        <div v-else class="space-y-4">
          <div
            v-for="ticket in historyTickets"
            :key="ticket.id"
            class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <div class="flex items-start justify-between">
              <!-- Left Side -->
              <div class="flex items-center gap-4">
                <div class="w-16 h-16 rounded-xl bg-green-100 flex items-center justify-center">
                  <CheckCircle class="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h3 class="text-xl font-bold text-gray-900">
                    {{ ticket.display_number || ticket.ticket_number || 'N/A' }}
                  </h3>
                  <p class="text-gray-600">{{ ticket.queue_type_name || ticket.queueTypeName || 'Layanan' }}</p>
                  <p class="text-sm text-gray-500" v-if="ticket.patient_name">
                    {{ ticket.patient_name }}
                  </p>
                </div>
              </div>
              
              <!-- Right Side - Status -->
              <div class="text-right">
                <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                  <CheckCircle class="w-4 h-4" />
                  Selesai
                </span>
              </div>
            </div>
            
            <!-- Bottom Info -->
            <div class="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-4 text-sm text-gray-500">
              <div class="flex items-center gap-1">
                <Clock class="w-4 h-4" />
                <span>Dibuat: {{ formatDate(ticket.createdAt || ticket.issued_at) }}</span>
              </div>
              <div v-if="ticket.completedAt" class="flex items-center gap-1">
                <CheckCircle class="w-4 h-4" />
                <span>Selesai: {{ formatDate(ticket.completedAt) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Clear History Confirmation Modal -->
  <ConfirmModal
    :show="showClearConfirm"
    title="Hapus Semua Histori"
    message="Apakah Anda yakin ingin menghapus semua riwayat kunjungan? Tindakan ini tidak dapat dibatalkan."
    confirm-text="Ya, Hapus Semua"
    cancel-text="Batal"
    type="danger"
    @confirm="confirmClearHistory"
    @cancel="showClearConfirm = false"
  />
</template>
