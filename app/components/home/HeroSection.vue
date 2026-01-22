<script setup>
import { Calendar, Phone } from 'lucide-vue-next'
defineEmits(['goToDepartment'])
</script>

<template>
  <section class="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20">
    <div class="grid gap-10 md:grid-cols-2 items-center">
      
      <!-- KIRI: Text -->
      <div>
        <h1 class="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-4 md:mb-6">
          Selamat Datang di Sistem Antrian <br />
          Online
        </h1>

        <p class="text-gray-600 text-sm md:text-base mb-6 md:mb-8 max-w-lg">
          Ambil nomor antrian secara online dan pantau antrian real-time
          tanpa harus menunggu di rumah sakit
        </p>

        <div class="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <!-- PRIMARY -->
          <button
            class="bg-black text-white px-5 md:px-6 py-3 rounded-lg font-medium
                   flex items-center justify-center gap-2 text-sm md:text-base hover:bg-gray-800"
            @click="$emit('goToDepartment')"
          >
            <Calendar class="w-5 h-5" />
            Ambil Nomor Antrian
          </button>
        </div>
      </div>

      <div class="order-first md:order-last">
        <!--
        <img
          src="/hospital.jpg"
          alt="Rumah Sakit"
          class="rounded-2xl shadow-lg w-full h-[220px] sm:h-[280px] md:h-auto object-cover"
        />
        -->
      </div>

    </div>
  </section>
</template>
