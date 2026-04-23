export type PublicShareVisibilitySettings = {
  show_date_time: boolean
  show_location: boolean
  show_occasion: boolean
  show_guest_count: boolean
  show_service_style: boolean
  show_menu: boolean
  show_dietary_info: boolean
  show_special_requests: boolean
  show_guest_list: boolean
  show_chef_name: boolean
}

export function getDefaultPublicShareVisibilitySettings(): PublicShareVisibilitySettings {
  return {
    show_date_time: true,
    show_location: true,
    show_occasion: true,
    show_guest_count: false,
    show_service_style: false,
    show_menu: false,
    show_dietary_info: false,
    show_special_requests: false,
    show_guest_list: false,
    show_chef_name: true,
  }
}

type PublicShareEventRecord = {
  status: string | null
  occasion: string | null
  event_date: string | null
  serve_time: string | null
  arrival_time: string | null
  event_timezone?: string | null
  guest_count?: number | null
  service_style?: string | null
  location_address?: string | null
  location_city?: string | null
  location_state?: string | null
  location_zip?: string | null
  location_notes?: string | null
  dietary_restrictions?: string[] | null
  allergies?: string[] | null
  special_requests?: string | null
}

type PublicShareChefRecord = {
  display_name?: string | null
  business_name?: string | null
  booking_slug?: string | null
} | null

export function normalizePublicShareVisibilitySettings(
  visibility: Record<string, boolean> | null | undefined
): PublicShareVisibilitySettings {
  return {
    ...getDefaultPublicShareVisibilitySettings(),
    ...(visibility || {}),
  }
}

export function buildPublicShareEventFields<
  TMenu extends { id: string },
  TGuest extends { full_name: string; rsvp_status: string },
>(input: {
  visibility: Record<string, boolean> | null | undefined
  event: PublicShareEventRecord
  chef: PublicShareChefRecord
  menus: TMenu[]
  guestList: TGuest[]
}) {
  const visibility = normalizePublicShareVisibilitySettings(input.visibility)

  return {
    status: input.event.status,
    visibility,
    occasion: visibility.show_occasion ? input.event.occasion : null,
    eventDate: visibility.show_date_time ? input.event.event_date : null,
    serveTime: visibility.show_date_time ? input.event.serve_time : null,
    arrivalTime: visibility.show_date_time ? input.event.arrival_time : null,
    eventTimezone: visibility.show_date_time ? input.event.event_timezone ?? null : null,
    guestCount: visibility.show_guest_count ? input.event.guest_count ?? null : null,
    location: visibility.show_location
      ? {
          address: input.event.location_address ?? null,
          city: input.event.location_city ?? null,
          state: input.event.location_state ?? null,
          zip: input.event.location_zip ?? null,
          notes: input.event.location_notes ?? null,
        }
      : null,
    chefName: visibility.show_chef_name
      ? input.chef?.display_name || input.chef?.business_name || null
      : null,
    chefProfileUrl:
      visibility.show_chef_name && input.chef?.booking_slug
        ? `/chef/${input.chef.booking_slug}`
        : null,
    menus: visibility.show_menu ? input.menus : [],
    dietaryInfo: visibility.show_dietary_info
      ? {
          restrictions: input.event.dietary_restrictions ?? null,
          allergies: input.event.allergies ?? null,
        }
      : null,
    specialRequests: visibility.show_special_requests ? input.event.special_requests ?? null : null,
    guestList: visibility.show_guest_list ? input.guestList : [],
    serviceStyle: visibility.show_service_style ? input.event.service_style ?? null : null,
  }
}
