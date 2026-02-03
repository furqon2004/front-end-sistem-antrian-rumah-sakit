<script setup>
import QueueTypeCard from '@/components/queue/QueueTypeCard.vue'
import ScheduleModal from '@/components/queue/ScheduleModal.vue'
import { Loader2, AlertCircle, Calendar } from 'lucide-vue-next'
import { onMounted, onUnmounted, computed, ref } from 'vue'

const emit = defineEmits(['selectQueue'])

// Fetch queue types from API
const { queueTypes, loading, error, refresh } = useQueueTypes()

// Modal State
const showScheduleModal = ref(false)
// We don't need selectedPoly here anymore as the modal will handle selection/listing
const selectedPoly = ref({ id: null, name: '' })

const openScheduleModal = () => {
  // Reset selected poly so modal starts fresh or shows default
  selectedPoly.value = { id: null, name: '' }
  showScheduleModal.value = true
}

// Filter only active queue types
const activeQueueTypes = computed(() => {
  if (!queueTypes.value) return []
  return queueTypes.value.filter(qt => qt.is_active)
})

// Auto-refresh when user returns to this tab (visibility change)
// This ensures admin changes are reflected when customer switches back
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    console.log('📋 Page became visible, refreshing queue types...')
    refresh()
  }
}

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

// Expose refresh function for parent component
defineExpose({ refresh })
</script>

<template>
  <section class="py-20 bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 md:px-6">
    <div class="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
      <div>
        <h2 class="text-3xl font-bold mb-2">
          Jenis Layanan Antrian
        </h2>
        <p class="text-gray-600">
          Pilih jenis layanan yang Anda butuhkan
        </p>
      </div>
      
      <button
        @click="openScheduleModal"
        class="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm font-medium"
      >
        <Calendar class="w-5 h-5 text-blue-600" />
        Lihat Seluruh Jadwal 
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <Loader2 class="w-12 h-12 animate-spin text-gray-400 mx-auto mb-4" />
        <p class="text-gray-500">Memuat data layanan...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex items-center justify-center py-20">
      <div class="text-center max-w-md">
        <AlertCircle class="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 class="text-lg font-semibold mb-2">Gagal Memuat Data</h3>
        <p class="text-gray-600 mb-4">
          Tidak dapat terhubung ke server. Silakan coba lagi beberapa saat lagi.
        </p>
        <button
          @click="refresh"
          class="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!activeQueueTypes || activeQueueTypes.length === 0" class="text-center py-20">
      <p class="text-gray-500">Tidak ada layanan antrian yang tersedia saat ini.</p>
    </div>

    <!-- Queue Types Grid -->
    <div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <QueueTypeCard
        v-for="queueType in activeQueueTypes"
        :key="queueType.id"
        :queue-type="queueType"
        @selectQueue="$emit('selectQueue', $event)"
      />
    </div>
    </div>

    <!-- Schedule Modal -->
    <ScheduleModal
      :show="showScheduleModal"
      :poly-id="selectedPoly.id"
      :poly-name="selectedPoly.name"
      @close="showScheduleModal = false"
    />
  </section>
</template>
