'use client'

import { useState, useEffect, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  getVenueDetails,
  upsertVenueDetails,
  type VenueDetails,
  type FarmShowcaseItem,
  type FarmCropItem,
} from '@/lib/events/venue-details-actions'

type Props = {
  eventId: string
}

export function VenueDetailsPanel({ eventId }: Props) {
  const [details, setDetails] = useState<VenueDetails | null>(null)
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [loaded, setLoaded] = useState(false)

  // Form state
  const [parkingCapacity, setParkingCapacity] = useState('')
  const [parkingInstructions, setParkingInstructions] = useState('')
  const [overflowPlan, setOverflowPlan] = useState('')
  const [gateCode, setGateCode] = useState('')
  const [accessInstructions, setAccessInstructions] = useState('')
  const [directionsFromRoad, setDirectionsFromRoad] = useState('')
  const [rainBackupPlan, setRainBackupPlan] = useState('')
  const [powerNotes, setPowerNotes] = useState('')
  const [waterNotes, setWaterNotes] = useState('')
  const [restroomInfo, setRestroomInfo] = useState('')
  const [kitchenZone, setKitchenZone] = useState('')
  const [diningZone, setDiningZone] = useState('')
  const [barZone, setBarZone] = useState('')
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [petPolicy, setPetPolicy] = useState('')
  const [propertyRules, setPropertyRules] = useState('')
  const [farmName, setFarmName] = useState('')
  const [farmBio, setFarmBio] = useState('')
  const [farmWebsite, setFarmWebsite] = useState('')
  const [farmAnimals, setFarmAnimals] = useState<FarmShowcaseItem[]>([])
  const [farmCrops, setFarmCrops] = useState<FarmCropItem[]>([])

  useEffect(() => {
    getVenueDetails(eventId)
      .then((data) => {
        setDetails(data)
        if (data) populateForm(data)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [eventId])

  function populateForm(d: VenueDetails) {
    setParkingCapacity(d.parking_capacity?.toString() || '')
    setParkingInstructions(d.parking_instructions || '')
    setOverflowPlan(d.overflow_plan || '')
    setGateCode(d.gate_code || '')
    setAccessInstructions(d.access_instructions || '')
    setDirectionsFromRoad(d.directions_from_road || '')
    setRainBackupPlan(d.rain_backup_plan || '')
    setPowerNotes(d.power_access_notes || '')
    setWaterNotes(d.water_access_notes || '')
    setRestroomInfo(d.restroom_info || '')
    setKitchenZone(d.kitchen_zone || '')
    setDiningZone(d.dining_zone || '')
    setBarZone(d.bar_zone || '')
    setWelcomeMessage(d.welcome_message || '')
    setPetPolicy(d.pet_policy || '')
    setPropertyRules((d.property_rules || []).join('\n'))
    setFarmName(d.farm_name || '')
    setFarmBio(d.farm_bio || '')
    setFarmWebsite(d.farm_website || '')
    setFarmAnimals(d.farm_animals || [])
    setFarmCrops(d.farm_crops || [])
  }

  function handleSave() {
    startTransition(async () => {
      const result = await upsertVenueDetails({
        eventId,
        data: {
          parking_capacity: parkingCapacity ? parseInt(parkingCapacity) : null,
          parking_instructions: parkingInstructions.trim() || null,
          overflow_plan: overflowPlan.trim() || null,
          gate_code: gateCode.trim() || null,
          access_instructions: accessInstructions.trim() || null,
          directions_from_road: directionsFromRoad.trim() || null,
          rain_backup_plan: rainBackupPlan.trim() || null,
          power_access_notes: powerNotes.trim() || null,
          water_access_notes: waterNotes.trim() || null,
          restroom_info: restroomInfo.trim() || null,
          kitchen_zone: kitchenZone.trim() || null,
          dining_zone: diningZone.trim() || null,
          bar_zone: barZone.trim() || null,
          welcome_message: welcomeMessage.trim() || null,
          pet_policy: petPolicy.trim() || null,
          property_rules: propertyRules
            .split('\n')
            .map((r) => r.trim())
            .filter(Boolean),
          farm_name: farmName.trim() || null,
          farm_bio: farmBio.trim() || null,
          farm_website: farmWebsite.trim() || null,
          farm_animals: farmAnimals.filter((a) => a.name.trim()),
          farm_crops: farmCrops.filter((c) => c.name.trim()),
        },
      })
      if (result.success) {
        const updated = await getVenueDetails(eventId)
        setDetails(updated)
        setEditing(false)
      }
    })
  }

  if (!loaded) return null

  // Show setup prompt if no details exist
  if (!details && !editing) {
    return (
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white">Venue Details</h3>
            <p className="text-sm text-stone-400 mt-1">
              Parking, access, setup zones, and property info for your venue.
            </p>
          </div>
          <Button variant="primary" onClick={() => setEditing(true)} className="text-xs">
            Set Up Venue
          </Button>
        </div>
      </Card>
    )
  }

  // Display mode
  if (!editing && details) {
    return (
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">
            {details.farm_name ? `${details.farm_name} - Venue Details` : 'Venue Details'}
          </h3>
          <Button variant="ghost" onClick={() => setEditing(true)} className="text-xs">
            Edit
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Parking & Access */}
          <div className="space-y-3">
            <div>
              <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Parking</p>
              {details.parking_capacity && (
                <p className="text-sm text-stone-200">{details.parking_capacity} vehicles</p>
              )}
              {details.parking_instructions && (
                <p className="text-sm text-stone-300">{details.parking_instructions}</p>
              )}
              {details.overflow_plan && (
                <p className="text-xs text-stone-400 mt-1">Overflow: {details.overflow_plan}</p>
              )}
              {!details.parking_capacity && !details.parking_instructions && (
                <p className="text-sm text-stone-500 italic">Not specified</p>
              )}
            </div>

            <div>
              <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Access</p>
              {details.gate_code && (
                <p className="text-sm text-amber-300 font-mono">Gate: {details.gate_code}</p>
              )}
              {details.directions_from_road && (
                <p className="text-sm text-stone-300">{details.directions_from_road}</p>
              )}
              {details.access_instructions && (
                <p className="text-sm text-stone-300">{details.access_instructions}</p>
              )}
            </div>

            <div>
              <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Weather Plan</p>
              <p className="text-sm text-stone-300">
                {details.rain_backup_plan || (
                  <span className="text-stone-500 italic">Not specified</span>
                )}
              </p>
            </div>
          </div>

          {/* Infrastructure & Setup */}
          <div className="space-y-3">
            <div>
              <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Setup Zones</p>
              <div className="space-y-1">
                {details.kitchen_zone && (
                  <p className="text-sm text-stone-300">Kitchen: {details.kitchen_zone}</p>
                )}
                {details.dining_zone && (
                  <p className="text-sm text-stone-300">Dining: {details.dining_zone}</p>
                )}
                {details.bar_zone && (
                  <p className="text-sm text-stone-300">Bar: {details.bar_zone}</p>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Infrastructure</p>
              {details.power_access_notes && (
                <p className="text-sm text-stone-300">Power: {details.power_access_notes}</p>
              )}
              {details.water_access_notes && (
                <p className="text-sm text-stone-300">Water: {details.water_access_notes}</p>
              )}
              {details.restroom_info && (
                <p className="text-sm text-stone-300">Restrooms: {details.restroom_info}</p>
              )}
            </div>

            {details.property_rules.length > 0 && (
              <div>
                <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">
                  Property Rules
                </p>
                <ul className="list-disc list-inside space-y-0.5">
                  {details.property_rules.map((rule, i) => (
                    <li key={i} className="text-sm text-stone-300">
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Welcome message */}
        {details.welcome_message && (
          <div className="mt-4 pt-3 border-t border-stone-700/50">
            <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Guest Welcome</p>
            <p className="text-sm text-stone-200 italic">{details.welcome_message}</p>
          </div>
        )}

        {/* Farm profile */}
        {details.farm_bio && (
          <div className="mt-4 pt-3 border-t border-stone-700/50">
            <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">About the Farm</p>
            <p className="text-sm text-stone-300">{details.farm_bio}</p>
            {details.farm_website && (
              <a
                href={details.farm_website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand-400 hover:text-brand-300 mt-1 inline-block"
              >
                {details.farm_website}
              </a>
            )}
          </div>
        )}

        {/* Farm Showcase: Animals & Crops */}
        {(details.farm_animals.length > 0 || details.farm_crops.length > 0) && (
          <div className="mt-4 pt-3 border-t border-stone-700/50">
            {details.farm_animals.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-stone-400 uppercase tracking-wide mb-2">Our Animals</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {details.farm_animals.map((animal, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-stone-700/50 bg-stone-800/30 overflow-hidden"
                    >
                      {animal.photo_url && (
                        <img
                          src={animal.photo_url}
                          alt={animal.name}
                          className="w-full h-20 object-cover"
                        />
                      )}
                      <div className="p-2">
                        <p className="text-sm font-medium text-stone-200">{animal.name}</p>
                        {animal.description && (
                          <p className="text-xs text-stone-400 mt-0.5">{animal.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {details.farm_crops.length > 0 && (
              <div>
                <p className="text-xs text-stone-400 uppercase tracking-wide mb-2">What We Grow</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {details.farm_crops.map((crop, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-stone-700/50 bg-stone-800/30 overflow-hidden"
                    >
                      {crop.photo_url && (
                        <img
                          src={crop.photo_url}
                          alt={crop.name}
                          className="w-full h-20 object-cover"
                        />
                      )}
                      <div className="p-2">
                        <p className="text-sm font-medium text-stone-200">{crop.name}</p>
                        {crop.variety && <p className="text-xs text-emerald-400">{crop.variety}</p>}
                        {crop.description && (
                          <p className="text-xs text-stone-400 mt-0.5">{crop.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    )
  }

  // Edit mode
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">Venue Details</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              setEditing(false)
              if (details) populateForm(details)
            }}
          >
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={isPending}>
            {isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Farm Profile */}
        <fieldset className="space-y-3">
          <legend className="text-xs text-stone-400 uppercase tracking-wide font-medium">
            Farm Profile
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-stone-400 mb-1">Farm Name</label>
              <input
                type="text"
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
                placeholder="Green Valley Farm"
                className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-400 mb-1">Website</label>
              <input
                type="url"
                value={farmWebsite}
                onChange={(e) => setFarmWebsite(e.target.value)}
                placeholder="https://greenvalleyfarm.com"
                className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-stone-400 mb-1">About the Farm</label>
            <textarea
              value={farmBio}
              onChange={(e) => setFarmBio(e.target.value)}
              placeholder="Tell guests about your farm, what you grow, your story..."
              rows={3}
              className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600 resize-none"
            />
          </div>
        </fieldset>

        {/* Farm Showcase: Animals */}
        <fieldset className="space-y-3">
          <legend className="text-xs text-stone-400 uppercase tracking-wide font-medium">
            Farm Animals
          </legend>
          <p className="text-xs text-stone-500">
            Showcase your animals for guests to see on the event page.
          </p>
          {farmAnimals.map((animal, i) => (
            <div key={i} className="flex gap-2 items-start">
              <input
                type="text"
                value={animal.name}
                onChange={(e) => {
                  const updated = [...farmAnimals]
                  updated[i] = { ...updated[i], name: e.target.value }
                  setFarmAnimals(updated)
                }}
                placeholder="e.g. Highland Cows"
                className="flex-1 rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
              />
              <input
                type="text"
                value={animal.description || ''}
                onChange={(e) => {
                  const updated = [...farmAnimals]
                  updated[i] = { ...updated[i], description: e.target.value }
                  setFarmAnimals(updated)
                }}
                placeholder="Description"
                className="flex-1 rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
              />
              <input
                type="url"
                value={animal.photo_url || ''}
                onChange={(e) => {
                  const updated = [...farmAnimals]
                  updated[i] = { ...updated[i], photo_url: e.target.value }
                  setFarmAnimals(updated)
                }}
                placeholder="Photo URL"
                className="flex-1 rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
              />
              <button
                type="button"
                onClick={() => setFarmAnimals(farmAnimals.filter((_, j) => j !== i))}
                className="text-red-400 hover:text-red-300 text-sm px-2 py-2"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setFarmAnimals([...farmAnimals, { name: '' }])}
            className="text-xs text-amber-500 hover:text-amber-400"
          >
            + Add animal
          </button>
        </fieldset>

        {/* Farm Showcase: Crops */}
        <fieldset className="space-y-3">
          <legend className="text-xs text-stone-400 uppercase tracking-wide font-medium">
            What We Grow
          </legend>
          <p className="text-xs text-stone-500">
            Highlight your crops and plants for the event page.
          </p>
          {farmCrops.map((crop, i) => (
            <div key={i} className="flex gap-2 items-start flex-wrap">
              <input
                type="text"
                value={crop.name}
                onChange={(e) => {
                  const updated = [...farmCrops]
                  updated[i] = { ...updated[i], name: e.target.value }
                  setFarmCrops(updated)
                }}
                placeholder="e.g. Heirloom Tomatoes"
                className="flex-1 min-w-[120px] rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
              />
              <input
                type="text"
                value={crop.variety || ''}
                onChange={(e) => {
                  const updated = [...farmCrops]
                  updated[i] = { ...updated[i], variety: e.target.value }
                  setFarmCrops(updated)
                }}
                placeholder="Variety"
                className="flex-1 min-w-[100px] rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
              />
              <input
                type="text"
                value={crop.description || ''}
                onChange={(e) => {
                  const updated = [...farmCrops]
                  updated[i] = { ...updated[i], description: e.target.value }
                  setFarmCrops(updated)
                }}
                placeholder="In season June-Sept"
                className="flex-1 min-w-[120px] rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
              />
              <input
                type="url"
                value={crop.photo_url || ''}
                onChange={(e) => {
                  const updated = [...farmCrops]
                  updated[i] = { ...updated[i], photo_url: e.target.value }
                  setFarmCrops(updated)
                }}
                placeholder="Photo URL"
                className="flex-1 min-w-[120px] rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
              />
              <button
                type="button"
                onClick={() => setFarmCrops(farmCrops.filter((_, j) => j !== i))}
                className="text-red-400 hover:text-red-300 text-sm px-2 py-2"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setFarmCrops([...farmCrops, { name: '' }])}
            className="text-xs text-amber-500 hover:text-amber-400"
          >
            + Add crop/plant
          </button>
        </fieldset>

        {/* Parking & Access */}
        <fieldset className="space-y-3">
          <legend className="text-xs text-stone-400 uppercase tracking-wide font-medium">
            Parking & Access
          </legend>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-stone-400 mb-1">Parking Capacity</label>
              <input
                type="number"
                value={parkingCapacity}
                onChange={(e) => setParkingCapacity(e.target.value)}
                placeholder="25"
                min="0"
                className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-stone-400 mb-1">Gate Code</label>
              <input
                type="text"
                value={gateCode}
                onChange={(e) => setGateCode(e.target.value)}
                placeholder="#1234 or 'gate is open'"
                className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-stone-400 mb-1">Parking Instructions</label>
            <input
              type="text"
              value={parkingInstructions}
              onChange={(e) => setParkingInstructions(e.target.value)}
              placeholder="Park along the gravel drive, past the red barn"
              className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-400 mb-1">Directions from Main Road</label>
            <textarea
              value={directionsFromRoad}
              onChange={(e) => setDirectionsFromRoad(e.target.value)}
              placeholder="Turn right on Elm St, go 0.5 miles, farm entrance on left (stone pillars)..."
              rows={2}
              className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-400 mb-1">Overflow Parking Plan</label>
            <input
              type="text"
              value={overflowPlan}
              onChange={(e) => setOverflowPlan(e.target.value)}
              placeholder="Overflow along field edge, attendant will direct"
              className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-400 mb-1">Access Instructions</label>
            <input
              type="text"
              value={accessInstructions}
              onChange={(e) => setAccessInstructions(e.target.value)}
              placeholder="Follow signs to event area after parking"
              className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
            />
          </div>
        </fieldset>

        {/* Setup Zones */}
        <fieldset className="space-y-3">
          <legend className="text-xs text-stone-400 uppercase tracking-wide font-medium">
            Setup Zones
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-stone-400 mb-1">Kitchen Area</label>
              <input
                type="text"
                value={kitchenZone}
                onChange={(e) => setKitchenZone(e.target.value)}
                placeholder="Under the pavilion, near electrical outlet"
                className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-400 mb-1">Dining Area</label>
              <input
                type="text"
                value={diningZone}
                onChange={(e) => setDiningZone(e.target.value)}
                placeholder="Long table in the meadow"
                className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-400 mb-1">Bar Area</label>
              <input
                type="text"
                value={barZone}
                onChange={(e) => setBarZone(e.target.value)}
                placeholder="By the fire pit, self-serve"
                className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
              />
            </div>
          </div>
        </fieldset>

        {/* Infrastructure */}
        <fieldset className="space-y-3">
          <legend className="text-xs text-stone-400 uppercase tracking-wide font-medium">
            Infrastructure
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-stone-400 mb-1">Power Access</label>
              <input
                type="text"
                value={powerNotes}
                onChange={(e) => setPowerNotes(e.target.value)}
                placeholder="Two 20A outlets in pavilion, generator available"
                className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-400 mb-1">Water Access</label>
              <input
                type="text"
                value={waterNotes}
                onChange={(e) => setWaterNotes(e.target.value)}
                placeholder="Spigot behind barn, 50ft hose provided"
                className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-400 mb-1">Restrooms</label>
              <input
                type="text"
                value={restroomInfo}
                onChange={(e) => setRestroomInfo(e.target.value)}
                placeholder="Indoor bathroom in farmhouse + 2 portables"
                className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
              />
            </div>
          </div>
        </fieldset>

        {/* Weather & Rules */}
        <fieldset className="space-y-3">
          <legend className="text-xs text-stone-400 uppercase tracking-wide font-medium">
            Weather & Rules
          </legend>
          <div>
            <label className="block text-xs text-stone-400 mb-1">Rain Backup Plan</label>
            <input
              type="text"
              value={rainBackupPlan}
              onChange={(e) => setRainBackupPlan(e.target.value)}
              placeholder="Move to barn, fits 40 seated"
              className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-400 mb-1">Pet Policy</label>
            <input
              type="text"
              value={petPolicy}
              onChange={(e) => setPetPolicy(e.target.value)}
              placeholder="No pets allowed (farm animals on property)"
              className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-400 mb-1">
              Property Rules (one per line)
            </label>
            <textarea
              value={propertyRules}
              onChange={(e) => setPropertyRules(e.target.value)}
              placeholder={
                'No smoking on property\nStay on marked paths\nNo flash photography near animals'
              }
              rows={3}
              className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600 resize-none"
            />
          </div>
        </fieldset>

        {/* Guest Experience */}
        <fieldset className="space-y-3">
          <legend className="text-xs text-stone-400 uppercase tracking-wide font-medium">
            Guest Arrival
          </legend>
          <div>
            <label className="block text-xs text-stone-400 mb-1">
              Welcome Message (shown on arrival)
            </label>
            <textarea
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="Welcome to Green Valley Farm! We're so glad you're here..."
              rows={2}
              className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-white placeholder:text-stone-600 resize-none"
            />
          </div>
        </fieldset>
      </div>
    </Card>
  )
}
