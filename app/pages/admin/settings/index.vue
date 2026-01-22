<template>
  <AdminLayout>
    <template #title>Sistem Setting</template>

    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <p class="text-gray-600">Konfigurasi pengaturan sistem aplikasi antrian</p>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="error" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
      <AlertCircle class="w-5 h-5 text-red-600 flex-shrink-0" />
      <p class="text-red-700">{{ error }}</p>
      <button @click="error = null" class="ml-auto text-red-600 hover:text-red-800">
        <X class="w-5 h-5" />
      </button>
    </div>

    <!-- Success Alert -->
    <div v-if="successMessage" class="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
      <CheckCircle class="w-5 h-5 text-green-600 flex-shrink-0" />
      <p class="text-green-700">{{ successMessage }}</p>
      <button @click="successMessage = null" class="ml-auto text-green-600 hover:text-green-800">
        <X class="w-5 h-5" />
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="bg-white rounded-xl p-12 text-center">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto"></div>
      <p class="mt-4 text-gray-500">Memuat pengaturan sistem...</p>
    </div>

    <template v-else>
      <!-- Geofence Settings Card -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div class="p-6 border-b border-gray-100">
          <h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MapPin class="w-5 h-5 text-blue-600" />
            Pengaturan Geofence
          </h3>
          <p class="text-sm text-gray-500 mt-1">Konfigurasi validasi lokasi saat booking antrian</p>
        </div>
        
        <div class="p-6 space-y-6">
          <!-- Geofence Enabled -->
          <div class="flex items-center justify-between">
            <div>
              <label class="block text-sm font-medium text-gray-900">Aktifkan Geofence</label>
              <p class="text-sm text-gray-500">{{ settingsData.GEOFENCE_ENABLED?.description }}</p>
            </div>
            <button
              @click="toggleGeofence"
              :disabled="saving"
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              :class="isGeofenceEnabled ? 'bg-blue-600' : 'bg-gray-300'"
            >
              <span
                class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                :class="isGeofenceEnabled ? 'translate-x-6' : 'translate-x-1'"
              />
            </button>
          </div>

          <!-- Max Distance -->
          <div>
            <label class="block text-sm font-medium text-gray-900 mb-1">Jarak Maksimum (meter)</label>
            <p class="text-sm text-gray-500 mb-2">{{ settingsData.MAX_DISTANCE_METER?.description }}</p>
            <div class="flex gap-3">
              <input
                v-model="formData.MAX_DISTANCE_METER"
                type="number"
                min="0"
                class="w-40 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
              />
              <span class="text-gray-500 self-center">meter</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Hospital Location Card -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div class="p-6 border-b border-gray-100">
          <h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Building2 class="w-5 h-5 text-green-600" />
            Lokasi Rumah Sakit
          </h3>
          <p class="text-sm text-gray-500 mt-1">Koordinat pusat untuk validasi geofence</p>
        </div>
        
        <div class="p-6 space-y-4">
          <!-- Latitude -->
          <div>
            <label class="block text-sm font-medium text-gray-900 mb-1">Latitude</label>
            <p class="text-sm text-gray-500 mb-2">{{ settingsData.HOSPITAL_LAT?.description }}</p>
            <input
              v-model="formData.HOSPITAL_LAT"
              type="text"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            />
          </div>

          <!-- Longitude -->
          <div>
            <label class="block text-sm font-medium text-gray-900 mb-1">Longitude</label>
            <p class="text-sm text-gray-500 mb-2">{{ settingsData.HOSPITAL_LNG?.description }}</p>
            <input
              v-model="formData.HOSPITAL_LNG"
              type="text"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            />
          </div>

          <!-- Map Preview -->
          <div class="mt-4">
            <a 
              :href="`https://www.google.com/maps?q=${formData.HOSPITAL_LAT},${formData.HOSPITAL_LNG}`"
              target="_blank"
              class="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
            >
              <ExternalLink class="w-4 h-4" />
              Lihat di Google Maps
            </a>
          </div>
        </div>
      </div>

      <!-- Save Button -->
      <div class="flex justify-end gap-3">
        <button
          @click="resetForm"
          :disabled="saving"
          class="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
        >
          Reset
        </button>
        <button
          @click="saveSettings"
          :disabled="saving"
          class="flex items-center gap-2 px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
        >
          <Save class="w-4 h-4" />
          {{ saving ? 'Menyimpan...' : 'Simpan Perubahan' }}
        </button>
      </div>
    </template>
  </AdminLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { MapPin, Building2, Save, ExternalLink, AlertCircle, CheckCircle, X } from 'lucide-vue-next'
import AdminLayout from '@/components/admin/AdminLayout.vue'

definePageMeta({
  middleware: ['admin']
})

const { getSettings, updateSettings } = useAdminSettings()

// State
const loading = ref(true)
const saving = ref(false)
const error = ref(null)
const successMessage = ref(null)
const settingsData = ref({})

// Form data
const formData = ref({
  GEOFENCE_ENABLED: 'false',
  MAX_DISTANCE_METER: '100',
  HOSPITAL_LAT: '',
  HOSPITAL_LNG: ''
})

// Computed
const isGeofenceEnabled = computed(() => formData.value.GEOFENCE_ENABLED === 'true')

// Toggle geofence
const toggleGeofence = () => {
  formData.value.GEOFENCE_ENABLED = formData.value.GEOFENCE_ENABLED === 'true' ? 'false' : 'true'
}

// Fetch settings
const fetchSettings = async () => {
  loading.value = true
  error.value = null

  const result = await getSettings()

  if (result.success) {
    settingsData.value = result.data
    
    // Populate form data
    Object.keys(result.data).forEach(key => {
      if (formData.value.hasOwnProperty(key)) {
        formData.value[key] = result.data[key]?.value || ''
      }
    })
  } else {
    error.value = result.error
  }

  loading.value = false
}

// Reset form to original values
const resetForm = () => {
  Object.keys(settingsData.value).forEach(key => {
    if (formData.value.hasOwnProperty(key)) {
      formData.value[key] = settingsData.value[key]?.value || ''
    }
  })
  successMessage.value = null
  error.value = null
}

// Save settings
const saveSettings = async () => {
  saving.value = true
  error.value = null
  successMessage.value = null

  // Build settings array for update
  const settings = Object.keys(formData.value).map(key => ({
    key,
    value: String(formData.value[key])
  }))

  const result = await updateSettings(settings)

  if (result.success) {
    successMessage.value = result.message
    await fetchSettings() // Refresh data
    
    // Also save to localStorage so customer pages can access without auth
    try {
      const settingsForCustomer = { ...formData.value }
      localStorage.setItem('hospital_queue_settings', JSON.stringify(settingsForCustomer))
      console.log('💾 Settings synced to localStorage for customer access')
    } catch (e) {
      console.warn('Failed to sync settings to localStorage:', e)
    }
    
    setTimeout(() => { successMessage.value = null }, 3000)
  } else {
    error.value = result.error
  }

  saving.value = false
}

onMounted(() => {
  fetchSettings()
})
</script>
