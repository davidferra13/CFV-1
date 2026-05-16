// Visibility uses composable booleans (not an enum) because a menu can be shared AND showcase AND circle-visible simultaneously.

export type MenuOwnership = {
  /** tenantId - the chef business that owns this menu */
  ownerId: string
  /** createdBy - who physically created it (could be delegate) */
  authorId: string | null
  /** clientId - who this menu is FOR (null for templates/portfolio) */
  recipientId: string | null
}

export type MenuVisibility = {
  /** public portfolio piece */
  isShowcase: boolean
  /** circle members can see */
  visibleToDinnerCircle: boolean
  /** sent to client (status >= 'shared') */
  isShared: boolean
}
