<script setup>
import { ref } from 'vue'
import { X, Search, Ticket, Clock, Users, AlertCircle, CheckCircle } from 'lucide-vue-next'

const props = defineProps({
  show: Boolean
})

const emit = defineEmits(['close'])

const token = ref('')
const queueData = ref(null)
const error = ref('')
const isLoading = ref(false)

const { checkQueueStatus } = useQueueStatusCheck()

const checkStatus = async () => {
  if (!token.value.trim()) {
    error.value = 'Mohon masukkan token antrian'
    return
  }

  error.value = ''
  queueData.value = null
  isLoading.value = true

  try {
    const result = await checkQueueStatus(token.value)

    if (result.success) {
      queueData.value = result.data
    } else {
      error.value = result.error || 'Token tidak ditemukan'
    }
  } catch (err) {
    console.error('Error checking status:', err)
    error.value = 'Terjadi kesalahan, silakan coba lagi'
  } finally {
    isLoading.value = false
  }
}

// Reset form when modal closes
watch(() => props.show, (newVal) => {
  if (!newVal) {
    token.value = ''
    queueData.value = null
    error.value = ''
  }
})

// Format status text
const getStatusText = (status) => {
  const statusMap = {
    'waiting': 'Menunggu',
    'called': 'Dipanggil',
    'serving': 'Sedang Dilayani',
    'completed': 'Selesai',
    'cancelled': 'Dibatalkan'
  }
  return statusMap[status] || status
}

// Get status color
const getStatusColor = (status) => {
  const colorMap = {
    'waiting': 'text-yellow-600 bg-yellow-50 border-yellow-200',
    'called': 'text-blue-600 bg-blue-50 border-blue-200',
    'serving': 'text-green-600 bg-green-50 border-green-200',
    'completed': 'text-gray-600 bg-gray-50 border-gray-200',
    'cancelled': 'text-red-600 bg-red-50 border-red-200'
  }
  return colorMap[status] || 'text-gray-600 bg-gray-50 border-gray-200'
}
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex items-center justify-center"
  >
    <!-- BACKDROP -->
    <div
      class="absolute inset-0 bg-black/40"
      @click="$emit('close')"
    />

    <!-- MODAL -->
    <div
      class="relative bg-white rounded-2xl w-full max-w-md p-8 mx-4 max-h-[90vh] overflow-y-auto"
    >
      <!-- CLOSE -->
      <button
        class="absolute top-4 right-4 text-gray-400 hover:text-black"
        @click="$emit('close')"
      >
        <X class="w-5 h-5" />
      </button>

      <h2 class="text-2xl font-bold mb-2">
        Cek Status Antrian
      </h2>

      <p class="text-sm text-gray-600 mb-6">
        Masukkan token antrian Anda untuk melihat status
      </p>

      <!-- FORM -->
      <form @submit.prevent="checkStatus" class="space-y-6">
        <div>
          <label class="block text-sm font-medium mb-1">
            Token Antrian
          </label>

          <div class="relative">
            <Ticket class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              v-model="token"
              type="text"
              placeholder="Contoh: 019bb585-0fda-739e-9b52-7e50ed6e4534"
              class="w-full pl-10 pr-4 py-3 rounded-lg border focus:ring-2 focus:ring-black focus:outline-none"
              :disabled="isLoading"
            />
          </div>

          <p v-if="error" class="text-sm text-red-500 mt-2 flex items-start gap-2">
            <AlertCircle class="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{{ error }}</span>
          </p>
        </div>

        <button
          type="submit"
          class="w-full bg-black text-white py-3 rounded-xl font-medium
                 hover:bg-gray-800 transition active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed
                 flex items-center justify-center gap-2"
          :disabled="isLoading"
        >
          <Search class="w-5 h-5" />
          {{ isLoading ? 'Memeriksa...' : 'Cek Status' }}
        </button>
      </form>

      <!-- QUEUE STATUS RESULT -->
      <div v-if="queueData" class="mt-6 space-y-4">
        <div class="h-px bg-gray-200"></div>

        <!-- Status Badge -->
        <div class="flex items-center justify-center">
          <div :class="['inline-flex items-center gap-2 px-4 py-2 rounded-full border font-medium', getStatusColor(queueData.status)]">
            <CheckCircle class="w-4 h-4" />
            {{ getStatusText(queueData.status) }}
          </div>
        </div>

        <!-- Queue Details -->
        <div class="bg-gray-50 rounded-xl p-6 space-y-4">
          <!-- Queue Number -->
          <div class="text-center pb-4 border-b">
            <p class="text-sm text-gray-600 mb-1">Nomor Antrian</p>
            <p class="text-4xl font-bold">{{ queueData.queue_number || queueData.ticket_number }}</p>
          </div>

          <!-- Service Name -->
          <div class="flex items-start gap-3">
            <Ticket class="w-5 h-5 text-gray-400 mt-0.5" />
            <div class="flex-1">
              <p class="text-sm text-gray-600">Layanan</p>
              <p class="font-semibold">{{ queueData.queue_type_name || queueData.service_name || '-' }}</p>
            </div>
          </div>

          <!-- Patient Name -->
          <div v-if="queueData.patient_name" class="flex items-start gap-3">
            <Users class="w-5 h-5 text-gray-400 mt-0.5" />
            <div class="flex-1">
              <p class="text-sm text-gray-600">Nama Pasien</p>
              <p class="font-semibold">{{ queueData.patient_name }}</p>
            </div>
          </div>

          <!-- Waiting Count -->
          <div v-if="queueData.waiting_count !== undefined" class="flex items-start gap-3">
            <Users class="w-5 h-5 text-gray-400 mt-0.5" />
            <div class="flex-1">
              <p class="text-sm text-gray-600">Antrian di Depan Anda</p>
              <p class="font-semibold">{{ queueData.waiting_count }} orang</p>
            </div>
          </div>

          <!-- Estimated Wait Time -->
          <div v-if="queueData.estimated_wait_minutes" class="flex items-start gap-3">
            <Clock class="w-5 h-5 text-gray-400 mt-0.5" />
            <div class="flex-1">
              <p class="text-sm text-gray-600">Estimasi Waktu Tunggu</p>
              <p class="font-semibold">{{ queueData.estimated_wait_minutes }} menit</p>
            </div>
          </div>

          <!-- Current Number Being Served -->
          <div v-if="queueData.current_number" class="flex items-start gap-3">
            <CheckCircle class="w-5 h-5 text-gray-400 mt-0.5" />
            <div class="flex-1">
              <p class="text-sm text-gray-600">Nomor yang Sedang Dilayani</p>
              <p class="font-semibold">{{ queueData.current_number }}</p>
            </div>
          </div>
        </div>

        <!-- Info -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p class="text-sm text-blue-800">
            💡 Harap datang 15 menit sebelum nomor antrian Anda dipanggil
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
