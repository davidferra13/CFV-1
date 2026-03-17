// Shared constants for communication template display.
// Extracted from actions.ts because 'use server' files cannot export
// non-async values (Next.js restriction).

export const TEMPLATE_VARIABLES = [
  { key: 'client_name', description: "Client's first name", example: 'Sarah' },
  { key: 'client_full_name', description: "Client's full name", example: 'Sarah Johnson' },
  { key: 'occasion', description: 'Event occasion', example: 'Birthday Dinner' },
  { key: 'event_date', description: 'Event date', example: 'March 20, 2026' },
  { key: 'guest_count', description: 'Number of guests', example: '12' },
  { key: 'chef_name', description: 'Chef/business name', example: 'Chef David' },
  { key: 'business_name', description: 'Business name', example: 'ChefFlow' },
  { key: 'response_time', description: 'Expected response time', example: 'within 24 hours' },
  { key: 'quoted_price', description: 'Quoted price', example: '$1,800' },
  { key: 'deposit_amount', description: 'Deposit amount', example: '$450' },
  { key: 'balance_due', description: 'Remaining balance', example: '$1,350' },
  { key: 'payment_due_date', description: 'Payment due date', example: 'March 15, 2026' },
  { key: 'event_location', description: 'Event location', example: '123 Main St' },
  { key: 'booking_link', description: 'Direct booking link', example: 'https://...' },
  { key: 'feedback_link', description: 'Feedback survey link', example: 'https://...' },
] as const
