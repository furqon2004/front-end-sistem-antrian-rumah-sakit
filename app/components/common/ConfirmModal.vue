<script setup>
import { X, AlertTriangle } from 'lucide-vue-next'

const props = defineProps({
  show: Boolean,
  title: {
    type: String,
    default: 'Konfirmasi'
  },
  message: {
    type: String,
    required: true
  },
  confirmText: {
    type: String,
    default: 'Ya, Hapus'
  },
  cancelText: {
    type: String,
    default: 'Batal'
  }
})

const emit = defineEmits(['confirm', 'cancel', 'close'])

const handleConfirm = () => {
  emit('confirm')
  emit('close')
}

const handleCancel = () => {
  emit('cancel')
  emit('close')
}
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex items-center justify-center"
  >
    <!-- BACKDROP -->
    <div
      class="absolute inset-0 bg-black/50"
      @click="handleCancel"
    />

    <!-- MODAL -->
    <div
      class="relative bg-white rounded-2xl w-full max-w-md p-6 mx-4 shadow-2xl"
    >
      <!-- ICON -->
      <div class="flex justify-center mb-4">
        <div class="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
          <AlertTriangle class="w-8 h-8 text-red-600" />
        </div>
      </div>

      <!-- TITLE -->
      <h2 class="text-xl font-bold text-center mb-2">
        {{ title }}
      </h2>

      <!-- MESSAGE -->
      <p class="text-gray-600 text-center mb-6 whitespace-pre-line">
        {{ message }}
      </p>

      <!-- ACTIONS -->
      <div class="flex gap-3">
        <button
          @click="handleCancel"
          class="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition"
        >
          {{ cancelText }}
        </button>
        <button
          @click="handleConfirm"
          class="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>
