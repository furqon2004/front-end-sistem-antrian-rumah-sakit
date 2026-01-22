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
   * Check if user has a ticket for specific queue type
   */
  hasTicketForQueue(queueTypeId) {
    const tickets = this.getTickets()
    return tickets.some(ticket => ticket.queue_type_id === queueTypeId)
  },

  /**
   * Get ticket for specific queue type
   */
  getTicketForQueue(queueTypeId) {
    const tickets = this.getTickets()
    return tickets.find(ticket => ticket.queue_type_id === queueTypeId)
  },

  /**
   * Update ticket status by ID
   * @param {string} ticketId - The ticket ID
   * @param {string} newStatus - The new status (WAITING, CALLED, SERVING, DONE, SKIPPED)
   */
  updateTicketStatus(ticketId, newStatus) {
    const tickets = this.getTickets()
    const updatedTickets = tickets.map(ticket => {
      if (ticket.id === ticketId) {
        return { ...ticket, status: newStatus }
      }
      return ticket
    })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTickets))
  },

  /**
   * Remove a ticket by ID
   */
  removeTicket(ticketId) {
    const tickets = this.getTickets()
    const filtered = tickets.filter(ticket => ticket.id !== ticketId)
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

