/**
 * Queue Status Check Composable
 * Handles checking individual queue status by token
 */

export const useQueueStatusCheck = () => {
  const { baseURL } = useApi()
  
  /**
   * Check queue status by token (original - may return 404)
   * @param {string} ticketId - The ticket/queue ID
   * @returns {Promise<Object>} Queue status data
   */
  const checkQueueStatus = async (ticketId) => {
    try {
      if (!ticketId || typeof ticketId !== 'string' || ticketId.trim() === '') {
        return {
          success: false,
          error: 'ID tiket tidak valid'
        }
      }

      // Use the correct endpoint format: /v1/customer/queue/status/{token}
      const response = await $fetch(`/v1/customer/queue/status/${ticketId.trim()}`, {
        baseURL,
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      })

      if (response?.success && response?.data) {
        return {
          success: true,
          data: response.data
        }
      }

      return {
        success: false,
        error: response?.message || 'Gagal mengambil status antrian'
      }
    } catch (error) {
      // Suppress 404 errors - endpoint might not exist
      if (error.status !== 404) {
        console.error('Error checking queue status:', error)
      }
      
      // Handle API errors
      if (error.data) {
        return {
          success: false,
          error: error.data.message || 'Token tidak ditemukan atau sudah tidak valid'
        }
      }
      
      return {
        success: false,
        error: error.message || 'Gagal mengambil status antrian'
      }
    }
  }

  /**
   * Check if ticket still exists in public queue data
   * First tries direct ticket endpoint, then falls back to queue-types endpoint
   * @param {string} ticketId - The ticket ID  
   * @param {string} queueTypeId - The queue type ID
   * @returns {Promise<{exists: boolean, status?: string}>}
   */
  const checkTicketInQueue = async (ticketId, queueTypeId) => {
    console.log('🔍 Checking ticket status:', ticketId)
    
    // First, try to get status directly from ticket endpoint
    // API uses token from public_queue_token table
    try {
      const url = `/v1/customer/queue/status/${ticketId}`
      console.log('🌐 Calling API:', url)
      const directResponse = await $fetch(url, {
        baseURL,
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      })
      
      console.log('📋 Status API response:', directResponse)
      
      // Response structure: { success: true, data: { ticket: { status: "CALLED", ... } } }
      if (directResponse?.success && directResponse?.data) {
        const ticketData = directResponse.data.ticket || directResponse.data
        const status = ticketData.status
        console.log('✅ Ticket status from API:', status)
        
        // If status is DONE or CANCELLED, ticket no longer active
        if (status === 'DONE' || status === 'COMPLETED' || status === 'CANCELLED') {
          return { exists: false, status: status }
        }
        
        // Calculate CORRECT remaining queues based on queue numbers
        // API's remaining_queues is total tickets issued, NOT people waiting ahead
        // Proper calculation: user's queue_number - current served queue_number - 1
        let calculatedRemaining = 0
        const userQueueNumber = ticketData.queue_number || 0
        const currentQueue = directResponse.data.current_queue
        
        if (currentQueue && currentQueue.queue_number) {
          // People ahead = user's number - currently serving number
          // If user is A-008 and current is A-005, there are 2 people ahead (A-006, A-007)
          calculatedRemaining = Math.max(0, userQueueNumber - currentQueue.queue_number - 1)
        } else {
          // No current queue being served, user might be first
          // If user is first (queue_number = 1), no one ahead
          calculatedRemaining = Math.max(0, userQueueNumber - 1)
        }
        
        console.log('📊 Queue calculation:', { 
          userQueueNumber, 
          currentServing: currentQueue?.queue_number || 0,
          calculatedRemaining,
          apiRemaining: directResponse.data.remaining_queues
        })
        
        // Return full data including AI prediction with CORRECTED remaining_queues
        return { 
          exists: true, 
          status: status,
          ai_prediction: directResponse.data.ai_prediction,
          remaining_queues: calculatedRemaining, // Use our calculated value
          estimated_waiting_minutes: directResponse.data.estimated_waiting_minutes,
          current_queue: directResponse.data.current_queue
        }
      }
    } catch (directError) {
      console.log('⚠️ Direct ticket check failed:', directError.status || directError.message)
    }
    
    // Fallback: Try queue-types endpoint if direct check fails
    if (!queueTypeId) {
      console.log('⚠️ No queueTypeId provided, assuming ticket exists')
      return { exists: true, status: null }
    }
    
    try {
      // Try to get queue info from public endpoint
      const response = await $fetch(`/v1/customer/queue-types/${queueTypeId}`, {
        baseURL,
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      })

      console.log('📋 Queue type response:', response)

      if (response?.success && response?.data) {
        // Check if our ticket is in the active queue
        const activeQueue = response.data.active_queue || response.data.queues || []
        console.log('📝 Active queue has', activeQueue.length, 'tickets')
        
        const ticket = activeQueue.find(t => t.id === ticketId)
        
        if (ticket) {
          console.log('✅ Ticket found with status:', ticket.status)
          return { exists: true, status: ticket.status }
        }
        
        // Ticket not in active queue, might be DONE
        console.log('🎉 Ticket NOT found in active queue - marking as DONE')
        return { exists: false, status: 'DONE' }
      }

      console.log('⚠️ Response not successful, assuming ticket exists')
      return { exists: true, status: null } // Assume exists if can't verify
    } catch (error) {
      // Log the error for debugging
      console.log('❌ Error checking ticket in queue:', error.status || error.message)
      // Suppress errors, assume ticket still exists
      return { exists: true, status: null }
    }
  }

  return {
    checkQueueStatus,
    checkTicketInQueue
  }
}

