"use client"
import React from 'react'

export default function ChefRecipeDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Recipe {params.id}</h1>
      <p className="text-stone-600">Recipe details and editor will be here.</p>
    </div>
  )
}
