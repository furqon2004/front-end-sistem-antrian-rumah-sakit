<template>
  <footer class="bg-black text-white  border-t">
    <div class="max-w-7xl mx-auto px-6 py-10 grid md:grid-cols-4 gap-8">
      <div>
        <h3 class="font-bold">RS Sehat Sejahtera</h3>
        <p class="text-sm text-white-600">
          Sistem antrian online untuk pelayanan yang lebih baik.
        </p>
      </div>

      <div>
        <h4 class="font-semibold mb-2">Menu</h4>
        <ul class="text-sm text-white-600 space-y-1">
          <li><a href="">Ambil Antrian</a></li>
          <li><a href="">Status Antrian</a></li>
        </ul>
      </div>

      <div>
        <h4 class="font-semibold mb-2">Kontak</h4>
        <p class="text-sm text-white-600">
          Denpasar, Bali<br />
          (0361) 123456
        </p>
      </div>

      <div>
        <p class="text-sm text-white-500">
          © {{ year }} RS Sehat Sejahtera
        </p>
      </div>
    </div>
  </footer>
</template>

<script setup>
const year = new Date().getFullYear()
</script>
