/**
 * Ticket Composable
 * Handles ticket creation and management with geolocation validation
 * Uses system settings from admin for geofence configuration
 */
import { ticketStorage } from '@/utils/ticketStorage'

export const useTicket = () => {
  const { baseURL } = useApi()
  const router = useRouter()
  const { getGeofenceConfig, DEFAULT_SETTINGS } = useCustomerSettings()

  // Default fallback location (will be overridden by settings)
  const TARGET_LOCATION = reactive({
    latitude: parseFloat(DEFAULT_SETTINGS.HOSPITAL_LAT),
    longitude: parseFloat(DEFAULT_SETTINGS.HOSPITAL_LNG)
  })

  const MAX_DISTANCE_METERS = ref(parseInt(DEFAULT_SETTINGS.MAX_DISTANCE_METER, 10))
  const GEOFENCE_ENABLED = ref(false)

  /**
   * Calculate distance between two coordinates using Haversine formula
   * Returns distance in meters
   */
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180
    const φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180
    const Δλ = (lon2 - lon1) * Math.PI / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c // Distance in meters
  }

  /**
   * Get user's current location
   */
  const getUserLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation tidak didukung oleh browser Anda'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        },
        (error) => {
          let message = 'Gagal mendapatkan lokasi Anda'
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Izin lokasi ditolak. Mohon aktifkan izin lokasi untuk mengambil antrian.'
              break
            case error.POSITION_UNAVAILABLE:
              message = 'Informasi lokasi tidak tersedia'
              break
            case error.TIMEOUT:
              message = 'Permintaan lokasi timeout'
              break
          }
          reject(new Error(message))
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      )
    })
  }

  /**
   * Create a new ticket
   * @param {string} name - Patient name
   * @param {Object} queueType - Queue type object
   * @param {string} paymentType - Payment type ('BPJS' or 'UMUM')
   * @param {string|null} doctorId - Optional doctor ID if customer selects specific doctor
   */
  const createTicket = async (name, queueType, paymentType = 'UMUM', doctorId = null) => {
    try {
      // Sync latest statuses first to ensure we don't block false positives
      await syncTicketStatuses()
      
      // Check if user already has an active ticket
      if (hasActiveTicket()) {
        const activeTicket = getActiveTicket()
        const statusMap = {
          'WAITING': 'menunggu antrian',
          'CALLED': 'sedang dipanggil',
          'SERVING': 'sedang dilayani'
        }
        const statusText = statusMap[activeTicket?.status] || 'aktif'
        return {
          success: false,
          error: `Anda masih memiliki antrian yang ${statusText} (${activeTicket?.display_number || ''}). Mohon selesaikan antrian tersebut sebelum mengambil nomor baru.`
        }
      }

      // Get geofence configuration from admin settings
      const geofenceConfig = await getGeofenceConfig()
      GEOFENCE_ENABLED.value = geofenceConfig.enabled
      MAX_DISTANCE_METERS.value = geofenceConfig.maxDistance
      TARGET_LOCATION.latitude = geofenceConfig.hospitalLat
      TARGET_LOCATION.longitude = geofenceConfig.hospitalLng
      
      console.log('📍 Geofence config:', {
        enabled: geofenceConfig.enabled,
        maxDistance: geofenceConfig.maxDistance,
        hospital: { lat: TARGET_LOCATION.latitude, lng: TARGET_LOCATION.longitude }
      })

      // Get user's current location
      let userLocation = { latitude: 0, longitude: 0 }
      let locationError = null
      
      try {
        userLocation = await getUserLocation()
        console.log('📍 User location:', userLocation)
      } catch (locErr) {
        console.warn('Geolocation failed:', locErr)
        locationError = locErr
        
        // If geofence is enabled and we can't get location, reject
        if (geofenceConfig.enabled) {
          return {
            success: false,
            error: locErr.message || 'Gagal mendapatkan lokasi. Mohon aktifkan izin lokasi untuk mengambil antrian.'
          }
        }
      }

      // Validate distance if geofence is enabled
      if (geofenceConfig.enabled && userLocation.latitude !== 0) {
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          TARGET_LOCATION.latitude,
          TARGET_LOCATION.longitude
        )
        
        console.log(`📏 Distance from hospital: ${distance.toFixed(2)}m (max: ${geofenceConfig.maxDistance}m)`)

        if (distance > geofenceConfig.maxDistance) {
          const distanceKm = (distance / 1000).toFixed(2)
          return {
            success: false,
            error: `Anda terlalu jauh dari lokasi (${distanceKm} km). Harap berada dalam radius ${geofenceConfig.maxDistance} meter untuk mengambil antrian.`
          }
        }
      }

      // Use actual user location or hospital location for API
      const locationToSend = geofenceConfig.enabled && userLocation.latitude !== 0
        ? userLocation
        : { latitude: TARGET_LOCATION.latitude, longitude: TARGET_LOCATION.longitude }

      // Call API to create ticket
      const response = await $fetch('/v1/customer/queue/take', {
        baseURL,
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: {
          queue_type_id: queueType.id,
          patient_name: name,
          payment_type: paymentType, // 'BPJS' or 'UMUM'
          doctor_id: doctorId, // NEW: Optional selected doctor
          latitude: locationToSend.latitude,
          longitude: locationToSend.longitude
        }
      })

      if (response?.success && response?.data) {
        console.log('✅ Backend response:', response)
        
        const apiData = response.data
        
        // Extract ticket data from API response
        // API returns: { ticket: {...}, token: "..." }
        const ticketData = apiData.ticket || apiData
        const token = apiData.token
        
        console.log('📝 Ticket data from backend:', ticketData)
        console.log('🔑 Token:', token)
        
        const ticket = {
          // Core ticket info
          id: ticketData.id,
          token: token,
          
          // Queue information
          queue_type_id: ticketData.queue_type_id,
          queue_type_name: ticketData.queue_type?.name || queueType.name,
          queue_type_code: ticketData.queue_type?.code_prefix || queueType.code_prefix,
          
          // Queue type details (nested object)
          queue_type: ticketData.queue_type || {
            id: queueType.id,
            name: queueType.name,
            code_prefix: queueType.code_prefix
          },
          
          // Queue numbers
          queue_number: ticketData.queue_number,
          display_number: ticketData.display_number, // e.g., "B-001"
          ticket_number: ticketData.display_number || ticketData.queue_number,
          
          // Status and dates
          status: ticketData.status || 'WAITING',
          service_date: ticketData.service_date,
          issued_at: ticketData.issued_at,
          
          // Patient info
          patient_name: name,
          payment_type: paymentType, // 'BPJS' or 'UMUM'
          
          // Timestamps
          created_at: ticketData.created_at || new Date().toISOString(),
          updated_at: ticketData.updated_at
        }
        
        console.log('💾 Saving ticket to localStorage:', ticket)
        
        // Save ticket to localStorage
        ticketStorage.saveTicket(ticket)
        
        console.log('✅ Ticket saved successfully!')
        
        return {
          success: true,
          ticket: ticket
        }
      } else {
        console.error('❌ Invalid response structure:', response)
        throw new Error(response?.message || 'Failed to create ticket')
      }
    } catch (err) {
      console.error('Error creating ticket:', err)
      
      // Extract detailed error message from backend
      let errorMessage = 'Gagal membuat tiket. '
      
      if (err.data) {
        console.error('Backend error details:', err.data)
        
        // Laravel validation errors
        if (err.data.errors) {
          console.error('Validation errors:', err.data.errors)
          const errors = Object.values(err.data.errors).flat()
          errorMessage += errors.join(', ')
        } else if (err.data.message) {
          errorMessage += err.data.message
        }
      } else {
        errorMessage += err.message || 'Silakan coba lagi.'
      }
      
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  /**
   * Navigate to ticket page (shows all tickets)
   */
  const goToTicket = () => {
    router.push('/ticket')
  }

  /**
   * Check if user has ANY active ticket (not DONE, not CANCELLED, not SKIPPED)
   * This enforces one ticket per user (IP) restriction
   * @returns {boolean}
   */
  const hasActiveTicket = () => {
    const tickets = ticketStorage.getTickets()
    if (!tickets || tickets.length === 0) return false
    
    // Check if any ticket is still active
    const activeStatuses = ['WAITING', 'CALLED', 'SERVING']
    return tickets.some(ticket => activeStatuses.includes(ticket.status))
  }

  /**
   * Get the active ticket for this user (if any)
   * @returns {Object|null}
   */
  const getActiveTicket = () => {
    const tickets = ticketStorage.getTickets()
    if (!tickets || tickets.length === 0) return null
    
    const activeStatuses = ['WAITING', 'CALLED', 'SERVING']
    return tickets.find(ticket => activeStatuses.includes(ticket.status)) || null
  }

  /**
   * Check if user has ticket for queue type
   */
  const hasTicketForQueue = (queueTypeId) => {
    return ticketStorage.hasTicketForQueue(queueTypeId)
  }

  /**
   * Get ticket for queue type
   */
  const getTicketForQueue = (queueTypeId) => {
    return ticketStorage.getTicketForQueue(queueTypeId)
  }

  /**
   * Delete ticket (Cancel) - calls backend API to set status to CANCELLED
   * @param {string} ticketToken - The ticket token/ID to cancel
   */
  const deleteTicket = async (ticketToken) => {
    try {
      console.log('🗑️ Cancelling ticket:', ticketToken)
      
      // Call API to cancel ticket on backend
      // API endpoint: /v1/customer/queue/cancel/{token}
      const response = await $fetch(`/v1/customer/queue/cancel/${ticketToken}`, {
        baseURL,
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })
      
      console.log('✅ Ticket cancelled on backend:', response)
      return { success: true, data: response }
    } catch (apiErr) {
      console.error('❌ Cancel API failed:', apiErr)
      return { 
        success: false, 
        error: apiErr.data?.message || apiErr.message || 'Gagal membatalkan tiket'
      }
    }
  }

  /**
   * Sync ticket statuses from backend to localStorage
   * Call this before checking hasTicketForQueue to ensure data is up-to-date
   * @returns {Promise<void>}
   */
  const syncTicketStatuses = async () => {
    try {
      const tickets = ticketStorage.getTickets()
      if (!tickets || tickets.length === 0) return

      console.log('🔄 Syncing ticket statuses from backend...')

      for (const ticket of tickets) {
        const ticketId = ticket.token || ticket.id
        if (!ticketId) continue

        try {
          // Check ticket status from backend
          const response = await $fetch(`/v1/customer/queue/status/${ticketId}`, {
            baseURL,
            method: 'GET',
            headers: { 'Accept': 'application/json' }
          })

          if (response?.success && response?.data) {
            const ticketData = response.data.ticket || response.data
            const backendStatus = ticketData.status

            // Update localStorage if status changed
            if (backendStatus && backendStatus !== ticket.status) {
              console.log(`📝 Updating ticket ${ticketId} status: ${ticket.status} → ${backendStatus}`)
              ticketStorage.updateTicketStatus(ticketId, backendStatus)
            }
          }
        } catch (err) {
          // If 404 or error, ticket might be done/deleted
          if (err.status === 404) {
            console.log(`📝 Ticket ${ticketId} not found, marking as DONE`)
            ticketStorage.updateTicketStatus(ticketId, 'DONE')
          }
        }
      }

      console.log('✅ Ticket status sync complete')
    } catch (err) {
      console.warn('⚠️ Failed to sync ticket statuses:', err.message)
    }
  }

  return {
    createTicket,
    deleteTicket,
    goToTicket,
    hasTicketForQueue,
    getTicketForQueue,
    hasActiveTicket,
    getActiveTicket,
    syncTicketStatuses,
    TARGET_LOCATION,
    MAX_DISTANCE_METERS
  }
}

