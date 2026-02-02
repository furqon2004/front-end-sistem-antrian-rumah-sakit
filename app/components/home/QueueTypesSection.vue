<script setup>
import QueueTypeCard from '@/components/queue/QueueTypeCard.vue'
import { Loader2, AlertCircle } from 'lucide-vue-next'
import { onMounted, onUnmounted, computed } from 'vue'

const emit = defineEmits(['selectQueue'])

// Fetch queue types from API
const { queueTypes, loading, error, refresh } = useQueueTypes()

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
    <h2 class="text-3xl font-bold mb-2">
      Jenis Layanan Antrian
    </h2>
    <p class="text-gray-600 mb-10">
      Pilih jenis layanan yang Anda butuhkan
    </p>

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
  </section>
</template>
