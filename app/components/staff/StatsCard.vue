<script setup>
defineProps({
  title: String,
  value: [String, Number],
  icon: Object,
  color: {
    type: String,
    default: 'blue'
  }
})

const colorClasses = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  orange: 'bg-orange-100 text-orange-600',
  purple: 'bg-purple-100 text-purple-600'
}
</script>

<template>
  <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
    <div class="flex items-start justify-between">
      <div class="flex-1">
        <p class="text-sm text-gray-600 mb-1">{{ title }}</p>
        <p class="text-3xl font-bold text-gray-900">{{ value }}</p>
      </div>
      <div :class="['w-12 h-12 rounded-xl flex items-center justify-center', colorClasses[color]]">
        <component :is="icon" class="w-6 h-6" />
      </div>
    </div>
  </div>
</template>
