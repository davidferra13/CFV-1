'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { searchGuests } from '@/lib/guests/actions'
import { createReservation, getAvailableTables } from '@/lib/guests/reservation-actions'

interface SearchResult {
  id: string
  name: string
  phone: string | null
  email: string | null
}

interface AvailableTable {
  id: string
  table_label: string
  seat_capacity: number
}

interface ReservationFormModalProps {
  defaultDate?: string
  onClose: () => void
  onCreated: () => void
}

export function ReservationFormModal({
  defaultDate,
  onClose,
  onCreated,
}: ReservationFormModalProps) {
  const [guestName, setGuestName] = useState('')
  const [guestId, setGuestId] = useState<string | undefined>()
  const [guestPhone, setGuestPhone] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [date, setDate] = useState(defaultDate || new Date().toISOString().split('T')[0])
  const [time, setTime] = useState('18:00')
  const [partySize, setPartySize] = useState('2')
  const [tableId, setTableId] = useState<string | undefined>()
  const [notes, setNotes] = useState('')
  const [sendConfirmation, setSendConfirmation] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Guest autocomplete
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Table availability
  const [tables, setTables] = useState<AvailableTable[]>([])
  const [tablesLoading, setTablesLoading] = useState(false)

  // Guest search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!guestName.trim() || guestId) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchGuests(guestName)
        setSearchResults(data as SearchResult[])
        setShowDropdown(true)
      } catch {
        setSearchResults([])
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [guestName, guestId])

  // Load available tables when date/time/party size changes
  useEffect(() => {
    if (!date || !time || !partySize) return

    const size = parseInt(partySize, 10)
    if (isNaN(size) || size < 1) return

    setTablesLoading(true)
    getAvailableTables(date, time, size)
      .then((data) => setTables(data as AvailableTable[]))
      .catch(() => setTables([]))
      .finally(() => setTablesLoading(false))
  }, [date, time, partySize])

  // Outside click to close dropdown
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSelectGuest = (guest: SearchResult) => {
    setGuestId(guest.id)
    setGuestName(guest.name)
    setGuestPhone(guest.phone || '')
    setGuestEmail(guest.email || '')
    setShowDropdown(false)
  }

  const handleClearGuest = () => {
    setGuestId(undefined)
    setGuestName('')
    setGuestPhone('')
    setGuestEmail('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await createReservation({
        guestId,
        guestName,
        guestPhone: guestPhone || undefined,
        guestEmail: guestEmail || undefined,
        date,
        time,
        partySize: parseInt(partySize, 10),
        tableId,
        notes: notes || undefined,
        sendConfirmation,
      })
      onCreated()
    } catch (err: any) {
      setError(err.message || 'Failed to create reservation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-stone-900 rounded-xl border border-stone-700 p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-stone-100 mb-4">New Reservation</h3>

        {error && (
          <div className="rounded-lg bg-red-950 border border-red-800 px-3 py-2 text-sm text-red-400 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Guest name with autocomplete */}
          <div ref={wrapperRef} className="relative">
            <Input
              label="Guest Name"
              value={guestName}
              onChange={(e) => {
                setGuestName(e.target.value)
                if (guestId) setGuestId(undefined)
              }}
              required
              placeholder="Search or enter new guest..."
            />
            {guestId && (
              <button
                type="button"
                onClick={handleClearGuest}
                className="absolute right-3 top-8 text-xs text-stone-500 hover:text-stone-300"
              >
                Clear
              </button>
            )}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute z-50 mt-1 w-full rounded-lg border border-stone-700 bg-stone-800 shadow-lg overflow-hidden">
                {searchResults.map((guest) => (
                  <button
                    key={guest.id}
                    type="button"
                    onClick={() => handleSelectGuest(guest)}
                    className="w-full text-left px-4 py-2 hover:bg-stone-700 transition-colors"
                  >
                    <span className="text-sm text-stone-200">{guest.name}</span>
                    {guest.phone && (
                      <span className="text-xs text-stone-500 ml-2">{guest.phone}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Phone"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              placeholder="Optional"
            />
            <Input
              label="Email"
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <Input
              label="Time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
            <Input
              label="Party Size"
              type="number"
              min="1"
              max="100"
              value={partySize}
              onChange={(e) => setPartySize(e.target.value)}
              required
            />
          </div>

          {/* Table selector */}
          <div>
            <label className="block text-sm font-medium text-stone-400 mb-1">Table</label>
            {tablesLoading ? (
              <p className="text-xs text-stone-500">Loading available tables...</p>
            ) : tables.length === 0 ? (
              <p className="text-xs text-stone-500">No tables available (or none configured).</p>
            ) : (
              <select
                value={tableId || ''}
                onChange={(e) => setTableId(e.target.value || undefined)}
                className="w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-200"
              >
                <option value="">No table assigned</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.table_label} (seats {t.seat_capacity})
                  </option>
                ))}
              </select>
            )}
          </div>

          <Textarea
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Special occasion, seating preference, dietary notes..."
            rows={2}
          />

          {/* Send confirmation checkbox */}
          {guestEmail && (
            <label className="flex items-center gap-2 text-sm text-stone-400 cursor-pointer">
              <input
                type="checkbox"
                checked={sendConfirmation}
                onChange={(e) => setSendConfirmation(e.target.checked)}
                className="rounded border-stone-600"
              />
              Send confirmation email to {guestEmail}
            </label>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={loading}>
              Create Reservation
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
