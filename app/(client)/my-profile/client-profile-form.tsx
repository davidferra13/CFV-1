// Client Profile Form — self-service editing of personal info and preferences

'use client'

import { useState, useTransition } from 'react'
import { updateMyProfile, type UpdateClientProfileInput } from '@/lib/clients/client-profile-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { TagInput } from '@/components/ui/tag-input'

interface ClientProfileFormProps {
  profile: {
    email: string
    full_name: string
    preferred_name: string | null
    partner_name: string | null
    phone: string | null
    address: string | null
    dietary_restrictions: string[] | null
    allergies: string[] | null
    dislikes: string[] | null
    spice_tolerance: string | null
    favorite_cuisines: string[] | null
    favorite_dishes: string[] | null
    wine_beverage_preferences: string | null
    parking_instructions: string | null
    access_instructions: string | null
    kitchen_size: string | null
    kitchen_constraints: string | null
    house_rules: string | null
    equipment_available: string[] | null
    children: string[] | null
    family_notes: string | null
  }
}

const CUISINE_SUGGESTIONS = [
  'Italian', 'French', 'Japanese', 'Mexican', 'Thai', 'Indian', 'Chinese',
  'Mediterranean', 'Korean', 'Vietnamese', 'Spanish', 'Greek', 'Moroccan',
  'Southern', 'Cajun', 'BBQ', 'Seafood', 'Farm-to-Table', 'Fusion',
]

const DIETARY_SUGGESTIONS = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Paleo',
  'Pescatarian', 'Kosher', 'Halal', 'Low-Sodium', 'Nut-Free',
]

const ALLERGY_SUGGESTIONS = [
  'Peanuts', 'Tree Nuts', 'Shellfish', 'Fish', 'Eggs', 'Milk', 'Soy',
  'Wheat', 'Sesame', 'Sulfites', 'Mustard', 'Celery',
]

