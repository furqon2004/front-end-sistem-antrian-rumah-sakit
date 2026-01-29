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
        
        // Calculate CORRECT remaining queues based on available data
        // Priority:
        // 1. queues_ahead from API response (most accurate if provided)
        // 2. ai_prediction.factors.queue_load - 1 (total waiting minus self)
        // 3. Fallback: queue_number difference (less accurate)
        let calculatedRemaining = 0
        const userQueueNumber = ticketData.queue_number || 0
        const currentQueue = directResponse.data.current_queue
        const aiPrediction = directResponse.data.ai_prediction
        
        console.log('📊 API Response data:', {
          queues_ahead: directResponse.data.queues_ahead,
          queue_load: aiPrediction?.factors?.queue_load,
          userQueueNumber,
          currentQueue: currentQueue?.queue_number
        })
        
        // Priority 1: Use queues_ahead directly from API if available
        if (directResponse.data.queues_ahead !== undefined && directResponse.data.queues_ahead !== null) {
          calculatedRemaining = Math.max(0, directResponse.data.queues_ahead)
          console.log('📊 Using API queues_ahead:', calculatedRemaining)
        }
        // Priority 2: Use queue_load from AI prediction (total waiting including self)
        else if (aiPrediction?.factors?.queue_load !== undefined) {
          // queue_load includes the current user, so subtract 1 to get people AHEAD
          calculatedRemaining = Math.max(0, aiPrediction.factors.queue_load - 1)
          console.log('📊 Using AI queue_load:', aiPrediction.factors.queue_load, '-> ahead:', calculatedRemaining)
        }
        // Priority 3: Use waiting_count if available (total waiting)
        else if (directResponse.data.waiting_count !== undefined) {
          // waiting_count is total, subtract 1 for people ahead
          calculatedRemaining = Math.max(0, directResponse.data.waiting_count - 1)
          console.log('📊 Using waiting_count:', directResponse.data.waiting_count, '-> ahead:', calculatedRemaining)
        }
        // Fallback: queue_number based calculation
        else if (currentQueue && currentQueue.queue_number) {
          // People ahead = user's number - currently serving number - 1
          calculatedRemaining = Math.max(0, userQueueNumber - currentQueue.queue_number - 1)
          console.log('📊 Using queue_number diff:', { userQueueNumber, current: currentQueue.queue_number, ahead: calculatedRemaining })
        } else {
          // Last fallback: assume position based on queue_number (least accurate)
          calculatedRemaining = Math.max(0, userQueueNumber - 1)
          console.log('📊 Fallback queue_number - 1:', calculatedRemaining)
        }
        
        // Calculate per-doctor queue if doctor_id is present
        // This is when backend doesn't provide queues_ahead_doctor
        let perDoctorQueuesAhead = null
        const ticketDoctorId = ticketData.doctor_id
        
        if (ticketDoctorId) {
          // Check if API provides waiting_list with doctor_id info
          const waitingList = directResponse.data.waiting_list || directResponse.data.waiting_tickets || []
          
          if (waitingList.length > 0) {
            // Count tickets BEFORE this one (lower queue_number) with SAME doctor_id
            perDoctorQueuesAhead = waitingList.filter(t => 
              t.doctor_id === ticketDoctorId && 
              t.queue_number < userQueueNumber &&
              t.status === 'WAITING'
            ).length
            console.log('📊 Calculated per-doctor queues ahead from waiting_list:', perDoctorQueuesAhead)
          } else {
            // No waiting_list, estimate based on round-robin distribution
            // If there are N doctors and total waiting is W, each doctor has ~W/N tickets
            const totalDoctors = directResponse.data.total_doctors || 2 // Assume 2 if not provided
            if (calculatedRemaining > 0) {
              perDoctorQueuesAhead = Math.floor(calculatedRemaining / totalDoctors)
              console.log('📊 Estimated per-doctor queues ahead (round-robin):', perDoctorQueuesAhead, 'of', calculatedRemaining)
            } else {
              perDoctorQueuesAhead = 0
            }
          }
        }
        
        // Determine final remaining value - prioritize per-doctor if available
        const finalRemaining = directResponse.data.queues_ahead_doctor ?? perDoctorQueuesAhead ?? calculatedRemaining
        
        // Recalculate estimated waiting time based on NEW remaining count
        // User request: "jika antriannya 0 maka estimasinya juga akan 0"
        let newEstimatedMinutes = 0
        
        if (finalRemaining > 0) {
          // If we have AI prediction, try to use its average per patient, otherwise default to 10 mins
          const originalEstimate = directResponse.data.ai_prediction?.estimated_minutes || directResponse.data.estimated_waiting_minutes || 0
          const originalQueueLength = directResponse.data.queue_load || (calculatedRemaining > 0 ? calculatedRemaining : 1)
          
          let avgPerPatient = 10 // Default 10 mins
          if (originalEstimate > 0 && originalQueueLength > 0) {
            avgPerPatient = originalEstimate / originalQueueLength
          }
          // Cap average time to reasonable bounds (5-15 mins) if calculated value is weird
          avgPerPatient = Math.max(5, Math.min(15, avgPerPatient))
          
          newEstimatedMinutes = Math.round(finalRemaining * avgPerPatient)
        }
        
        // Construct new AI message to match the per-doctor queue reality
        let newMessage = ""
        if (finalRemaining === 0) {
            newMessage = `Giliran Anda segera tiba! Mohon bersiap masuk ke ruangan ${ticketData.doctor?.name ? 'dr. ' + ticketData.doctor.name : 'dokter'}.`
        } else if (finalRemaining <= 3) {
            newMessage = `Antrian cukup lancar dengan ${finalRemaining} pasien di depan Anda. Estimasi waktu tunggu sekitar ${newEstimatedMinutes} menit.`
        } else if (finalRemaining <= 10) {
            newMessage = `Antrian sedang berjalan dengan ${finalRemaining} pasien di depan Anda. Estimasi waktu tunggu sekitar ${newEstimatedMinutes} menit. Harap bersabar.`
        } else {
            newMessage = `Antrian cukup padat dengan ${finalRemaining} pasien di depan Anda. Estimasi waktu tunggu sekitar ${newEstimatedMinutes} menit. Terima kasih atas kesabaran Anda.`
        }

        // Update AI prediction object if exists
        const updatedAiPrediction = directResponse.data.ai_prediction ? {
          ...directResponse.data.ai_prediction,
          estimated_minutes: newEstimatedMinutes,
          message: newMessage, // Override message completely
          factors: {
             ...directResponse.data.ai_prediction.factors,
             queue_load: finalRemaining // Update queue load factor too
          }
        } : null
        
        // Return full data including AI prediction with CORRECTED remaining_queues
        // Include doctor info for per-doctor queue display
        return { 
          exists: true, 
          status: status,
          ai_prediction: updatedAiPrediction,
          // Use per-doctor remaining if available
          remaining_queues: finalRemaining,
          estimated_waiting_minutes: newEstimatedMinutes,
          current_queue: directResponse.data.current_queue,
          // Include doctor info for display
          doctor_id: ticketData.doctor_id,
          doctor_name: ticketData.doctor?.name || directResponse.data.doctor?.name,
          // Flag to indicate if this is per-doctor count
          is_per_doctor: ticketDoctorId !== null && ticketDoctorId !== undefined
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

