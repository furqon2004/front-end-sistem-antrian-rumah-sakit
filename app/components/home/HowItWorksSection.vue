<script setup>
import {
  ListChecks,
  Ticket,
  Eye
} from 'lucide-vue-next'

const steps = [
  {
    id: 1,
    title: 'Pilih Layanan',
    desc: 'Pilih layanan yang sesuai dengan kebutuhan kesehatan Anda',
    icon: ListChecks
  },
  {
    id: 2,
    title: 'Ambil Nomor Antrian',
    desc: 'Klik tombol ambil nomor antrian dan masukan nama anda maka sistem akan memberikan nomor Anda',
    icon: Ticket
  },
  {
    id: 3,
    title: 'Pantau Status',
    desc: 'Pantau status antrian Anda secara real-time dan datang saat giliran Anda',
    icon: Eye
  }
]
</script>

<template>
  <section class="bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 md:px-6 py-20">
      
      <!-- Judul -->
      <div class="text-center mb-14">
        <h2 class="text-3xl md:text-4xl font-bold mb-2">
          Cara Menggunakan Sistem Antrian
        </h2>
        <p class="text-gray-600">
          Mudah dan praktis dalam 3 langkah
        </p>
      </div>

      <!-- Step Cards -->
      <div class="grid gap-6 md:grid-cols-3">
        <div
          v-for="step in steps"
          :key="step.id"
          class="
            border rounded-xl bg-white p-8 text-center
            transition-all duration-200
            hover:shadow-lg hover:-translate-y-1
            active:scale-[0.98]
          "
        >
          <!-- Icon -->
          <div
            class="w-14 h-14 mx-auto mb-6 rounded-full bg-black
                   flex items-center justify-center text-white"
          >
            <component
              :is="step.icon"
              class="w-7 h-7"
            />
          </div>

          <!-- Text -->
          <h3 class="font-semibold text-lg mb-2">
            {{ step.id }}. {{ step.title }}
          </h3>

          <p class="text-sm text-gray-600">
            {{ step.desc }}
          </p>
        </div>
      </div>

    </div>
  </section>
</template>
