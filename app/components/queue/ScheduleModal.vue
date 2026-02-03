<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { X, Calendar, Clock, User, MapPin, Loader2, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  polyId: {
    type: String,
    default: null
  },
  polyName: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close'])

const { loading, error, dayNames, fetchDoctors, getSchedulesByPoly, getPolyInfo, getAllPolys } = useDoctorSchedules()

const weeklySchedule = ref({})
const polyInfo = ref(null)
const availablePolys = ref([])
const activePolyId = ref(null)

// Current day for highlighting
const todayNumber = computed(() => {
  const day = new Date().getDay()
  return day === 0 ? 7 : day // Convert Sunday (0) to 7
})

// Initialize data
const initData = async () => {
  await fetchDoctors()
  availablePolys.value = getAllPolys()
  
  // If prop provided, use it
  if (props.polyId) {
    activePolyId.value = props.polyId
  } 
  // Otherwise default to first poly
  else if (availablePolys.value.length > 0 && !activePolyId.value) {
    activePolyId.value = availablePolys.value[0].id
  }
  
  updateSchedule()
}

// Update schedule based on active selection
const updateSchedule = () => {
  if (activePolyId.value) {
    weeklySchedule.value = getSchedulesByPoly(activePolyId.value)
    polyInfo.value = getPolyInfo(activePolyId.value)
  }
}

// Load schedule when modal opens
watch(() => props.show, (isVisible) => {
  if (isVisible) {
    initData()
  }
}, { immediate: true })

// Watch for internal selection change
watch(activePolyId, () => {
  updateSchedule()
})

const closeModal = () => {
  emit('close')
}

// Handle backdrop click
const handleBackdropClick = (e) => {
  if (e.target === e.currentTarget) {
    closeModal()
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show"
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        @click="handleBackdropClick"
      >
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-4"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 translate-y-4"
        >
          <div
            v-if="show"
            class="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            <!-- Header -->
            <div class="bg-white border-b border-gray-100 p-6 pb-0">
              <div class="flex items-center justify-between mb-6">
                <div>
                  <h2 class="text-2xl font-bold flex items-center gap-2 text-gray-900">
                    <Calendar class="w-6 h-6 text-blue-600" />
                    Jadwal Dokter
                  </h2>
                  <p class="text-gray-500 mt-1">
                    Informasi jadwal praktek dokter di semua layanan
                  </p>
                </div>
                <button
                  @click="closeModal"
                  class="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                >
                  <X class="w-6 h-6" />
                </button>
              </div>

              <!-- Poly Selector (Tabs) -->
              <div class="flex gap-2 overflow-x-auto pb-4 no-scrollbar scroll-smooth">
                 <button
                   v-for="poly in availablePolys"
                   :key="poly.id"
                   @click="activePolyId = poly.id"
                   class="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border"
                   :class="activePolyId === poly.id 
                     ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                     : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'"
                 >
                   {{ poly.name }}
                 </button>
              </div>
            </div>

            <!-- Content -->
            <div class="flex-1 overflow-y-auto p-6 bg-gray-50/50">
              <!-- Loading State -->
              <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="text-center">
                  <Loader2 class="w-10 h-10 animate-spin text-blue-500 mx-auto mb-3" />
                  <p class="text-gray-500">Memuat jadwal...</p>
                </div>
              </div>

              <!-- Error State -->
              <div v-else-if="error" class="text-center py-12">
                <p class="text-red-500">Gagal memuat jadwal. Silakan coba lagi.</p>
              </div>
              
              <!-- Empty State if no polys -->
              <div v-else-if="availablePolys.length === 0" class="text-center py-12">
                 <p class="text-gray-500">Tidak ada data jadwal tersedia.</p>
              </div>

              <!-- Schedule Grid -->
              <div v-else class="animate-fadeIn">
                <!-- Active Poly Info -->
                <div v-if="polyInfo" class="mb-6 flex items-center gap-2 text-sm text-blue-700 bg-blue-50 px-4 py-3 rounded-lg border border-blue-100">
                  <MapPin class="w-4 h-4" />
                  <span class="font-medium">Lokasi:</span> {{ polyInfo.location }}
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  <div
                    v-for="day in 7"
                    :key="day"
                    class="bg-white border rounded-xl overflow-hidden transition-all duration-200 flex flex-col h-full"
                    :class="{
                      'border-blue-500 ring-2 ring-blue-200 shadow-lg relative z-10': day === todayNumber,
                      'border-gray-200 hover:border-gray-300 hover:shadow': day !== todayNumber
                    }"
                  >
                    <!-- Day Header -->
                    <div
                      class="px-4 py-3 font-semibold text-center border-b"
                      :class="{
                        'bg-blue-600 text-white border-blue-600': day === todayNumber,
                        'bg-gray-50 text-gray-700 border-gray-200': day !== todayNumber
                      }"
                    >
                      <span class="text-sm">{{ dayNames[day] }}</span>
                      <span
                        v-if="day === todayNumber"
                        class="ml-2 text-[10px] uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full"
                      >
                        Hari Ini
                      </span>
                    </div>

                    <!-- Doctors List -->
                    <div class="p-3 flex-1">
                      <!-- If no doctors -->
                      <div
                        v-if="!weeklySchedule[day]?.doctors?.length"
                        class="flex flex-col items-center justify-center h-full min-h-[100px] text-gray-400"
                      >
                        <User class="w-8 h-8 opacity-20 mb-2" />
                        <p class="text-xs">Tidak ada praktek</p>
                      </div>

                      <!-- Doctor Cards -->
                      <div v-else class="space-y-3">
                        <div
                          v-for="doctor in weeklySchedule[day]?.doctors"
                          :key="doctor.id"
                          class="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors border border-gray-100"
                        >
                          <!-- Doctor Name -->
                          <div class="flex items-start gap-2 mb-2">
                             <!-- Avatar -->
                            <div class="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                              <User class="w-4 h-4 text-gray-600" />
                            </div>
                            <div class="flex-1 min-w-0">
                              <p class="font-medium text-gray-900 text-sm truncate leading-tight">
                                {{ doctor.name }}
                              </p>
                              <p class="text-[11px] text-blue-600 mt-0.5 truncate">
                                {{ doctor.specialization }}
                              </p>
                            </div>
                          </div>

                          <!-- Schedule Time -->
                          <div class="flex items-center justify-between text-xs mt-2">
                             <div class="flex items-center gap-1.5 text-gray-600 bg-white px-2 py-1 rounded border border-gray-200">
                                <Clock class="w-3 h-3 text-gray-400" />
                                <span class="font-mono font-medium">
                                  {{ doctor.startTime }} - {{ doctor.endTime }}
                                </span>
                             </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Legend -->
              <div class="mt-8 pt-6 border-t border-gray-200">
                <div class="flex flex-wrap gap-6 text-sm text-gray-500 justify-center">
                  <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full bg-blue-600"></div>
                    <span>Hari Ini</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full bg-white border border-gray-300"></div>
                    <span>Hari Lain</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="px-6 py-4 bg-white border-t border-gray-100 flex justify-end">
              <button
                @click="closeModal"
                class="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
