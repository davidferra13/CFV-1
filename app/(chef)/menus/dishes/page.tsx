import { redirect } from 'next/navigation'

// Old dish index page — redirect to the new location
export default function OldDishIndexRedirect() {
  redirect('/culinary/dish-index')
}
