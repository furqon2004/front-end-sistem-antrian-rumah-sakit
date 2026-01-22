<script setup>
import { computed, ref, onMounted } from 'vue'
import { Clock, Activity, AlertCircle, Users } from 'lucide-vue-next'

defineEmits(['selectQueue'])

const props = defineProps({
  queueType: {
    type: Object,
    required: true
  }
})

// Track if component is mounted (client-side) to avoid SSR hydration mismatch
const isMounted = ref(false)

onMounted(() => {
  // Set mounted after a small delay to ensure hydration is complete
  isMounted.value = true
})

// Format average service time
const formatServiceTime = (minutes) => {
  if (!minutes) return 'N/A'
  if (minutes < 60) return `${minutes} menit`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}j ${mins}m` : `${hours} jam`
}

// Calculate Status based on Service Hours
// IMPORTANT: Only calculate actual open/closed status on client-side to prevent SSR mismatch
const statusInfo = computed(() => {
  if (!props.queueType.is_active) {
    return { isClosed: true, label: 'Tidak Aktif', color: 'bg-gray-200 text-gray-700' }
  }

  const hours = props.queueType.service_hours
  if (!hours || !hours.is_active) {
     // If no hours defined, assume open
     return { isClosed: false, label: 'Buka', color: 'bg-green-100 text-green-700' }
  }

  // CRITICAL: During SSR or before hydration, always return "open" state
  // This prevents hydration mismatch due to timezone differences
  if (!isMounted.value) {
    return { isClosed: false, label: 'Buka', color: 'bg-green-100 text-green-700' }
  }

  // Check time - only runs on client after mount
  const now = new Date()
  const currentHours = now.getHours()
  const currentMinutes = now.getMinutes()
  
  if (!hours.open_time || !hours.close_time) {
     return { isClosed: true, label: 'Jadwal Belum Diatur', color: 'bg-gray-100 text-gray-500' }
  }
  
  // Parse Open Time (e.g., "08:00")
  const [openH, openM] = hours.open_time.split(':').map(Number)
  const [closeH, closeM] = hours.close_time.split(':').map(Number)
  
  const nowMinutes = currentHours * 60 + currentMinutes
  const openMinutes = openH * 60 + openM
  const closeMinutes = closeH * 60 + closeM
  
  if (nowMinutes < openMinutes) {
    return { isClosed: true, label: `Tutup (Buka ${hours.open_time.substring(0,5)})`, color: 'bg-orange-100 text-orange-700' }
  }
  
  if (nowMinutes > closeMinutes) {
    return { isClosed: true, label: 'Tutup (Jam Layanan Berakhir)', color: 'bg-red-100 text-red-700' }
  }
  
  return { isClosed: false, label: 'Buka', color: 'bg-green-100 text-green-700' }
})

const quotaInfo = computed(() => {
  const maxQuota = props.queueType.quota || 0
  // Use remaining_quota directly from API if available (this decreases when patient checks out)
  const remainingQuota = props.queueType.remaining_quota !== undefined 
    ? props.queueType.remaining_quota 
    : (maxQuota > 0 ? Math.max(0, maxQuota - (props.queueType.today_count || 0)) : null)
  
  if (maxQuota <= 0) {
    return { max: 0, remaining: null, display: 'Unlimited' }
  }
  
  const remaining = remainingQuota !== null ? remainingQuota : maxQuota
  return { 
    max: maxQuota, 
    remaining: remaining,
    display: `${remaining}/${maxQuota}`
  }
})

const operatingHours = computed(() => {
  const h = props.queueType.service_hours
  if (!h) return '24 Jam' // Fallback
  return `${h.open_time.substring(0,5)} - ${h.close_time.substring(0,5)}`
})
</script>

<template>
  <div
    class="border rounded-xl p-6 bg-white relative transition-all duration-200 ease-out hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] focus-within:shadow-lg flex flex-col"
  >
    <!-- Status Badge -->
    <span
      class="absolute top-4 right-4 text-xs px-3 py-1 rounded-full font-medium"
      :class="statusInfo.color"
    >
      {{ statusInfo.label }}
    </span>

    <!-- Icon -->
    <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
      <Activity class="w-6 h-6 text-gray-700" />
    </div>

    <!-- Title -->
    <h3 class="font-semibold text-lg mb-1">
      {{ queueType.name }}
    </h3>
    
    <!-- Code Prefix -->
    <p class="text-sm text-gray-500 mb-4">
      Kode: <span class="font-mono font-medium">{{ queueType.code_prefix }}</span>
    </p>

    <!-- Info Grid -->
    <div class="space-y-2 mb-6 text-sm text-gray-600">
      <div class="flex items-center justify-between">
        <span class="flex items-center gap-2"><Clock class="w-4 h-4 text-gray-400" /> Jam Layanan</span>
        <span class="font-medium text-gray-900">{{ operatingHours }}</span>
      </div>
      <div class="flex items-center justify-between">
        <span class="flex items-center gap-2"><Clock class="w-4 h-4 text-gray-400" /> Est. Waktu</span>
        <span class="font-medium text-gray-900">{{ formatServiceTime(queueType.avg_service_minutes) }}</span>
      </div>
      <div class="flex items-center justify-between">
        <span class="flex items-center gap-2"><Users class="w-4 h-4 text-gray-400" /> Kuota Harian</span>
        <span 
          class="font-medium"
          :class="quotaInfo.remaining !== null && quotaInfo.remaining <= 5 ? 'text-orange-600' : 'text-gray-900'"
        >
          {{ quotaInfo.display }}
        </span>
      </div>
    </div>

    <!-- Action Button -->
    <button
      class="mt-auto w-full py-3 rounded-xl font-medium text-sm transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
      :class="!statusInfo.isClosed 
        ? 'bg-black text-white hover:bg-gray-800' 
        : 'bg-gray-100 text-gray-400'"
      :disabled="!queueType.is_active || statusInfo.isClosed"
      @click="$emit('selectQueue', queueType)"
    >
      <span v-if="!queueType.is_active">Layanan Tidak Aktif</span>
      <span v-else-if="statusInfo.isClosed">Layanan Tutup</span>
      <span v-else>Ambil Nomor Antrian</span>
    </button>
  </div>
</template>
