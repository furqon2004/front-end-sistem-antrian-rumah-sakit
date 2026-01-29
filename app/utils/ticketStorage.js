/**
 * Ticket Storage Utility
 * Manages tickets in localStorage for persistence
 * Separate storage for active tickets and history (completed tickets)
 * Tickets expire after 24 hours automatically
 */

const STORAGE_KEY = 'queue_tickets'
const HISTORY_KEY = 'queue_tickets_history'
const TICKET_EXPIRY_HOURS = 24

export const ticketStorage = {
  // =====================
  // ACTIVE TICKETS
  // =====================
  
  /**
   * Save a ticket to localStorage (active)
   */
  saveTicket(ticket) {
    const tickets = this.getTickets()
    tickets.push({
      ...ticket,
      createdAt: new Date().toISOString()
    })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets))
  },

  /**
   * Get all active tickets (filters out expired tickets older than 24 hours)
   */
  getTickets() {
    if (typeof window === 'undefined') return []
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    
    const tickets = JSON.parse(stored)
    const now = new Date()
    const expiryMs = TICKET_EXPIRY_HOURS * 60 * 60 * 1000 // 24 hours in milliseconds
    
    // Filter out expired tickets (older than 24 hours)
    const validTickets = tickets.filter(ticket => {
      const createdAt = new Date(ticket.createdAt || ticket.created_at || ticket.issued_at)
      const age = now - createdAt
      return age < expiryMs
    })
    
    // If some tickets were expired, update localStorage
    if (validTickets.length !== tickets.length) {
      console.log(`🗑️ Cleaned up ${tickets.length - validTickets.length} expired tickets (older than ${TICKET_EXPIRY_HOURS} hours)`)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validTickets))
    }
    
    return validTickets
  },

  /**
   * Check if user has an ACTIVE ticket for specific queue type
   * Only blocks if ticket status is WAITING, CALLED, or SERVING
   * Allows taking new ticket if previous is DONE, CANCELLED, or SKIPPED
   */
  hasTicketForQueue(queueTypeId) {
    const tickets = this.getTickets()
    const ACTIVE_STATUSES = ['WAITING', 'CALLED', 'SERVING', 'waiting', 'called', 'serving']
    
    return tickets.some(ticket => {
      const isMatchingQueue = ticket.queue_type_id === queueTypeId
      const isActiveStatus = ACTIVE_STATUSES.includes(ticket.status)
      
      if (isMatchingQueue) {
        console.log(`🎫 Checking ticket for queue ${queueTypeId}:`, {
          status: ticket.status,
          isActive: isActiveStatus
        })
      }
      
      return isMatchingQueue && isActiveStatus
    })
  },

  /**
   * Get ACTIVE ticket for specific queue type
   * Only returns tickets with status WAITING, CALLED, or SERVING
   */
  getTicketForQueue(queueTypeId) {
    const tickets = this.getTickets()
    const ACTIVE_STATUSES = ['WAITING', 'CALLED', 'SERVING', 'waiting', 'called', 'serving']
    
    return tickets.find(ticket => 
      ticket.queue_type_id === queueTypeId && 
      ACTIVE_STATUSES.includes(ticket.status)
    )
  },

  /**
   * Update ticket status by ID or token
   * @param {string} ticketIdOrToken - The ticket ID or token
   * @param {string} newStatus - The new status (WAITING, CALLED, SERVING, DONE, SKIPPED)
   */
  updateTicketStatus(ticketIdOrToken, newStatus) {
    const tickets = this.getTickets()
    let found = false
    const updatedTickets = tickets.map(ticket => {
      // Match by id OR token
      if (ticket.id === ticketIdOrToken || ticket.token === ticketIdOrToken) {
        found = true
        console.log(`🔄 Updating ticket ${ticket.display_number || ticketIdOrToken}: ${ticket.status} → ${newStatus}`)
        return { ...ticket, status: newStatus }
      }
      return ticket
    })
    
    if (found) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTickets))
    }
  },

  /**
   * Remove a ticket by ID or token
   */
  removeTicket(ticketIdOrToken) {
    const tickets = this.getTickets()
    const filtered = tickets.filter(ticket => ticket.id !== ticketIdOrToken && ticket.token !== ticketIdOrToken)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  },

  /**
   * Clear all active tickets
   */
  clearAllTickets() {
    localStorage.removeItem(STORAGE_KEY)
  },

  // =====================
  // HISTORY TICKETS
  // =====================

  /**
   * Get all history tickets (completed)
   */
  getHistoryTickets() {
    if (typeof window === 'undefined') return []
    const stored = localStorage.getItem(HISTORY_KEY)
    return stored ? JSON.parse(stored) : []
  },

  /**
   * Save a ticket to history
   */
  saveToHistory(ticket) {
    const history = this.getHistoryTickets()
    // Add completed timestamp
    history.unshift({
      ...ticket,
      status: 'DONE',
      completedAt: new Date().toISOString()
    })
    // Keep only last 50 history items
    const trimmed = history.slice(0, 50)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed))
  },

  /**
   * Move ticket from active to history
   * @param {string} ticketId - The ticket ID to move
   */
  moveToHistory(ticketId) {
    const tickets = this.getTickets()
    const ticket = tickets.find(t => t.id === ticketId)
    
    if (ticket) {
      // Save to history
      this.saveToHistory(ticket)
      // Remove from active
      this.removeTicket(ticketId)
      console.log('📚 Ticket moved to history:', ticketId)
      return true
    }
    return false
  },

  /**
   * Clear all history
   */
  clearHistory() {
    localStorage.removeItem(HISTORY_KEY)
  }
}

