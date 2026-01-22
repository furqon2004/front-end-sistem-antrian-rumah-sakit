<template>
  <AdminLayout>
    <template #title>Manajemen Dokter</template>

    <!-- Header Actions -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <p class="text-gray-600">Kelola data dokter rumah sakit</p>
      </div>
      <button
        @click="openCreateModal"
        class="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
      >
        <Plus class="w-5 h-5" />
        Tambah Dokter
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
      <p class="mt-4 text-gray-500">Memuat data dokter...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="doctors.length === 0" class="bg-white rounded-xl p-12 text-center">
      <Stethoscope class="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-2">Belum Ada Data Dokter</h3>
      <p class="text-gray-500 mb-4">Tambahkan dokter pertama untuk memulai.</p>
      <button
        @click="openCreateModal"
        class="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
      >
        <Plus class="w-5 h-5" />
        Tambah Dokter Pertama
      </button>
    </div>

    <!-- Doctors Table -->
    <div v-else class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="text-left py-4 px-6 text-sm font-medium text-gray-500">Nama Dokter</th>
              <th class="text-left py-4 px-6 text-sm font-medium text-gray-500">No. SIP</th>
              <th class="text-left py-4 px-6 text-sm font-medium text-gray-500">Spesialisasi</th>
              <th class="text-left py-4 px-6 text-sm font-medium text-gray-500">Poli</th>
              <th class="text-center py-4 px-6 text-sm font-medium text-gray-500">Jadwal</th>
              <th class="text-center py-4 px-6 text-sm font-medium text-gray-500">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="doctor in doctors" 
              :key="doctor.id"
              class="border-b border-gray-100 hover:bg-gray-50 transition"
            >
              <td class="py-4 px-6">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Stethoscope class="w-5 h-5 text-blue-700" />
                  </div>
                  <span class="font-medium text-gray-900">{{ doctor.name }}</span>
                </div>
              </td>
              <td class="py-4 px-6">
                <span class="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
                  {{ doctor.sip_number || '-' }}
                </span>
              </td>
              <td class="py-4 px-6 text-gray-600">{{ doctor.specialization || '-' }}</td>
              <td class="py-4 px-6 text-gray-600">{{ doctor.poly?.name || '-' }}</td>
              <td class="py-4 px-6 text-center">
                <span class="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  {{ doctor.schedules?.length || 0 }} jadwal
                </span>
              </td>
              <td class="py-4 px-6">
                <div class="flex items-center justify-center gap-2">
                  <button
                    @click="openEditModal(doctor)"
                    class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                    title="Edit"
                  >
                    <Pencil class="w-4 h-4" />
                  </button>
                  <button
                    @click="openDeleteModal(doctor)"
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
            {{ isEditing ? 'Edit Dokter' : 'Tambah Dokter Baru' }}
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
            <label class="block text-sm font-medium text-gray-700 mb-1">Nama Dokter <span class="text-red-500">*</span></label>
            <input
              v-model="formData.name"
              type="text"
              required
              placeholder="Contoh: dr. Ahmad Suryadi"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">No. SIP</label>
            <input
              v-model="formData.sip_number"
              type="text"
              placeholder="Contoh: SIP-001-2024"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Spesialisasi</label>
            <input
              v-model="formData.specialization"
              type="text"
              placeholder="Contoh: Dokter Umum, Spesialis Anak"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Poli <span class="text-red-500">*</span></label>
            <select
              v-model="formData.poly_id"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            >
              <option value="">-- Pilih Poli --</option>
              <option v-for="poly in polys" :key="poly.id" :value="poly.id">
                {{ poly.name }}
              </option>
            </select>
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
              {{ submitting ? 'Menyimpan...' : (isEditing ? 'Simpan Perubahan' : 'Tambah Dokter') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <ConfirmModal
      :show="showDeleteModal"
      title="Hapus Dokter"
      :message="`Apakah Anda yakin ingin menghapus dokter '${doctorToDelete?.name}'? Tindakan ini tidak dapat dibatalkan.`"
      confirm-text="Ya, Hapus"
      cancel-text="Batal"
      type="danger"
      @confirm="handleDelete"
      @cancel="showDeleteModal = false"
    />
  </AdminLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Plus, Stethoscope, Pencil, Trash2, X, AlertCircle, CheckCircle } from 'lucide-vue-next'
import AdminLayout from '@/components/admin/AdminLayout.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'

definePageMeta({
  middleware: ['admin']
})

const { getDoctors, createDoctor, updateDoctor, deleteDoctor } = useAdminDoctors()
const { getPolys } = useAdminPolys()

// State
const loading = ref(true)
const submitting = ref(false)
const doctors = ref([])
const polys = ref([])
const error = ref(null)
const formError = ref(null)
const successMessage = ref(null)

// Modal state
const showFormModal = ref(false)
const showDeleteModal = ref(false)
const isEditing = ref(false)
const editingDoctorId = ref(null)
const doctorToDelete = ref(null)

// Form data
const formData = ref({
  name: '',
  sip_number: '',
  specialization: '',
  poly_id: ''
})

// Reset form
const resetForm = () => {
  formData.value = {
    name: '',
    sip_number: '',
    specialization: '',
    poly_id: ''
  }
  isEditing.value = false
  editingDoctorId.value = null
  formError.value = null
}

// Open create modal
const openCreateModal = () => {
  resetForm()
  showFormModal.value = true
}

// Open edit modal
const openEditModal = (doctor) => {
  isEditing.value = true
  editingDoctorId.value = doctor.id
  formData.value = {
    name: doctor.name || '',
    sip_number: doctor.sip_number || '',
    specialization: doctor.specialization || '',
    poly_id: doctor.poly_id || ''
  }
  showFormModal.value = true
}

// Close form modal
const closeFormModal = () => {
  showFormModal.value = false
  resetForm()
}

// Open delete modal
const openDeleteModal = (doctor) => {
  doctorToDelete.value = doctor
  showDeleteModal.value = true
}

// Fetch doctors
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

// Fetch polys for dropdown
const fetchPolys = async () => {
  const result = await getPolys()
  if (result.success) {
    polys.value = result.data
  }
}

// Handle form submit (create/update)
const handleSubmit = async () => {
  submitting.value = true
  formError.value = null

  let result
  
  if (isEditing.value) {
    result = await updateDoctor(editingDoctorId.value, formData.value)
  } else {
    result = await createDoctor(formData.value)
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
  if (!doctorToDelete.value) return

  const result = await deleteDoctor(doctorToDelete.value.id)
  
  if (result.success) {
    successMessage.value = result.message
    await fetchDoctors()
    
    setTimeout(() => { successMessage.value = null }, 3000)
  } else {
    error.value = result.error
  }

  showDeleteModal.value = false
  doctorToDelete.value = null
}

onMounted(() => {
  fetchDoctors()
  fetchPolys()
})
</script>