export function ClientProfileForm({ profile }: ClientProfileFormProps) {
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [fullName, setFullName] = useState(profile.full_name)
  const [preferredName, setPreferredName] = useState(profile.preferred_name || '')
  const [partnerName, setPartnerName] = useState(profile.partner_name || '')
  const [phone, setPhone] = useState(profile.phone || '')
  const [address, setAddress] = useState(profile.address || '')

  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>(profile.dietary_restrictions || [])
  const [allergies, setAllergies] = useState<string[]>(profile.allergies || [])
  const [dislikes, setDislikes] = useState<string[]>(profile.dislikes || [])
  const [spiceTolerance, setSpiceTolerance] = useState(profile.spice_tolerance || '')
  const [favoriteCuisines, setFavoriteCuisines] = useState<string[]>(profile.favorite_cuisines || [])
  const [favoriteDishes, setFavoriteDishes] = useState<string[]>(profile.favorite_dishes || [])
  const [wineBeveragePreferences, setWineBeveragePreferences] = useState(profile.wine_beverage_preferences || '')

  const [parkingInstructions, setParkingInstructions] = useState(profile.parking_instructions || '')
  const [accessInstructions, setAccessInstructions] = useState(profile.access_instructions || '')
  const [kitchenSize, setKitchenSize] = useState(profile.kitchen_size || '')
  const [kitchenConstraints, setKitchenConstraints] = useState(profile.kitchen_constraints || '')
  const [houseRules, setHouseRules] = useState(profile.house_rules || '')
  const [equipmentAvailable, setEquipmentAvailable] = useState<string[]>(profile.equipment_available || [])

  const [children, setChildren] = useState<string[]>(profile.children || [])
  const [familyNotes, setFamilyNotes] = useState(profile.family_notes || '')

  const handleSave = () => {
    setError(null)
    setSuccess(false)

    const input: UpdateClientProfileInput = {
      full_name: fullName,
      preferred_name: preferredName || null,
      partner_name: partnerName || null,
      phone: phone || null,
      address: address || null,
      dietary_restrictions: dietaryRestrictions,
      allergies,
      dislikes,
      spice_tolerance: (spiceTolerance || null) as UpdateClientProfileInput['spice_tolerance'],
      favorite_cuisines: favoriteCuisines,
      favorite_dishes: favoriteDishes,
      wine_beverage_preferences: wineBeveragePreferences || null,
      parking_instructions: parkingInstructions || null,
      access_instructions: accessInstructions || null,
      kitchen_size: kitchenSize || null,
      kitchen_constraints: kitchenConstraints || null,
      house_rules: houseRules || null,
      equipment_available: equipmentAvailable,
      children,
      family_notes: familyNotes || null,
    }

    startTransition(async () => {
      try {
        await updateMyProfile(input)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } catch (err: any) {
        setError(err.message || 'Failed to save profile')
      }
    })
  }

  return (
    <div className="space-y-6">
      {success && (
        <Alert variant="success">Profile saved successfully.</Alert>
      )}
      {error && (
        <Alert variant="error">{error}</Alert>
      )}

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <Input
              label="Preferred Name"
              value={preferredName}
              onChange={(e) => setPreferredName(e.target.value)}
              helperText="What should your chef call you?"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              label="Partner's Name"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
            />
          </div>

          <div className="text-sm text-stone-500 bg-stone-50 rounded-lg p-3">
            <span className="font-medium">Email:</span> {profile.email}
            <span className="ml-2 text-stone-400">(contact your chef to change)</span>
          </div>

          <Textarea
            label="Home Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={2}
            helperText="Primary address for your chef's reference"
          />
        </CardContent>
      </Card>

      {/* Dietary Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Dietary Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <TagInput
            label="Dietary Restrictions"
            value={dietaryRestrictions}
            onChange={setDietaryRestrictions}
            placeholder="e.g. Vegetarian, Gluten-Free"
            suggestions={DIETARY_SUGGESTIONS}
          />

          <TagInput
            label="Allergies"
            value={allergies}
            onChange={setAllergies}
            placeholder="e.g. Peanuts, Shellfish"
            suggestions={ALLERGY_SUGGESTIONS}
          />

          <TagInput
            label="Dislikes"
            value={dislikes}
            onChange={setDislikes}
            placeholder="Foods you'd rather avoid"
          />

          <Select
            label="Spice Tolerance"
            value={spiceTolerance}
            onChange={(e) => setSpiceTolerance(e.target.value)}
          >
            <option value="">Not specified</option>
            <option value="none">None</option>
            <option value="mild">Mild</option>
            <option value="medium">Medium</option>
            <option value="hot">Hot</option>
            <option value="very_hot">Very Hot</option>
          </Select>

          <TagInput
            label="Favorite Cuisines"
            value={favoriteCuisines}
            onChange={setFavoriteCuisines}
            placeholder="e.g. Italian, Japanese"
            suggestions={CUISINE_SUGGESTIONS}
          />

          <TagInput
            label="Favorite Dishes"
            value={favoriteDishes}
            onChange={setFavoriteDishes}
            placeholder="Specific dishes you love"
          />

          <Textarea
            label="Wine & Beverage Preferences"
            value={wineBeveragePreferences}
            onChange={(e) => setWineBeveragePreferences(e.target.value)}
            rows={2}
            helperText="Preferred wines, cocktails, non-alcoholic beverages, etc."
          />

        </CardContent>
      </Card>

      {/* Kitchen & Logistics */}
      <Card>
        <CardHeader>
          <CardTitle>Kitchen & Logistics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Kitchen Size"
              value={kitchenSize}
              onChange={(e) => setKitchenSize(e.target.value)}
              helperText="e.g. Small galley, Large open kitchen"
            />
          </div>

          <Textarea
            label="Kitchen Constraints"
            value={kitchenConstraints}
            onChange={(e) => setKitchenConstraints(e.target.value)}
            rows={2}
            helperText="Anything your chef should know about your kitchen setup"
          />

          <TagInput
            label="Equipment Available"
            value={equipmentAvailable}
            onChange={setEquipmentAvailable}
            placeholder="e.g. Stand mixer, Sous vide, Pizza oven"
          />

          <Textarea
            label="House Rules"
            value={houseRules}
            onChange={(e) => setHouseRules(e.target.value)}
            rows={2}
            helperText="Shoes off, no fried foods, quiet hours, etc."
          />

          <Textarea
            label="Parking Instructions"
            value={parkingInstructions}
            onChange={(e) => setParkingInstructions(e.target.value)}
            rows={2}
          />

          <Textarea
            label="Access & Arrival Instructions"
            value={accessInstructions}
            onChange={(e) => setAccessInstructions(e.target.value)}
            rows={2}
            helperText="Gate codes, doorman info, key lockbox, etc."
          />
        </CardContent>
      </Card>

      {/* Family */}
      <Card>
        <CardHeader>
          <CardTitle>Family</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <TagInput
            label="Children"
            value={children}
            onChange={setChildren}
            placeholder="Names and ages, e.g. Emma (5), Jack (8)"
          />

          <Textarea
            label="Family Notes"
            value={familyNotes}
            onChange={(e) => setFamilyNotes(e.target.value)}
            rows={2}
            helperText="Anything relevant about your household for your chef"
          />
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pb-8">
        <Button
          variant="primary"
          size="lg"
          onClick={handleSave}
          disabled={isPending || !fullName.trim()}
        >
          {isPending ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </div>
  )
}
