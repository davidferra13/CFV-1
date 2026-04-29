import { redirect } from 'next/navigation'

export default function CulinaryRecipeEditRedirect({ params }: { params: { id: string } }) {
  redirect(`/recipes/${params.id}/edit`)
}
