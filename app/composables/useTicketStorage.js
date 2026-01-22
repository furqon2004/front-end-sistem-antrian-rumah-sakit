import { ticketStorage } from '@/utils/ticketStorage'

/**
 * Composable wrapper for ticketStorage utility
 * Enables auto-import usage in components
 */
export const useTicketStorage = () => {
  return ticketStorage
}
