/**
 * Helpers that extract exit-link context dictionaries from
 * ChefFlow domain objects. Every function uses optional chaining
 * and returns empty strings for missing fields so callers never
 * need to null-check.
 */

function str(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

// ─── chef / user context ──────────────────────────────────────

export function getChefContext(user: Record<string, unknown>): Record<string, string> {
  return {
    zip: str(
      (user.profile as Record<string, unknown>)?.zip ??
        (user.profile as Record<string, unknown>)?.zipCode ??
        user.zip ??
        user.zipCode
    ),
    state: str((user.profile as Record<string, unknown>)?.state ?? user.state),
    city: str((user.profile as Record<string, unknown>)?.city ?? user.city),
    county: str((user.profile as Record<string, unknown>)?.county ?? user.county),
    lat: str(
      (user.profile as Record<string, unknown>)?.lat ??
        (user.profile as Record<string, unknown>)?.latitude ??
        user.lat
    ),
    lon: str(
      (user.profile as Record<string, unknown>)?.lon ??
        (user.profile as Record<string, unknown>)?.longitude ??
        user.lon
    ),
    homeAddress: str(
      (user.profile as Record<string, unknown>)?.address ??
        (user.profile as Record<string, unknown>)?.homeAddress ??
        user.homeAddress ??
        user.address
    ),
  }
}

// ─── client context ───────────────────────────────────────────

export function getClientContext(client: Record<string, unknown>): Record<string, string> {
  return {
    clientName: str(client.name ?? client.displayName ?? client.fullName),
    phoneNumber: str(client.phone ?? client.phoneNumber ?? client.mobile),
    clientEmail: str(client.email ?? client.emailAddress),
    clientPhone: str(client.phone ?? client.phoneNumber ?? client.mobile),
    clientZip: str(client.zip ?? client.zipCode),
    handle: str(client.instagram ?? client.instagramHandle ?? client.socialHandle),
    companyUrl: str(client.website ?? client.companyUrl ?? client.url),
    companyName: str(client.company ?? client.companyName ?? client.organizationName),
  }
}

// ─── event context ────────────────────────────────────────────

export function getEventContext(event: Record<string, unknown>): Record<string, string> {
  const venue = (event.venue as Record<string, unknown>) ?? {}
  return {
    eventName: str(event.name ?? event.title ?? event.eventName),
    eventDate: str(event.date ?? event.eventDate ?? event.startDate),
    startDate: str(event.startDate ?? event.date),
    endDate: str(event.endDate ?? event.date),
    venueAddress: str(venue.address ?? venue.fullAddress ?? event.venueAddress ?? event.address),
    venueLat: str(venue.lat ?? venue.latitude ?? event.venueLat),
    venueLon: str(venue.lon ?? venue.longitude ?? event.venueLon),
    venueZip: str(venue.zip ?? venue.zipCode ?? event.venueZip),
    venueEmail: str(venue.email ?? event.venueEmail),
    venueCity: str(venue.city ?? event.venueCity),
    eventType: str(event.type ?? event.eventType ?? event.serviceType),
    paymentId: str(event.stripePaymentId ?? event.paymentId),
  }
}

// ─── vendor context ───────────────────────────────────────────

export function getVendorContext(vendor: Record<string, unknown>): Record<string, string> {
  return {
    vendorName: str(vendor.name ?? vendor.vendorName ?? vendor.displayName),
    vendorEmail: str(vendor.email ?? vendor.vendorEmail),
    vendorPhone: str(vendor.phone ?? vendor.vendorPhone),
    vendorPortalUrl: str(vendor.portalUrl ?? vendor.url ?? vendor.website),
    vendorWebsite: str(vendor.website ?? vendor.url ?? vendor.portalUrl),
    vendorEmails: str(vendor.email ?? vendor.vendorEmail),
  }
}

// ─── staff context ────────────────────────────────────────────

export function getStaffContext(staff: Record<string, unknown>): Record<string, string> {
  return {
    staffName: str(staff.name ?? staff.displayName ?? staff.fullName),
    staffPhone: str(staff.phone ?? staff.phoneNumber ?? staff.mobile),
    amount: str(staff.rate ?? staff.amount ?? staff.pay),
    assistantName: str(staff.name ?? staff.displayName),
    assistantPhone: str(staff.phone ?? staff.phoneNumber),
  }
}

// ─── ingredient context ──────────────────────────────────────

export function getIngredientContext(ingredient: Record<string, unknown>): Record<string, string> {
  return {
    ingredient: str(ingredient.name ?? ingredient.ingredientName ?? ingredient.item),
    allergy: str(ingredient.allergy ?? ingredient.allergen ?? ''),
    firstItem: str(ingredient.name ?? ingredient.ingredientName ?? ingredient.item),
  }
}

// ─── recipe context ──────────────────────────────────────────

export function getRecipeContext(recipe: Record<string, unknown>): Record<string, string> {
  const techniques = recipe.techniques as string[] | undefined
  return {
    technique: str(techniques?.[0] ?? recipe.technique ?? recipe.method),
    cuisine: str(recipe.cuisine ?? recipe.cuisineType),
    dishName: str(recipe.name ?? recipe.title ?? recipe.dishName),
  }
}

// ─── menu context ────────────────────────────────────────────

export function getMenuContext(menu: Record<string, unknown>): Record<string, string> {
  return {
    dishName: str(menu.name ?? menu.title ?? menu.dishName),
    cuisine: str(menu.cuisine ?? menu.cuisineType ?? menu.style),
    eventType: str(menu.eventType ?? menu.type ?? menu.serviceType),
  }
}

// ─── profile / settings context ──────────────────────────────

export function getProfileContext(profile: Record<string, unknown>): Record<string, string> {
  return {
    bankUrl: str(profile.bankUrl ?? profile.bankPortalUrl),
    accountantEmail: str(profile.accountantEmail ?? profile.taxEmail),
    lawyerPhone: str(profile.lawyerPhone ?? profile.attorneyPhone),
    lawyerEmail: str(profile.lawyerEmail ?? profile.attorneyEmail),
    insurancePortalUrl: str(profile.insuranceUrl ?? profile.insurancePortalUrl),
    websiteAdminUrl: str(profile.websiteAdminUrl ?? profile.websiteUrl ?? profile.siteUrl),
    commissaryUrl: str(profile.commissaryUrl ?? profile.kitchenUrl),
    year: str(new Date().getFullYear()),
    month: str(new Date().toLocaleString('en-US', { month: 'long' })),
  }
}

// ─── merge helpers ───────────────────────────────────────────

/**
 * Merge multiple context dictionaries into one.
 * Later entries override earlier ones for the same key.
 */
export function mergeContext(...sources: Record<string, string>[]): Record<string, string> {
  const merged: Record<string, string> = {}
  for (const src of sources) {
    for (const [k, v] of Object.entries(src)) {
      if (v) merged[k] = v
    }
  }
  return merged
}
