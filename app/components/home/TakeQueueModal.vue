<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { User, X, MapPin } from 'lucide-vue-next'

const props = defineProps({
  queueType: Object,
  show: Boolean
})

const emit = defineEmits(['close', 'ticketTaken'])

const name = ref('')
const paymentType = ref('UMUM') // Default to UMUM
const error = ref('')
const isSubmitting = ref(false)

// Geofence settings
const geofenceEnabled = ref(false)
const maxDistance = ref(100)
const geofenceLoading = ref(true)

const { createTicket, goToTicket } = useTicket()
const { getGeofenceConfig } = useCustomerSettings()

// Get available doctors for this queue type (poly) - auto-select first one
const availableDoctors = computed(() => {
  return props.queueType?.available_doctors || []
})

// Fetch geofence settings when modal opens
const fetchGeofenceSettings = async () => {
  geofenceLoading.value = true
  try {
    const config = await getGeofenceConfig()
    geofenceEnabled.value = config.enabled
    maxDistance.value = config.maxDistance
  } catch (err) {
    console.warn('Failed to fetch geofence config:', err)
    geofenceEnabled.value = false
  }
  geofenceLoading.value = false
}

const submitForm = async () => {
  if (!name.value.trim()) {
    error.value = 'Nama wajib diisi'
    return
  }

  if (!paymentType.value) {
    error.value = 'Pilih jenis pembayaran terlebih dahulu'
    return
  }

  // NO localStorage check - let backend handle all validation
  // This allows same person to take tickets from different devices/IPs
  // Backend will decide if ticket is allowed based on status (DONE allows new ticket)

  error.value = ''
  isSubmitting.value = true

  try {
    // Don't send doctor_id from frontend - let backend decide doctor assignment
    // This allows backend to distribute tickets evenly among available doctors
    const result = await createTicket(name.value, props.queueType, paymentType.value, null)

    if (result.success) {
      // Emit event to refresh queue data
      emit('ticketTaken')
      
      // Navigate to ticket page to show all tickets
      goToTicket()
      
      // Reset form
      name.value = ''
      emit('close')
    } else {
      error.value = result.error || 'Gagal membuat tiket'
    }
  } catch (err) {
    console.error('Error in submitForm:', err)
    error.value = 'Terjadi kesalahan, silakan coba lagi'
  } finally {
    isSubmitting.value = false
  }
}

// Reset form when modal closes and fetch settings when opens
watch(() => props.show, async (newVal) => {
  if (newVal) {
    // Fetch geofence settings
    fetchGeofenceSettings()
  } else {
    name.value = ''
    paymentType.value = 'UMUM'
    error.value = ''
  }
})

// Initial fetch if modal is already open
onMounted(() => {
  if (props.show) {
    fetchGeofenceSettings()
  }
})
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
      class="relative bg-white rounded-2xl w-full max-w-md p-8 mx-4"
    >
      <!-- CLOSE -->
      <button
        class="absolute top-4 right-4 text-gray-400 hover:text-black"
        @click="$emit('close')"
      >
        <X class="w-5 h-5" />
      </button>

      <h2 class="text-2xl font-bold mb-2">
        Ambil Nomor Antrian
      </h2>

      <p class="text-sm text-gray-600 mb-6">
        Layanan: <span class="font-semibold">{{ queueType?.name }}</span>
      </p>

      <!-- Geofence Location Info (shows when enabled by admin) -->
      <div v-if="geofenceEnabled && !geofenceLoading" class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
        <MapPin class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p class="text-sm font-medium text-blue-800">Validasi Lokasi Aktif</p>
          <p class="text-xs text-blue-700 mt-1">
            Anda harus berada dalam radius <span class="font-semibold">{{ maxDistance }} meter</span> dari lokasi rumah sakit untuk mengambil antrian. Izin lokasi akan diminta saat submit.
          </p>
        </div>
      </div>

      <!-- FORM -->
      <form @submit.prevent="submitForm" class="space-y-6">
        <div>
          <label class="block text-sm font-medium mb-1">
            Nama Pasien
          </label>

          <div class="relative">
            <User class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              v-model="name"
              type="text"
              placeholder="Masukkan nama lengkap"
              class="w-full pl-10 pr-4 py-3 rounded-lg border focus:ring-2 focus:ring-black focus:outline-none"
              :disabled="isSubmitting"
            />
          </div>

          <!-- Payment Type Selection -->
          <div class="mt-4">
            <label class="block text-sm font-medium mb-2">
              Jenis Pembayaran
            </label>
            
            <div class="flex gap-4">
              <label class="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  v-model="paymentType" 
                  value="BPJS" 
                  class="w-4 h-4 text-black focus:ring-black"
                  :disabled="isSubmitting"
                />
                <span class="text-sm">BPJS</span>
              </label>
              
              <label class="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  v-model="paymentType" 
                  value="UMUM" 
                  class="w-4 h-4 text-black focus:ring-black"
                  :disabled="isSubmitting"
                />
                <span class="text-sm">Umum</span>
              </label>
            </div>
          </div>

          <p v-if="error" class="text-sm text-red-500 mt-2">
            {{ error }}
          </p>
        </div>

        <button
          type="submit"
          class="w-full bg-black text-white py-3 rounded-xl font-medium
                 hover:bg-gray-800 transition active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed"
          :disabled="isSubmitting"
        >
          {{ isSubmitting ? 'Memproses...' : 'Ambil Nomor Antrian' }}
        </button>
      </form>
    </div>
  </div>
</template>
