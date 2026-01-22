<template>
  <AdminLayout>
    <template #title>Manajemen Poliklinik</template>

    <!-- Header Actions -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <p class="text-gray-600">Kelola data poliklinik rumah sakit</p>
      </div>
      <button
        @click="openCreateModal"
        class="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
      >
        <Plus class="w-5 h-5" />
        Tambah Poli
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
      <p class="mt-4 text-gray-500">Memuat data poli...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="polys.length === 0" class="bg-white rounded-xl p-12 text-center">
      <Building2 class="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-2">Belum Ada Data Poli</h3>
      <p class="text-gray-500 mb-4">Tambahkan poli pertama untuk memulai.</p>
      <button
        @click="openCreateModal"
        class="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
      >
        <Plus class="w-5 h-5" />
        Tambah Poli Pertama
      </button>
    </div>

    <!-- Polys Table -->
    <div v-else class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="text-left py-4 px-6 text-sm font-medium text-gray-500">Kode</th>
              <th class="text-left py-4 px-6 text-sm font-medium text-gray-500">Nama Poli</th>
              <th class="text-left py-4 px-6 text-sm font-medium text-gray-500">Lokasi</th>
              <th class="text-center py-4 px-6 text-sm font-medium text-gray-500">Status</th>
              <th class="text-center py-4 px-6 text-sm font-medium text-gray-500">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="poly in paginatedPolys" 
              :key="poly.id"
              class="border-b border-gray-100 hover:bg-gray-50 transition"
            >
              <td class="py-4 px-6">
                <span class="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
                  {{ poly.code || '-' }}
                </span>
              </td>
              <td class="py-4 px-6">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Building2 class="w-5 h-5 text-gray-700" />
                  </div>
                  <span class="font-medium text-gray-900">{{ poly.name }}</span>
                </div>
              </td>
              <td class="py-4 px-6 text-gray-600">{{ poly.location || '-' }}</td>
              <td class="py-4 px-6 text-center">
                <span 
                  :class="[
                    'px-3 py-1 rounded-full text-xs font-medium',
                    poly.is_active 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-600'
                  ]"
                >
                  {{ poly.is_active ? 'Aktif' : 'Nonaktif' }}
                </span>
              </td>
              <td class="py-4 px-6">
                <div class="flex items-center justify-center gap-2">
                  <button
                    @click="openHoursModal(poly)"
                    class="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                    title="Jam Layanan"
                  >
                    <Clock class="w-4 h-4" />
                  </button>
                  <button
                    @click="openEditModal(poly)"
                    class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                    title="Edit"
                  >
                    <Pencil class="w-4 h-4" />
                  </button>
                  <button
                    @click="openDeleteModal(poly)"
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
      
      <!-- Pagination -->
      <div class="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div class="text-sm text-gray-500">
          Menampilkan {{ paginationInfo.start }} - {{ paginationInfo.end }} dari {{ polys.length }} poli
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="prevPage"
            :disabled="currentPage === 1"
            class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>
          
          <template v-for="page in visiblePages" :key="page">
            <button
              v-if="page !== '...'"
              @click="goToPage(page)"
              :class="[
                'px-3 py-1.5 border rounded-lg text-sm font-medium transition',
                currentPage === page
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'border-gray-300 hover:bg-gray-100'
              ]"
            >
              {{ page }}
            </button>
            <span v-else class="px-2 text-gray-400">...</span>
          </template>
          
          <button
            @click="nextPage"
            :disabled="currentPage === totalPages"
            class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition"
          >
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>
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
            {{ isEditing ? 'Edit Poli' : 'Tambah Poli Baru' }}
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
            <label class="block text-sm font-medium text-gray-700 mb-1">Kode Poli</label>
            <input
              v-model="formData.code"
              type="text"
              placeholder="Contoh: POLI-UMUM"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nama Poli <span class="text-red-500">*</span></label>
            <input
              v-model="formData.name"
              type="text"
              required
              placeholder="Contoh: Poli Umum"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Lokasi</label>
            <input
              v-model="formData.location"
              type="text"
              placeholder="Contoh: Lantai 1, Ruang 101"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div class="flex items-center gap-3">
            <input
              v-model="formData.is_active"
              type="checkbox"
              id="is_active"
              class="w-4 h-4 text-gray-700 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label for="is_active" class="text-sm text-gray-700">Poli Aktif</label>
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
              {{ submitting ? 'Menyimpan...' : (isEditing ? 'Simpan Perubahan' : 'Tambah Poli') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Service Hours Modal -->
    <ServiceHoursModal
      v-if="showHoursModal"
      :poly="selectedPolyForHours"
      @close="showHoursModal = false"
    />

    <!-- Delete Confirmation Modal -->
    <ConfirmModal
      :show="showDeleteModal"
      title="Hapus Poli"
      :message="`Apakah Anda yakin ingin menghapus poli '${polyToDelete?.name}'? Tindakan ini tidak dapat dibatalkan.`"
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
import { Plus, Building2, Pencil, Trash2, X, AlertCircle, CheckCircle, ChevronLeft, ChevronRight, Clock } from 'lucide-vue-next'
import AdminLayout from '@/components/admin/AdminLayout.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import ServiceHoursModal from '@/components/admin/polys/ServiceHoursModal.vue'

definePageMeta({
  middleware: ['admin']
})

const { getPolys, createPoly, updatePoly, deletePoly } = useAdminPolys()

// State
const loading = ref(true)
const submitting = ref(false)
const polys = ref([])
const error = ref(null)
const formError = ref(null)
const successMessage = ref(null)

// Pagination
const currentPage = ref(1)
const itemsPerPage = 10

// Computed - paginated polys
const paginatedPolys = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return polys.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(polys.value.length / itemsPerPage) || 1
})

