<template>
  <div class="border rounded-xl p-6 flex items-center gap-4">
    
    <!-- ICON -->
    <div
      class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center"
    >
      <component
        :is="icon"
        class="w-6 h-6 text-gray-700"
      />
    </div>

    <!-- TEXT -->
    <div>
      <p class="text-sm text-gray-500">{{ label }}</p>
      <p class="text-2xl font-bold">{{ value }}</p>
    </div>

  </div>
</template>

<script setup>
defineProps({
  icon: [Object, Function],    
  label: String,
  value: [String, Number],
})
</script>
