'use client'

import { useState } from 'react'
import { updateClient } from '@/lib/clients/actions'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

type Pet = { name: string; type: string; notes?: string }

const PET_ICONS: Record<string, string> = {
  dog: '🐕',
  cat: '🐈',
  bird: '🐦',
  fish: '🐟',
  reptile: '🦎',
  other: '🐾',
}

export function PetManager({ clientId, initialPets }: { clientId: string; initialPets: Pet[] }) {
  const [pets, setPets] = useState<Pet[]>(initialPets)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<Pet[]>(initialPets)

  function startEditing() {
    setDraft([...pets])
    setEditing(true)
  }

  function addPet() {
    setDraft([...draft, { name: '', type: 'dog' }])
  }

  function updatePet(index: number, field: keyof Pet, value: string) {
    const updated = [...draft]
    updated[index] = { ...updated[index], [field]: value }
    setDraft(updated)
  }

  function removePet(index: number) {
    setDraft(draft.filter((_, i) => i !== index))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const cleaned = draft.filter((p) => p.name.trim())
      await updateClient(clientId, { pets: cleaned } as any)
      setPets(cleaned)
      setEditing(false)
    } catch (err) {
      console.error('Failed to update pets:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border border-stone-200 overflow-hidden">
      <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
        <h3 className="font-medium text-stone-800">Pets</h3>
        {!editing && (
          <button
            type="button"
            onClick={startEditing}
            className="text-sm text-brand-500 hover:text-brand-600"
          >
            {pets.length > 0 ? 'Edit' : 'Add Pets'}
          </button>
        )}
      </div>

      {!editing ? (
        pets.length > 0 ? (
          <div className="p-4 space-y-2">
            {pets.map((pet, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="text-lg">{PET_ICONS[pet.type] || '🐾'}</span>
                <span className="font-medium text-stone-800">{pet.name}</span>
                <span className="text-stone-400 capitalize">({pet.type})</span>
                {pet.notes && <span className="text-stone-500 ml-1">— {pet.notes}</span>}
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-4 text-center text-stone-400 text-sm">No pets recorded</div>
        )
      ) : (
        <div className="p-4 space-y-3">
          {draft.map((pet, i) => (
            <div key={i} className="flex gap-2 items-start">
              <Input
                placeholder="Pet name"
                value={pet.name}
                onChange={(e) => updatePet(i, 'name', e.target.value)}
                className="flex-1"
              />
              <Select
                value={pet.type}
                onChange={(e) => updatePet(i, 'type', e.target.value)}
                className="w-28"
              >
                <option value="dog">Dog</option>
                <option value="cat">Cat</option>
                <option value="bird">Bird</option>
                <option value="fish">Fish</option>
                <option value="reptile">Reptile</option>
                <option value="other">Other</option>
              </Select>
              <Input
                placeholder="Notes (e.g. jumps on guests)"
                value={pet.notes || ''}
                onChange={(e) => updatePet(i, 'notes', e.target.value)}
                className="flex-[2]"
              />
              <button
                type="button"
                onClick={() => removePet(i)}
                className="text-red-400 hover:text-red-600 p-2 mt-1"
              >
                &times;
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addPet}
            className="text-sm text-brand-500 hover:text-brand-600 font-medium"
          >
            + Add pet
          </button>
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} loading={saving}>
              Save
            </Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
