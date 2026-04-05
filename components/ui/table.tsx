// Table Component - Data tables
'use client'

import { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes, forwardRef } from 'react'

export interface TableProps extends HTMLAttributes<HTMLTableElement> {}

export const Table = forwardRef<HTMLTableElement, TableProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <div className="overflow-x-auto">
        <table
          ref={ref}
          className={`min-w-full divide-y divide-stone-700 ${className}`}
          {...props}
        />
      </div>
    )
  }
)

Table.displayName = 'Table'

export const TableHeader = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className = '', ...props }, ref) => {
  return <thead ref={ref} className={`bg-stone-800/60 ${className}`} {...props} />
})

TableHeader.displayName = 'TableHeader'

export const TableBody = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className = '', ...props }, ref) => {
  return (
    <tbody ref={ref} className={`bg-stone-900 divide-y divide-stone-800 ${className}`} {...props} />
  )
})

TableBody.displayName = 'TableBody'

export const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
  ({ className = '', ...props }, ref) => {
    return (
      <tr
        ref={ref}
        className={`hover:bg-stone-800/50 transition-colors duration-150 ${className}`}
        {...props}
      />
    )
  }
)

TableRow.displayName = 'TableRow'

export const TableHead = forwardRef<HTMLTableCellElement, ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className = '', ...props }, ref) => {
    return (
      <th
        ref={ref}
        className={`px-6 py-3 text-left text-xs font-medium text-stone-400 uppercase tracking-wider ${className}`}
        {...props}
      />
    )
  }
)

TableHead.displayName = 'TableHead'

export const TableCell = forwardRef<HTMLTableCellElement, TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className = '', ...props }, ref) => {
    return (
      <td
        ref={ref}
        className={`px-6 py-4 whitespace-nowrap text-sm text-stone-300 ${className}`}
        {...props}
      />
    )
  }
)

TableCell.displayName = 'TableCell'
