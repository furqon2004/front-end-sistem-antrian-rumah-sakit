<script setup>
import PoliCard from '@/components/queue/PoliCard.vue'

defineProps({
  polis: Array
})
defineEmits(['takeQueue'])
</script>

<template>
  <section id="department" class="max-w-7xl mx-auto px-4 md:px-6 py-20">
    <h2 class="text-3xl font-bold mb-2">
      Pilih Departemen
    </h2>
    <p class="text-gray-600 mb-10">
      Ambil nomor antrian sesuai kebutuhan layanan kesehatan Anda
    </p>

    <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <PoliCard v-for="poli in polis" :key="poli.id" :poli="poli" mode="department" @takeQueue="$emit('takeQueue', $event)"/>
    </div>
  </section>
</template>
