'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  assignDishToStation,
  removeDishAssignment,
  type StationPlanGroup,
} from '@/lib/stations/event-station-actions'
import { toast } from 'sonner'

interface Props {
  eventId: string
  groups: StationPlanGroup[]
  unassigned: { id: string; name: string; course_number: number }[]
  stations: { id: string; name: string }[]
}

export function EventStationPlan({ eventId, groups, unassigned, stations }: Props) {
  const [isPending, startTransition] = useTransition()
  const [localGroups, setLocalGroups] = useState(groups)
  const [localUnassigned, setLocalUnassigned] = useState(unassigned)
  const [assigningDishId, setAssigningDishId] = useState<string | null>(null)

  const hasStations = stations.length > 0
  const hasDishes = localGroups.length > 0 || localUnassigned.length > 0

  if (!hasStations) {
    return (
      <Card className="p-6">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-lg">Station Plan</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <p className="text-sm text-stone-400 mb-3">
            No kitchen stations configured yet. Set up your stations first.
          </p>
          <Link href="/ops/stations">
            <Button variant="secondary" size="sm">
              Configure Stations
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  if (!hasDishes) {
    return (
      <Card className="p-6">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-lg">Station Plan</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <p className="text-sm text-stone-400">
            No menu dishes to assign. Link a menu to this event first.
          </p>
        </CardContent>
      </Card>
    )
  }

  function handleAssign(dishId: string, stationId: string) {
    const dish = localUnassigned.find((d) => d.id === dishId)
    if (!dish) return

    // Optimistic update
    const station = stations.find((s) => s.id === stationId)
    if (!station) return

    setLocalUnassigned((prev) => prev.filter((d) => d.id !== dishId))
    setLocalGroups((prev) => {
      const existing = prev.find((g) => g.station_id === stationId)
      const newDish = {
        id: dishId,
        assignment_id: 'pending',
        name: dish.name,
        course_number: dish.course_number,
        estimated_minutes: null,
        notes: null,
      }
      if (existing) {
        return prev.map((g) =>
          g.station_id === stationId ? { ...g, dishes: [...g.dishes, newDish] } : g
        )
      }
      return [
        ...prev,
        {
          station_id: stationId,
          station_name: station.name,
          dishes: [newDish],
          total_estimated_minutes: 0,
        },
      ]
    })
    setAssigningDishId(null)

    startTransition(async () => {
      try {
        await assignDishToStation({
          event_id: eventId,
          station_id: stationId,
          dish_id: dishId,
        })
        toast.success(`${dish.name} assigned to ${station.name}`)
      } catch (err) {
        // Rollback
        setLocalUnassigned((prev) => [...prev, dish])
        setLocalGroups((prev) =>
          prev
            .map((g) =>
              g.station_id === stationId
                ? { ...g, dishes: g.dishes.filter((d) => d.id !== dishId) }
                : g
            )
            .filter((g) => g.dishes.length > 0)
        )
        toast.error('Failed to assign dish')
      }
    })
  }

  function handleRemove(
    assignmentId: string,
    dishId: string,
    dishName: string,
    courseNumber: number
  ) {
    // Optimistic update
    setLocalGroups((prev) =>
      prev
        .map((g) => ({
          ...g,
          dishes: g.dishes.filter((d) => d.assignment_id !== assignmentId),
        }))
        .filter((g) => g.dishes.length > 0)
    )
    setLocalUnassigned((prev) => [
      ...prev,
      { id: dishId, name: dishName, course_number: courseNumber },
    ])

    startTransition(async () => {
      try {
        await removeDishAssignment(assignmentId)
        toast.success(`${dishName} unassigned`)
      } catch {
        toast.error('Failed to remove assignment')
      }
    })
  }

  const totalMinutes = localGroups.reduce((sum, g) => sum + g.total_estimated_minutes, 0)

  return (
    <Card className="p-6">
      <CardHeader className="px-0 pt-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Station Plan</CardTitle>
          <div className="flex items-center gap-2">
            {totalMinutes > 0 && <Badge variant="default">{totalMinutes} min total</Badge>}
            <Link href="/ops/stations">
              <Button variant="ghost" size="sm">
                Manage Stations
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0 space-y-4">
        {/* Assigned dishes by station */}
        {localGroups.map((group) => (
          <div
            key={group.station_id}
            className="rounded-lg border border-stone-700 bg-stone-900/40"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-700">
              <div className="flex items-center gap-2">
                <span className="font-medium text-stone-200">{group.station_name}</span>
                <Badge variant="default">{group.dishes.length} dishes</Badge>
              </div>
              {group.total_estimated_minutes > 0 && (
                <span className="text-xs text-stone-400">{group.total_estimated_minutes} min</span>
              )}
            </div>
            <div className="divide-y divide-stone-800">
              {group.dishes.map((dish) => (
                <div key={dish.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-stone-300">{dish.name}</span>
                    <span className="text-xs text-stone-500">Course {dish.course_number}</span>
                    {dish.estimated_minutes != null && dish.estimated_minutes > 0 && (
                      <span className="text-xs text-stone-500">({dish.estimated_minutes} min)</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleRemove(dish.assignment_id, dish.id, dish.name, dish.course_number)
                    }
                    disabled={isPending}
                    className="text-xs text-stone-500 hover:text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Unassigned dishes */}
        {localUnassigned.length > 0 && (
          <div className="rounded-lg border border-dashed border-stone-600 bg-stone-900/20 p-4">
            <h3 className="text-sm font-medium text-stone-400 mb-3">
              Unassigned Dishes ({localUnassigned.length})
            </h3>
            <div className="space-y-2">
              {localUnassigned.map((dish) => (
                <div key={dish.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-stone-300">{dish.name}</span>
                    <span className="text-xs text-stone-500">Course {dish.course_number}</span>
                  </div>
                  {assigningDishId === dish.id ? (
                    <div className="flex items-center gap-1">
                      {stations.map((station) => (
                        <button
                          key={station.id}
                          type="button"
                          onClick={() => handleAssign(dish.id, station.id)}
                          disabled={isPending}
                          className="text-xs px-2 py-1 rounded bg-stone-700 text-stone-300 hover:bg-amber-900 hover:text-amber-200 transition-colors"
                        >
                          {station.name}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setAssigningDishId(null)}
                        className="text-xs px-2 py-1 text-stone-500 hover:text-stone-300"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAssigningDishId(dish.id)}
                      disabled={isPending}
                      className="text-xs px-2 py-1 rounded bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200 transition-colors"
                    >
                      Assign
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All assigned state */}
        {localUnassigned.length === 0 && localGroups.length > 0 && (
          <p className="text-xs text-stone-500 text-center py-2">
            All dishes assigned to stations.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
