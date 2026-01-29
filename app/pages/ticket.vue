<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Ticket, Clock, User, CheckCircle, ArrowLeft, Trash2, RefreshCw, Bell, Sparkles } from 'lucide-vue-next'
import { ticketStorage } from '@/utils/ticketStorage'
import QRCode from 'qrcode'
import ConfirmModal from '@/components/common/ConfirmModal.vue'

const router = useRouter()

// Tickets data
const tickets = ref([])
const ticketsWithStatus = ref([])
const loading = ref(true)
const refreshing = ref(false)

// Delete confirmation modal
const showDeleteConfirm = ref(false)
const ticketToDelete = ref(null)

// Status notification
const calledTicket = ref(null)

const { checkQueueStatus, checkTicketInQueue } = useQueueStatusCheck()

// Load tickets from localStorage
const loadTickets = () => {
  tickets.value = ticketStorage.getTickets()
}

// Fetch status for all tickets and auto-remove DONE tickets
const fetchTicketStatuses = async () => {
  if (tickets.value.length === 0) {
    ticketsWithStatus.value = []
    return
  }

  const validTickets = []
  const statusPromises = tickets.value.map(async (ticket) => {
    try {
      // Use token for status API - token is from public_queue_token table
      // Note: ticket.id is queue_ticket_id, ticket.token is the actual token
      let ticketToken = ticket.token
      if (!ticketToken) {
        console.warn('⚠️ Ticket missing token field:', ticket)
        ticketToken = ''
      } else if (typeof ticketToken === 'object' && ticketToken !== null) {
        ticketToken = ticketToken.id || String(ticketToken)
      } else {
        ticketToken = String(ticketToken)
      }
      
      // Ticket ID for local storage operations
      const ticketId = String(ticket.id)
      
      console.log('🎫 Processing ticket:', { id: ticketId, token: ticketToken })
      
      // Generate QR code
      let qrCodeUrl = ''
      try {
        qrCodeUrl = await QRCode.toDataURL(ticketId, {
          width: 200,
          margin: 2
        })
      } catch (error) {
        console.error('Error generating QR code for ticket:', ticketId, error)
      }

      // Check ticket status via public queue endpoint using TOKEN
      const queueTypeId = ticket.queue_type_id
      let currentStatus = ticket.status || 'WAITING'
      let shouldRemove = false
      let queueCheck = null

      if (queueTypeId) {
        // console.log(`🔍 calling checkTicketInQueue with token: ${ticketToken} for ticket: ${ticketId}`)
        queueCheck = await checkTicketInQueue(ticketToken, queueTypeId)
        
        if (!queueCheck.exists) {
          // Ticket no longer in queue - move to history
          console.log('🎉 Ticket', ticketId, 'is DONE, moving to history')
          ticketStorage.moveToHistory(ticketId)
          return null // Will be filtered out
        }
        
        if (queueCheck.status) {
          // Update status from queue
          const oldStatus = currentStatus
          currentStatus = queueCheck.status
          
          // If status changed to CALLED, show notification
          if (oldStatus !== 'CALLED' && currentStatus === 'CALLED') {
            calledTicket.value = { ...ticket, status: 'CALLED' }
            // Auto-hide notification after 5 seconds
            setTimeout(() => { calledTicket.value = null }, 5000)
          }
          
          // Update localStorage with new status
          ticketStorage.updateTicketStatus(ticketId, currentStatus)
        }
      }
      
      return {
        ...ticket,
        id: ticketId,
        qrCodeUrl,
        status: currentStatus,
        // Add real-time data from queue check
        ai_prediction: queueCheck?.ai_prediction,
        queues_ahead: queueCheck?.remaining_queues,
        estimated_wait_minutes: queueCheck?.estimated_waiting_minutes,
        current_queue: queueCheck?.current_queue,
        // Add doctor info for per-doctor queue display
        doctor_name: queueCheck?.doctor_name || ticket.doctor_name,
        is_per_doctor: queueCheck?.is_per_doctor || false,
        statusError: null
      }
    } catch (error) {
      console.error('Error processing ticket:', ticket.id, error)
      const ticketId = typeof ticket.id === 'string' ? ticket.id : String(ticket.id || '')
      return {
        ...ticket,
        id: ticketId,
        qrCodeUrl: '',
        status: ticket.status || 'WAITING',
        statusError: null
      }
    }
  })

  const results = await Promise.all(statusPromises)
  // Filter out null results (removed tickets)
  ticketsWithStatus.value = results.filter(t => t !== null)
  
  // Reload tickets from localStorage (in case some were removed)
  loadTickets()
}

// Refresh all ticket statuses
const refreshStatuses = async () => {
  refreshing.value = true
  await fetchTicketStatuses()
  refreshing.value = false
}

