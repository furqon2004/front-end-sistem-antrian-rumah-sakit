<script setup>
import {Stethoscope,Activity,Baby,Eye} from 'lucide-vue-next'

defineEmits(['takeQueue'])

const props = defineProps({
  poli: Object,
  mode: {
    type: String,
    default: 'department'
  }
})

const iconMap = {
  'Poli Umum': Stethoscope,
  'Poli Gigi': Activity,
  'Poli Anak': Baby,
  'Poli Mata': Eye
}

const statusMap = {
  active: {
    label: 'Aktif',
    badge: 'bg-black text-white'
  },
  break: {
    label: 'Istirahat',
    badge: 'bg-gray-200 text-gray-700'
  },
  closed: {
    label: 'Tutup',
    badge: 'bg-red-100 text-red-700'
  }
}
</script>

<template>
  <div
    class="border rounded-xl p-6 bg-white relativetransition-all duration-200 ease-outactive:scale-[0.98]focus-within:shadow-lg"
    :class="{'hover:shadow-lg hover:-translate-y-1': mode === 'department','hover:shadow-md': mode === 'realtime'}">
    <!-- REALTIME MODE -->
    <template v-if="mode === 'realtime'">
      <!-- HEADER -->
      <div class="flex items-center justify-between mb-6">
        <h3 class="font-semibold text-lg">{{ poli.name }}</h3>
        <span class="text-xs px-3 py-1 rounded-full":class="statusMap[poli.status].badge">
          {{ statusMap[poli.status].label }}
        </span>
      </div>
      <!-- CONTENT -->
      <div class="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p class="text-sm text-gray-500 mb-1">Nomor Antrian</p>
          <p class="text-3xl font-bold">{{ poli.status === 'active' ? poli.current : '-' }}</p>
        </div>

        <div class="text-right">
          <p class="text-sm text-gray-500 mb-1">Sedang Menunggu</p>
          <p class="text-xl font-semibold">{{ poli.status === 'active' ? poli.waiting : '-' }}</p>
        </div>
      </div>

      <!-- DIVIDER -->
      <div class="border-t pt-4">
        <p class="text-sm text-gray-500 mb-1">Estimasi Waktu Tunggu</p>
        <p class="font-semibold">{{ poli.status === 'active' ? poli.eta + ' menit' : 'Tidak tersedia' }}</p>
      </div>
    </template>
    <!-- DEPARTMENT MODE -->
    <template v-else>
      <!-- BADGE STATUS -->
      <span
        class="absolute top-4 right-4 text-xs px-3 py-1 rounded-full"
        :class="statusMap[poli.status].badge"
      >
        {{ statusMap[poli.status].label }}
      </span>


      <!-- ICON -->
      <div
        class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4"
      >
        <component
          :is="iconMap[poli.name]"
          class="w-6 h-6 text-gray-700"
        />
      </div>

      <!-- TITLE -->
      <h3 class="font-semibold text-lg mb-2">
        {{ poli.name }}
      </h3>

      <!-- DESCRIPTION -->
      <p class="text-sm text-gray-500 mb-8 leading-relaxed">
        {{ poli.desc }}
      </p>

      <!-- ACTION BUTTON -->
     <button class="mt-auto w-full py-3 rounded-xl font-medium text-smtransition-all duration-200 active:scale-95"
            :class="{'bg-black text-white hover:bg-gray-800': poli.status === 'active','bg-gray-200 text-gray-500 cursor-not-allowed': poli.status !== 'active'}"
            :disabled="poli.status !== 'active'"
            @click="$emit('takeQueue', poli)">{{ poli.status === 'active'? 'Ambil Nomor Antrian': 'Layanan Tidak Tersedia'}}
     </button>

    </template>

  </div>
</template>