const paginationInfo = computed(() => {
  const start = Math.min((currentPage.value - 1) * itemsPerPage + 1, polys.value.length)
  const end = Math.min(currentPage.value * itemsPerPage, polys.value.length)
  return { start, end }
})

const visiblePages = computed(() => {
  const pages = []
  const total = totalPages.value
  const current = currentPage.value
  
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    if (current <= 3) {
      pages.push(1, 2, 3, 4, '...', total)
    } else if (current >= total - 2) {
      pages.push(1, '...', total - 3, total - 2, total - 1, total)
    } else {
      pages.push(1, '...', current - 1, current, current + 1, '...', total)
    }
  }
  return pages
})

// Pagination functions
const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++
}

// Modal state
const showFormModal = ref(false)
const showDeleteModal = ref(false)
const showHoursModal = ref(false)
const isEditing = ref(false)
const editingPolyId = ref(null)
const polyToDelete = ref(null)
const selectedPolyForHours = ref(null)

// Form data
const formData = ref({
  code: '',
  name: '',
  location: '',
  is_active: true
})

// Reset form
const resetForm = () => {
  formData.value = {
    code: '',
    name: '',
    location: '',
    is_active: true
  }
  isEditing.value = false
  editingPolyId.value = null
  formError.value = null
}

// Open create modal
const openCreateModal = () => {
  resetForm()
  showFormModal.value = true
}

// Open edit modal
const openEditModal = (poly) => {
  isEditing.value = true
  editingPolyId.value = poly.id
  formData.value = {
    code: poly.code || '',
    name: poly.name || '',
    location: poly.location || '',
    is_active: poly.is_active ?? true
  }
  showFormModal.value = true
}

// Open hours modal
const openHoursModal = (poly) => {
  selectedPolyForHours.value = poly
  showHoursModal.value = true
}

// Close form modal
const closeFormModal = () => {
  showFormModal.value = false
  resetForm()
}

// Open delete modal
const openDeleteModal = (poly) => {
  polyToDelete.value = poly
  showDeleteModal.value = true
}

// Fetch polys
const fetchPolys = async () => {
  loading.value = true
  error.value = null
  
  const result = await getPolys()
  
  if (result.success) {
    polys.value = result.data
  } else {
    error.value = result.error
  }
  
  loading.value = false
}

// Handle form submit (create/update)
const handleSubmit = async () => {
  submitting.value = true
  formError.value = null

  let result
  
  if (isEditing.value) {
    result = await updatePoly(editingPolyId.value, formData.value)
  } else {
    result = await createPoly(formData.value)
  }

  if (result.success) {
    successMessage.value = result.message
    closeFormModal()
    await fetchPolys()
    
    // Auto-hide success message
    setTimeout(() => { successMessage.value = null }, 3000)
  } else {
    // Show error inside modal
    formError.value = result.error
  }

  submitting.value = false
}

// Handle delete
const handleDelete = async () => {
  if (!polyToDelete.value) return

  const result = await deletePoly(polyToDelete.value.id)
  
  if (result.success) {
    successMessage.value = result.message
    await fetchPolys()
    
    setTimeout(() => { successMessage.value = null }, 3000)
  } else {
    error.value = result.error
  }

  showDeleteModal.value = false
  polyToDelete.value = null
}

onMounted(() => {
  fetchPolys()
})
</script>
