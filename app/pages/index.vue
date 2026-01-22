<script setup>
import Header from '@/components/layout/Header.vue'
import Footer from '@/components/layout/Footer.vue'

import HeroSection from '@/components/home/HeroSection.vue'
import StatsSection from '@/components/home/StatsSection.vue'
import QueueTypesSection from '@/components/home/QueueTypesSection.vue'
import StatusSection from '@/components/home/StatusSection.vue'
import HowItWorksSection from '@/components/home/HowItWorksSection.vue'
import TakeQueueModal from '@/components/home/TakeQueueModal.vue'

const selectedQueueType = ref(null)
const showModal = ref(false)
const queueTypesRef = ref(null)

const openModal = (queueType) => {
  selectedQueueType.value = queueType
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  selectedQueueType.value = null
}

// Refresh queue data when ticket is taken
const handleTicketTaken = () => {
  if (queueTypesRef.value?.refresh) {
    queueTypesRef.value.refresh()
  }
}

const scrollToDepartment = () => {
  const el = document.getElementById('queue-types')
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' })
  }
}
</script>

<template>
  <Header />

  <!-- HERO -->
  <HeroSection @goToDepartment="scrollToDepartment" />
  <!-- STATISTIK -->
  <StatsSection />

  <!-- JENIS LAYANAN ANTRIAN (DARI API) -->
  <QueueTypesSection ref="queueTypesRef" id="queue-types" @selectQueue="openModal" />

  <!-- STATUS REALTIME (SEMUA POLI) -->
  <StatusSection />

  <!-- MODAL AMBIL ANTRIAN -->
  <TakeQueueModal :show="showModal" :queue-type="selectedQueueType" @close="closeModal" @ticketTaken="handleTicketTaken" />

  <!-- CARA MENGGUNAKAN SISTEM -->
  <HowItWorksSection />

  <Footer />
</template>
