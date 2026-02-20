import { redirect } from 'next/navigation'

// New client creation is handled via the main clients page modal/form
export default function NewClientPage() {
  redirect('/clients')
}
