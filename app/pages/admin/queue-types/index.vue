<template>
  <AdminLayout>
    <template #title>Manajemen Jenis Antrian</template>

    <!-- Header Actions -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <p class="text-gray-600">Kelola jenis antrian yang tersedia untuk pelanggan</p>
      </div>
      <button
        @click="openCreateModal"
        class="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
      >
        <Plus class="w-5 h-5" />
        Tambah Jenis Antrian
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
      <p class="mt-4 text-gray-500">Memuat data jenis antrian...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="queueTypes.length === 0" class="bg-white rounded-xl p-12 text-center">
      <ListTodo class="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-2">Belum Ada Jenis Antrian</h3>
      <p class="text-gray-500 mb-4">Tambahkan jenis antrian untuk mulai menerima pelanggan.</p>
      <button
        @click="openCreateModal"
        class="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
      >
        <Plus class="w-5 h-5" />
        Tambah Jenis Antrian Pertama
      </button>
    </div>

    <!-- Queue Types Table -->
    <div v-else class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="text-left py-4 px-6 text-sm font-medium text-gray-500">Prefix</th>
              <th class="text-left py-4 px-6 text-sm font-medium text-gray-500">Nama Layanan</th>
              <th class="text-left py-4 px-6 text-sm font-medium text-gray-500">Poli</th>
              <th class="text-left py-4 px-6 text-sm font-medium text-gray-500">Unit</th>
              <th class="text-center py-4 px-6 text-sm font-medium text-gray-500">Rata-rata</th>
              <th class="text-center py-4 px-6 text-sm font-medium text-gray-500">Status</th>
              <th class="text-center py-4 px-6 text-sm font-medium text-gray-500">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="qt in queueTypes" 
              :key="qt.id"
              class="border-b border-gray-100 hover:bg-gray-50 transition"
            >
              <td class="py-4 px-6">
                <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-bold">
                  {{ qt.code_prefix || '-' }}
                </span>
              </td>
              <td class="py-4 px-6">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <ListTodo class="w-5 h-5 text-gray-700" />
                  </div>
                  <span class="font-medium text-gray-900">{{ qt.name }}</span>
                </div>
              </td>
              <td class="py-4 px-6 text-gray-600">{{ qt.poly?.name || '-' }}</td>
              <td class="py-4 px-6 text-gray-600">{{ qt.service_unit || '-' }}</td>
              <td class="py-4 px-6 text-center text-gray-600">
                {{ qt.avg_service_minutes ? `${qt.avg_service_minutes} mnt` : '-' }}
              </td>
              <td class="py-4 px-6 text-center">
                <span 
                  :class="[
                    'px-3 py-1 rounded-full text-xs font-medium',
                    qt.is_active 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-600'
                  ]"
                >
                  {{ qt.is_active ? 'Aktif' : 'Nonaktif' }}
                </span>
              </td>
              <td class="py-4 px-6">
                <div class="flex items-center justify-center gap-2">
                  <button
                    @click="openEditModal(qt)"
                    class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                    title="Edit"
                  >
                    <Pencil class="w-4 h-4" />
                  </button>
                  <button
                    @click="openDeleteModal(qt)"
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
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ isEditing ? 'Edit Jenis Antrian' : 'Tambah Jenis Antrian Baru' }}
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
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Kode Prefix <span class="text-red-500">*</span></label>
              <input
                v-model="formData.code_prefix"
                type="text"
                required
                maxlength="3"
                placeholder="A, B, C"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 uppercase"
              />
              <p class="text-xs text-gray-500 mt-1">Prefix untuk nomor antrian (max 3 karakter)</p>
            </div>

            <div v-if="isEditing">
              <label class="block text-sm font-medium text-gray-700 mb-1">Rata-rata Layanan</label>
              <div class="px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-600">
                <span v-if="editingQueueType?.avg_service_minutes">{{ editingQueueType.avg_service_minutes }} menit</span>
                <span v-else class="text-gray-400 italic">Belum ada data</span>
              </div>
              <p class="text-xs text-gray-500 mt-1">Dihitung otomatis dari data layanan</p>
            </div>
            <div v-else>
              <label class="block text-sm font-medium text-gray-700 mb-1">Rata-rata Layanan</label>
              <div class="px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-400 italic">
                Akan dihitung otomatis
              </div>
              <p class="text-xs text-gray-500 mt-1">Rata-rata dihitung dari data layanan sebenarnya</p>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nama Layanan <span class="text-red-500">*</span></label>
            <input
              v-model="formData.name"
              type="text"
              required
              placeholder="Contoh: Poli Umum, Farmasi, Laboratorium"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Poli Terkait</label>
            <select
              v-model="formData.poly_id"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            >
              <option value="">-- Tidak terkait dengan poli --</option>
              <option v-for="poly in polys" :key="poly.id" :value="poly.id">
                {{ poly.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Unit Layanan</label>
            <select
              v-model="formData.service_unit"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            >
              <option value="">-- Pilih Unit --</option>
              <option value="Rawat Jalan">Rawat Jalan</option>
              <option value="Penunjang">Penunjang</option>
              <option value="Administrasi">Administrasi</option>
            </select>
          </div>

          <div class="flex items-center gap-3">
            <input
              v-model="formData.is_active"
              type="checkbox"
              id="is_active"
              class="w-4 h-4 text-gray-700 focus:ring-gray-900 border-gray-300 rounded"
            />
            <label for="is_active" class="text-sm text-gray-700">Layanan Aktif</label>
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
              {{ submitting ? 'Menyimpan...' : (isEditing ? 'Simpan Perubahan' : 'Tambah Layanan') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <ConfirmModal
      :show="showDeleteModal"
      title="Hapus Jenis Antrian"
      :message="`Apakah Anda yakin ingin menghapus layanan '${queueTypeToDelete?.name}'? Tindakan ini tidak dapat dibatalkan.`"
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
import { Plus, ListTodo, Pencil, Trash2, X, AlertCircle, CheckCircle } from 'lucide-vue-next'
import AdminLayout from '@/components/admin/AdminLayout.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'

definePageMeta({
  middleware: ['admin']
})

const { getQueueTypes, createQueueType, updateQueueType, deleteQueueType } = useAdminQueueTypes()
const { getPolys } = useAdminPolys()

// State
const loading = ref(true)
const submitting = ref(false)
const queueTypes = ref([])
const polys = ref([])
const error = ref(null)
const formError = ref(null)
const successMessage = ref(null)

// Modal state
const showFormModal = ref(false)
const showDeleteModal = ref(false)
const isEditing = ref(false)
const editingId = ref(null)
const editingQueueType = ref(null)
const queueTypeToDelete = ref(null)

// Form data (avg_service_minutes removed - calculated automatically)
const formData = ref({
  name: '',
  code_prefix: '',
  poly_id: '',
  service_unit: '',
  is_active: true
})

// Reset form
const resetForm = () => {
  formData.value = {
    name: '',
    code_prefix: '',
    poly_id: '',
    service_unit: '',
    is_active: true
  }
  isEditing.value = false
  editingId.value = null
  editingQueueType.value = null
  formError.value = null
}

// Open create modal
const openCreateModal = () => {
  resetForm()
  showFormModal.value = true
}

// Open edit modal
const openEditModal = (qt) => {
  isEditing.value = true
  editingId.value = qt.id
  editingQueueType.value = qt // Store original for displaying avg_service_minutes
  formData.value = {
    name: qt.name || '',
    code_prefix: qt.code_prefix || '',
    poly_id: qt.poly_id || '',
    service_unit: qt.service_unit || '',
    is_active: qt.is_active ?? true
  }
  showFormModal.value = true
}

// Close form modal
const closeFormModal = () => {
  showFormModal.value = false
  resetForm()
}

// Open delete modal
const openDeleteModal = (qt) => {
  queueTypeToDelete.value = qt
  showDeleteModal.value = true
}

// Fetch data
const fetchData = async () => {
  loading.value = true
  error.value = null
  
  // Fetch queue types
  const qtResult = await getQueueTypes()
  if (qtResult.success) {
    queueTypes.value = qtResult.data
  } else {
    error.value = qtResult.error
  }
  
  // Fetch polys for dropdown
  const polyResult = await getPolys()
  if (polyResult.success) {
    polys.value = polyResult.data
  }
  
  loading.value = false
}

// Handle form submit
const handleSubmit = async () => {
  submitting.value = true
  error.value = null

  // Prepare data
  const data = {
    ...formData.value,
    code_prefix: formData.value.code_prefix.toUpperCase(),
    poly_id: formData.value.poly_id || null
  }

  let result
  
  if (isEditing.value) {
    result = await updateQueueType(editingId.value, data)
  } else {
    result = await createQueueType(data)
  }

  if (result.success) {
    successMessage.value = result.message
    closeFormModal()
    await fetchData()
    
    setTimeout(() => { successMessage.value = null }, 3000)
  } else {
    // Show error inside modal
    formError.value = result.error
  }

  submitting.value = false
}

// Handle delete
const handleDelete = async () => {
  if (!queueTypeToDelete.value) return

  const result = await deleteQueueType(queueTypeToDelete.value.id)
  
  if (result.success) {
    successMessage.value = result.message
    await fetchData()
    
    setTimeout(() => { successMessage.value = null }, 3000)
  } else {
    error.value = result.error
  }

  showDeleteModal.value = false
  queueTypeToDelete.value = null
}

onMounted(() => {
  fetchData()
})
</script>