// Auto-refresh every 5 seconds for real-time updates
let refreshInterval = null

onMounted(async () => {
  loadTickets()
  await fetchTicketStatuses()
  loading.value = false

  // Auto-refresh every 5 seconds for faster status updates
  refreshInterval = setInterval(async () => {
    await fetchTicketStatuses()
  }, 5000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})

// Format date
const formatDate = (dateString) => {
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

// Delete a ticket
const { deleteTicket: deleteTicketApi } = useTicket()

const deleteTicket = (ticket) => {
  ticketToDelete.value = ticket
  showDeleteConfirm.value = true
}

const confirmDelete = async () => {
  if (ticketToDelete.value) {
    // Determine token to use (token || id)
    // API expects token from public_queue_token table
    let ticketToken = ticketToDelete.value.token || ticketToDelete.value.id
    if (typeof ticketToken === 'object' && ticketToken !== null) {
      ticketToken = ticketToken.id || String(ticketToken)
    } else {
      ticketToken = String(ticketToken)
    }

    // Call the cancel API to set status to CANCELLED
    const result = await deleteTicketApi(ticketToken)
    
    if (result.success) {
      console.log('✅ Ticket cancelled successfully')
    } else {
      console.warn('⚠️ Cancel API failed, but proceeding with local removal:', result.error)
    }
    
    // Remove ticket from local storage
    ticketStorage.removeTicket(ticketToDelete.value.id)
    loadTickets()
    fetchTicketStatuses()
    ticketToDelete.value = null
  }
}

const cancelDelete = () => {
  ticketToDelete.value = null
}

// Print ticket
const printTicket = () => {
  window.print()
}

// Get status text
const getStatusText = (status) => {
  const statusMap = {
    'WAITING': 'Menunggu',
    'CALLED': 'Dipanggil!',
    'SERVING': 'Sedang Dilayani',
    'DONE': 'Selesai',
    'SKIPPED': 'Dilewati',
    'waiting': 'Menunggu',
    'called': 'Dipanggil!',
    'serving': 'Sedang Dilayani',
    'completed': 'Selesai',
    'cancelled': 'Dibatalkan',
    'unknown': 'Status Tidak Diketahui'
  }
  return statusMap[status] || status
}

// Get status color
const getStatusColor = (status) => {
  const colorMap = {
    'WAITING': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'CALLED': 'bg-blue-500 text-white border-blue-600 animate-pulse',
    'SERVING': 'bg-green-100 text-green-800 border-green-300',
    'DONE': 'bg-gray-100 text-gray-800 border-gray-300',
    'SKIPPED': 'bg-red-100 text-red-800 border-red-300',
    'waiting': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'called': 'bg-blue-500 text-white border-blue-600 animate-pulse',
    'serving': 'bg-green-100 text-green-800 border-green-300',
    'completed': 'bg-gray-100 text-gray-800 border-gray-300',
    'cancelled': 'bg-red-100 text-red-800 border-red-300',
    'unknown': 'bg-gray-100 text-gray-600 border-gray-300'
  }
  return colorMap[status] || 'bg-gray-100 text-gray-600 border-gray-300'
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-12 px-4">
    <div class="max-w-6xl mx-auto">
      <!-- Called Notification Banner -->
      <div 
        v-if="calledTicket"
        class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-blue-600 text-white px-6 py-4 rounded-xl shadow-xl flex items-center gap-3 animate-bounce"
      >
        <Bell class="w-6 h-6" />
        <div>
          <p class="font-bold text-lg">Nomor Anda Dipanggil!</p>
          <p class="text-blue-100">{{ calledTicket.display_number || calledTicket.ticket_number }} - Silakan menuju loket</p>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-20">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
        <p class="mt-4 text-gray-600">Memuat tiket...</p>
      </div>

      <!-- No Tickets -->
      <div v-else-if="tickets.length === 0" class="bg-white rounded-2xl p-8 text-center">
        <Ticket class="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 class="text-2xl font-bold mb-2">Belum Ada Tiket Aktif</h2>
        <p class="text-gray-600 mb-6">Anda belum memiliki tiket antrian aktif. Tiket yang sudah selesai akan otomatis terhapus.</p>
        <button
          @click="goHome"
          class="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition"
        >
          <ArrowLeft class="w-5 h-5" />
          Kembali ke Beranda
        </button>
      </div>

      <!-- Tickets Display -->
      <div v-else class="space-y-6">
        <!-- Header -->
        <div class="flex items-center justify-between print:hidden">
          <button
            @click="goHome"
            class="inline-flex items-center gap-2 text-gray-600 hover:text-black transition"
          >
            <ArrowLeft class="w-5 h-5" />
            Kembali ke Beranda
          </button>

          <div class="flex items-center gap-2">
            <button
              @click="refreshStatuses"
              :disabled="refreshing"
              class="inline-flex items-center gap-2 px-4 py-2 bg-white border rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
            >
              <RefreshCw :class="['w-4 h-4', refreshing && 'animate-spin']" />
              {{ refreshing ? 'Memperbarui...' : 'Perbarui Status' }}
            </button>
            
            <NuxtLink
              to="/history"
              class="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 border rounded-xl hover:bg-gray-200 transition"
            >
              <Clock class="w-4 h-4" />
              Histori
            </NuxtLink>
          </div>
        </div>

        <div class="text-center">
          <h1 class="text-3xl font-bold mb-2">Tiket Antrian Anda</h1>
          <p class="text-gray-600">Menampilkan {{ tickets.length }} tiket aktif</p>
        </div>

        <!-- Tickets Grid -->
        <div class="grid md:grid-cols-2 gap-6">
          <div
            v-for="ticket in ticketsWithStatus"
            :key="ticket.id"
            class="bg-white rounded-2xl shadow-lg overflow-hidden"
          >
            <!-- Header -->
            <div class="bg-black text-white p-6">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <CheckCircle class="w-5 h-5" />
                  <h2 class="text-lg font-bold">{{ ticket.queue_type?.name || ticket.queue_type_name }}</h2>
                </div>
                <button
                  @click="deleteTicket(ticket)"
                  class="print:hidden text-white/70 hover:text-white transition"
                  title="Hapus tiket"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
              <p class="text-gray-300 text-sm">{{ formatDate(ticket.created_at || ticket.createdAt) }}</p>
            </div>

            <!-- Status Badge -->
            <div class="p-4 bg-gray-50 border-b">
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Status:</span>
                <span :class="['px-3 py-1 rounded-full text-xs font-medium border', getStatusColor(ticket.status)]">
                  {{ getStatusText(ticket.status) }}
                </span>
              </div>
            </div>

            <!-- Queue Number -->
            <div class="p-6 text-center border-b">
              <p class="text-sm text-gray-600 mb-2">Nomor Antrian Anda</p>
              <div class="text-5xl font-bold text-black mb-2">
                {{ ticket.display_number || ticket.ticket_number || 'A001' }}
              </div>
              <p class="text-sm font-semibold text-gray-700">{{ ticket.queue_type?.code_prefix || ticket.queue_type_code }}</p>
            </div>

            <!-- Real-time Status Info -->
            <div v-if="!ticket.statusError && ticket.status !== 'unknown'" class="bg-blue-50 border-b divide-y divide-blue-100">
              <!-- Doctor Info (if assigned) -->
              <div v-if="ticket.doctor_name" class="p-4 bg-indigo-50 border-b border-indigo-100">
                <p class="text-xs text-gray-600 mb-1">Dokter yang Menangani</p>
                <p class="text-sm font-bold text-indigo-700">{{ ticket.doctor_name }}</p>
              </div>
              
              <!-- Grid Stats -->
              <div class="p-6 grid grid-cols-3 gap-4 text-center">
                <div v-if="ticket.current_queue || ticket.current_number">
                  <p class="text-xs text-gray-600 mb-1">Sedang Dilayani</p>
                  <p class="text-lg font-bold text-blue-600">
                    {{ ticket.current_queue?.display_number || ticket.current_number || '-' }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-gray-600 mb-1">
                    {{ ticket.doctor_name ? 'Antrian Dokter Ini' : 'Antrian di Depan' }}
                  </p>
                  <p class="text-lg font-bold text-blue-600">
                    {{ ticket.queues_ahead ?? 0 }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-gray-600 mb-1">Estimasi Tunggu</p>
                  <p class="text-lg font-bold text-blue-600">
                    {{ ticket.ai_prediction?.estimated_minutes ?? ticket.estimated_wait_minutes ?? '-' }}m
                  </p>
                </div>
              </div>
              
              <!-- AI Prediction Message -->
              <div v-if="ticket.ai_prediction" class="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-100">
                <div class="flex items-start gap-3">
                  <div class="p-2 bg-indigo-100 rounded-lg">
                    <Sparkles class="w-5 h-5 text-indigo-600 animate-pulse" />
                  </div>
                  <div>
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-xs font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">AI Prediction</span>
                      <span v-if="ticket.ai_prediction.confidence_level" class="text-xs text-gray-500 capitalize">
                        {{ ticket.ai_prediction.confidence_level }} Confidence
                      </span>
                    </div>
                    <p class="text-sm font-medium text-gray-900 leading-snug mb-1">
                      {{ ticket.ai_prediction.message }}
                    </p>
                    <p v-if="ticket.ai_prediction.tips" class="text-xs text-indigo-700 italic">
                      💡 Tip: {{ ticket.ai_prediction.tips }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Error Message -->
            <div v-if="ticket.statusError" class="p-4 bg-yellow-50 border-b">
              <p class="text-sm text-yellow-800">⚠️ {{ ticket.statusError }}</p>
            </div>

            <!-- Ticket Details -->
            <div class="p-6 space-y-3">
              <div class="flex items-start gap-3">
                <User class="w-5 h-5 text-gray-400 mt-0.5" />
                <div class="flex-1">
                  <p class="text-sm text-gray-600">Nama Pasien</p>
                  <p class="font-semibold">{{ ticket.patient_name }}</p>
                </div>
              </div>

              <!-- Payment Type Badge -->
              <div class="flex items-start gap-3">
                <Ticket class="w-5 h-5 text-gray-400 mt-0.5" />
                <div class="flex-1">
                  <p class="text-sm text-gray-600">Jenis Pembayaran</p>
                  <span :class="[
                    'inline-block px-3 py-1 rounded-full text-xs font-medium mt-1',
                    ticket.payment_type === 'BPJS' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-green-100 text-green-800 border border-green-200'
                  ]">
                    {{ ticket.payment_type || 'UMUM' }}
                  </span>
                </div>
              </div>

              <div class="flex items-start gap-3">
                <Ticket class="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p class="text-sm text-gray-600">Token</p>
                  <p class="font-mono text-xs break-all">{{ ticket.token || '-' }}</p>
                </div>
              </div>
            </div>

            <!-- QR Code -->
            <div v-if="ticket.qrCodeUrl" class="p-6 bg-gray-50 text-center border-t">
              <p class="text-sm text-gray-600 mb-4">Scan QR Code untuk Verifikasi</p>
              <img :src="ticket.qrCodeUrl" alt="QR Code" class="mx-auto rounded-lg" />
            </div>
          </div>
        </div>

        <!-- Info Card -->
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-6 print:hidden">
          <h3 class="font-semibold text-blue-900 mb-2">Informasi Penting</h3>
          <ul class="text-sm text-blue-800 space-y-1">
            <li>• Status antrian diperbarui otomatis setiap 10 detik</li>
            <li>• Harap datang 15 menit sebelum nomor antrian Anda dipanggil</li>
            <li>• Tunjukkan tiket ini kepada petugas saat dipanggil</li>
            <li>• Tiket tersimpan di perangkat ini dan tidak dapat diakses dari perangkat lain</li>
          </ul>
        </div>

        <!-- Actions -->
        <div class="print:hidden flex gap-3 justify-center">
          <button
            @click="printTicket"
            class="px-6 py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition"
          >
            Cetak Semua Tiket
          </button>
          <button
            @click="goHome"
            class="px-6 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-100 transition"
          >
            Ambil Antrian Lagi
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Delete Confirmation Modal -->
  <ConfirmModal
    :show="showDeleteConfirm"
    title="Hapus Tiket"
    message="Apakah Anda yakin ingin menghapus tiket ini?

Tindakan ini tidak dapat dibatalkan."
    confirm-text="Ya, Hapus"
    cancel-text="Batal"
    @confirm="confirmDelete"
    @cancel="cancelDelete"
    @close="showDeleteConfirm = false"
  />
</template>

<style>
@media print {
  body {
    background: white;
  }
  
  .print\:hidden {
    display: none !important;
  }
  
  /* Make tickets smaller for printing */
  .max-w-6xl {
    max-width: 100% !important;
    padding: 0 !important;
  }
  
  /* Ticket grid - single column, narrow tickets */
  .grid.md\:grid-cols-2 {
    display: block !important;
  }
  
  /* Each ticket card - narrower for receipt-style printing */
  .grid.md\:grid-cols-2 > div {
    max-width: 300px !important;
    margin: 0 auto 20px auto !important;
    page-break-inside: avoid;
    border: 1px solid #ddd !important;
    border-radius: 8px !important;
  }
  
  /* Smaller padding inside ticket */
  .grid.md\:grid-cols-2 > div .p-6 {
    padding: 12px !important;
  }
  
  .grid.md\:grid-cols-2 > div .p-4 {
    padding: 8px !important;
  }
  
  /* Smaller text */
  .grid.md\:grid-cols-2 > div .text-5xl {
    font-size: 2.5rem !important;
  }
  
  .grid.md\:grid-cols-2 > div .text-lg {
    font-size: 1rem !important;
  }
  
  /* Smaller QR code */
  .grid.md\:grid-cols-2 > div img {
    max-width: 120px !important;
    margin: 0 auto !important;
  }
  
  /* Hide AI prediction section on print */
  .bg-gradient-to-r.from-blue-50.to-indigo-50 {
    display: none !important;
  }
}
</style>
