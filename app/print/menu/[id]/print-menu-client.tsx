'use client'

import { useState } from 'react'
import type { FOHMenuData } from '@/lib/menus/foh-menu-data'
import type { FOHMenuOptions } from '@/lib/menus/foh-menu-options'
import { defaultFOHMenuOptions } from '@/lib/menus/foh-menu-options'
import { FrontOfHouseMenu } from '@/components/menus/front-of-house-menu'
import { FOHCustomizationPanel } from '@/components/menus/foh-customization-panel'

export function PrintMenuClient({ data }: { data: FOHMenuData }) {
  const [options, setOptions] = useState<FOHMenuOptions>(defaultFOHMenuOptions)

  return (
    <>
      <FOHCustomizationPanel options={options} onChange={setOptions} />
      <FrontOfHouseMenu data={data} options={options} />
    </>
  )
}
