<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="$emit('close')">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h3 class="text-lg font-semibold text-gray-900">Jam Layanan Poli</h3>
          <p class="text-sm text-gray-500">{{ poly?.name }}</p>
        </div>
        <button @click="$emit('close')" class="p-2 hover:bg-gray-100 rounded-lg transition">
          <X class="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 overflow-y-auto flex-1">
        <!-- Error Alert -->
        <div v-if="error" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertCircle class="w-5 h-5 text-red-600 flex-shrink-0" />
          <p class="text-red-700">{{ error }}</p>
          <button @click="error = null" class="ml-auto text-red-600 hover:text-red-800">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Add New Schedule Form -->
        <div class="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
          <h4 class="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Plus class="w-4 h-4" /> Tambah Jadwal
          </h4>
          <form @submit.prevent="handleAdd" class="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Hari</label>
              <select 
                v-model="newSchedule.day_of_week" 
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              >
                <option v-for="day in days" :key="day.value" :value="day.value">{{ day.label }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Buka</label>
              <input 
                v-model="newSchedule.open_time" 
                type="time" 
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Tutuip</label>
              <input 
                v-model="newSchedule.close_time" 
                type="time" 
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            <button 
              type="submit" 
              :disabled="submitting"
              class="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
            >
              {{ submitting ? '...' : 'Tambah' }}
            </button>
          </form>
        </div>

        <!-- Schedule List -->
        <div v-if="loading" class="text-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
          <p class="mt-2 text-sm text-gray-500">Memuat jadwal...</p>
        </div>
        
        <div v-else-if="sortedHours.length === 0" class="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <Calendar class="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p class="text-gray-500">Belum ada jadwal layanan</p>
        </div>

        <div v-else class="space-y-2">
          <div 
            v-for="hour in sortedHours" 
            :key="hour.id"
            class="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg shadow-sm hover:border-gray-200 transition"
          >
            <div class="flex items-center gap-4">
              <span class="w-24 font-medium text-gray-900">{{ getDayName(hour.day_of_week) }}</span>
              <div class="flex items-center gap-2 text-sm text-gray-600">
                <Clock class="w-4 h-4 text-gray-400" />
                <span>{{ formatTime(hour.open_time) }} - {{ formatTime(hour.close_time) }}</span>
              </div>
              <span 
                v-if="!hour.is_active" 
                class="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full"
              >
                Nonaktif
              </span>
            </div>
            <button 
              @click="handleDelete(hour)"
              class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
              title="Hapus Jadwal"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { X, Plus, Trash2, AlertCircle, Calendar, Clock } from 'lucide-vue-next'

const props = defineProps({
  poly: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close'])

const { getServiceHours, createServiceHour, deleteServiceHour } = useAdminPolyServiceHours()

// State
const loading = ref(true)
const submitting = ref(false)
const serviceHours = ref([])
const error = ref(null)

// Form
const newSchedule = ref({
  day_of_week: 1,
  open_time: '08:00',
  close_time: '16:00',
  is_active: true
})

// Constants
const days = [
  { value: 1, label: 'Senin' },
  { value: 2, label: 'Selasa' },
  { value: 3, label: 'Rabu' },
  { value: 4, label: 'Kamis' },
  { value: 5, label: 'Jumat' },
  { value: 6, label: 'Sabtu' },
  { value: 7, label: 'Minggu' }
]

// Fetch data
const fetchHours = async () => {
  if (!props.poly?.id) return
  
  loading.value = true
  error.value = null
  
  const result = await getServiceHours(props.poly.id)
  
  if (result.success) {
    serviceHours.value = result.data
  } else {
    error.value = result.error
  }
  
  loading.value = false
}

// Helpers
const getDayName = (dayValue) => {
  const day = days.find(d => d.value === dayValue)
  return day ? day.label : 'Unknown'
}

const formatTime = (timeString) => {
  if (!timeString) return ''
  return timeString.substring(0, 5) // HH:mm
}

const sortedHours = computed(() => {
  return [...serviceHours.value].sort((a, b) => a.day_of_week - b.day_of_week)
})

// Actions
const handleAdd = async () => {
  submitting.value = true
  error.value = null
  
  // Basic validation check if schedule for this day already exists
  /* 
  // Optional: Prevent duplicate days if backend doesn't handle it
  const exists = serviceHours.value.find(h => h.day_of_week === newSchedule.value.day_of_week)
  if (exists) {
    error.value = `Jadwal untuk hari ${getDayName(newSchedule.value.day_of_week)} sudah ada.`
    submitting.value = false
    return
  }
  */

  const payload = {
    poly_id: props.poly.id,
    ...newSchedule.value
  }

  const result = await createServiceHour(payload)
  
  if (result.success) {
    await fetchHours() // Refresh list
    // Preserve time settings for easy multiple entry
    newSchedule.value.day_of_week = newSchedule.value.day_of_week < 7 ? newSchedule.value.day_of_week + 1 : 1
  } else {
    error.value = result.error
  }
  
  submitting.value = false
}

const handleDelete = async (hour) => {
  if (!confirm(`Hapus jadwal hari ${getDayName(hour.day_of_week)}?`)) return
  
  const result = await deleteServiceHour(hour.id)
  
  if (result.success) {
    serviceHours.value = serviceHours.value.filter(h => h.id !== hour.id)
  } else {
    error.value = result.error
  }
}

// Lifecycle
onMounted(() => {
  fetchHours()
})
</script>
