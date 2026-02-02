// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxtjs/tailwindcss"],
  
  runtimeConfig: {
    public: {
      apiBase: '/api' // Use proxy path instead of direct API URL
    }
  },

  // Nitro server configuration for API proxy
  nitro: {
    routeRules: {
      // Proxy all /api/** requests to the backend API
      '/api/**': {
        proxy: 'https://hospital-queue-api.codewithdanu.my.id/api/**'
      }
    }
  }
});
