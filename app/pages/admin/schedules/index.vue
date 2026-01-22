<template>
  <AdminLayout>
    <template #title>Manajemen Jadwal Layanan</template>

    <!-- Header Actions -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <p class="text-gray-600">Kelola jadwal layanan dokter</p>
      </div>
      <button
        @click="openCreateModal"
        class="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
      >
        <Plus class="w-5 h-5" />
        Tambah Jadwal
      </button>
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
      <p class="mt-4 text-gray-500">Memuat data jadwal...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="allSchedules.length === 0" class="bg-white rounded-xl p-12 text-center">
      <Calendar class="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-2">Belum Ada Jadwal</h3>
      <p class="text-gray-500 mb-4">Tambahkan jadwal layanan untuk dokter.</p>
      <button
        @click="openCreateModal"
        class="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
      >
        <Plus class="w-5 h-5" />
        Tambah Jadwal Pertama
      </button>
    </div>

    <!-- Schedules Table -->
    <div v-else class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="text-left py-4 px-6 text-sm font-medium text-gray-500">Dokter</th>
              <th class="text-left py-4 px-6 text-sm font-medium text-gray-500">Poli</th>
              <th class="text-center py-4 px-6 text-sm font-medium text-gray-500">Hari</th>
              <th class="text-center py-4 px-6 text-sm font-medium text-gray-500">Jam</th>
              <th class="text-center py-4 px-6 text-sm font-medium text-gray-500">Kuota</th>
              <th class="text-center py-4 px-6 text-sm font-medium text-gray-500">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="schedule in allSchedules" 
              :key="schedule.id"
              class="border-b border-gray-100 hover:bg-gray-50 transition"
            >
              <td class="py-4 px-6">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Stethoscope class="w-5 h-5 text-blue-700" />
                  </div>
                  <span class="font-medium text-gray-900">{{ schedule.doctorName }}</span>
                </div>
              </td>
              <td class="py-4 px-6 text-gray-600">{{ schedule.polyName || '-' }}</td>
              <td class="py-4 px-6 text-center">
                <span class="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                  {{ getDayName(schedule.day_of_week) }}
                </span>
              </td>
              <td class="py-4 px-6 text-center text-gray-600">
                {{ schedule.start_time }} - {{ schedule.end_time }}
              </td>
              <td class="py-4 px-6 text-center">
                <span class="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  {{ schedule.max_quota }} pasien
                </span>
              </td>
              <td class="py-4 px-6">
                <div class="flex items-center justify-center gap-2">
                  <button
                    @click="openEditModal(schedule)"
                    class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                    title="Edit"
                  >
                    <Pencil class="w-4 h-4" />
                  </button>
                  <button
                    @click="openDeleteModal(schedule)"
                    class="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Hapus"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div 
      v-if="showFormModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      @click.self="closeFormModal"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div class="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ isEditing ? 'Edit Jadwal' : 'Tambah Jadwal Baru' }}
          </h3>
          <button @click="closeFormModal" class="p-2 hover:bg-gray-100 rounded-lg transition">
            <X class="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
          <!-- Error in Modal -->
          <div v-if="formError" class="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p class="text-sm text-red-700">{{ formError }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Dokter <span class="text-red-500">*</span></label>
            <select
              v-model="formData.doctor_id"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            >
              <option value="">-- Pilih Dokter --</option>
              <option v-for="doctor in doctors" :key="doctor.id" :value="doctor.id">
                {{ doctor.name }} ({{ doctor.poly?.name || 'Tanpa Poli' }})
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Hari <span class="text-red-500">*</span></label>
            <select
              v-model="formData.day_of_week"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            >
              <option value="">-- Pilih Hari --</option>
              <option :value="1">Senin</option>
              <option :value="2">Selasa</option>
              <option :value="3">Rabu</option>
              <option :value="4">Kamis</option>
              <option :value="5">Jumat</option>
              <option :value="6">Sabtu</option>
              <option :value="7">Minggu</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Jam Mulai <span class="text-red-500">*</span></label>
              <input
                v-model="formData.start_time"
                type="time"
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Jam Selesai <span class="text-red-500">*</span></label>
              <input
                v-model="formData.end_time"
                type="time"
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Kuota Pasien <span class="text-red-500">*</span></label>
            <input
              v-model.number="formData.max_quota"
              type="number"
              required
              min="1"
              placeholder="Contoh: 20"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            />
          </div>

          <div class="flex gap-3 pt-4">
            <button
              type="button"
              @click="closeFormModal"
              class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="submitting"
              class="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
            >
              {{ submitting ? 'Menyimpan...' : (isEditing ? 'Simpan Perubahan' : 'Tambah Jadwal') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <ConfirmModal
      :show="showDeleteModal"
      title="Hapus Jadwal"
      :message="`Apakah Anda yakin ingin menghapus jadwal ini? Tindakan ini tidak dapat dibatalkan.`"
      confirm-text="Ya, Hapus"
      cancel-text="Batal"
      type="danger"
      @confirm="handleDelete"
      @cancel="showDeleteModal = false"
    />
  </AdminLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Plus, Calendar, Stethoscope, Pencil, Trash2, X, AlertCircle, CheckCircle } from 'lucide-vue-next'
import AdminLayout from '@/components/admin/AdminLayout.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'

definePageMeta({
  middleware: ['admin']
})

const { getDoctors } = useAdminDoctors()
const { createSchedule, updateSchedule, deleteSchedule, getDayName } = useAdminSchedules()

// State
const loading = ref(true)
const submitting = ref(false)
const doctors = ref([])
const error = ref(null)
const formError = ref(null)
const successMessage = ref(null)

// Computed - flatten schedules from doctors
const allSchedules = computed(() => {
  const schedules = []
  doctors.value.forEach(doctor => {
    if (doctor.schedules && doctor.schedules.length > 0) {
      doctor.schedules.forEach(schedule => {
        schedules.push({
          ...schedule,
          doctorName: doctor.name,
          doctorId: doctor.id,
          polyName: doctor.poly?.name
        })
      })
    }
  })
  // Sort by day of week, then by start time
  return schedules.sort((a, b) => {
    if (a.day_of_week !== b.day_of_week) {
      return a.day_of_week - b.day_of_week
    }
    return a.start_time.localeCompare(b.start_time)
  })
})

// Modal state
const showFormModal = ref(false)
const showDeleteModal = ref(false)
const isEditing = ref(false)
const editingScheduleId = ref(null)
const scheduleToDelete = ref(null)

// Form data
const formData = ref({
  doctor_id: '',
  day_of_week: '',
  start_time: '',
  end_time: '',
  max_quota: 20
})

// Reset form
const resetForm = () => {
  formData.value = {
    doctor_id: '',
    day_of_week: '',
    start_time: '',
    end_time: '',
    max_quota: 20
  }
  isEditing.value = false
  editingScheduleId.value = null
  formError.value = null
}

// Open create modal
const openCreateModal = () => {
  resetForm()
  showFormModal.value = true
}

// Open edit modal
const openEditModal = (schedule) => {
  isEditing.value = true
  editingScheduleId.value = schedule.id
  formData.value = {
    doctor_id: schedule.doctor_id || schedule.doctorId,
    day_of_week: schedule.day_of_week,
    start_time: schedule.start_time,
    end_time: schedule.end_time,
    max_quota: schedule.max_quota
  }
  showFormModal.value = true
}

// Close form modal
const closeFormModal = () => {
  showFormModal.value = false
  resetForm()
}

// Open delete modal
const openDeleteModal = (schedule) => {
  scheduleToDelete.value = schedule
  showDeleteModal.value = true
}

// Fetch doctors (includes schedules)
const fetchDoctors = async () => {
  loading.value = true
  error.value = null
  
  const result = await getDoctors()
  
  if (result.success) {
    doctors.value = result.data
  } else {
    error.value = result.error
  }
  
  loading.value = false
}

// Handle form submit (create/update)
const handleSubmit = async () => {
  submitting.value = true
  formError.value = null

  const data = {
    ...formData.value,
    day_of_week: parseInt(formData.value.day_of_week)
  }

  let result
  
  if (isEditing.value) {
    result = await updateSchedule(editingScheduleId.value, data)
  } else {
    result = await createSchedule(data)
  }

  if (result.success) {
    successMessage.value = result.message
    closeFormModal()
    await fetchDoctors()
    
    setTimeout(() => { successMessage.value = null }, 3000)
  } else {
    formError.value = result.error
  }

  submitting.value = false
}

// Handle delete
const handleDelete = async () => {
  if (!scheduleToDelete.value) return

  const result = await deleteSchedule(scheduleToDelete.value.id)
  
  if (result.success) {
    successMessage.value = result.message
    await fetchDoctors()
    
    setTimeout(() => { successMessage.value = null }, 3000)
  } else {
    error.value = result.error
  }

  showDeleteModal.value = false
  scheduleToDelete.value = null
}

onMounted(() => {
  fetchDoctors()
})
</script>
