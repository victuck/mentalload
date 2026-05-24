'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function NavTabs({ householdId }: { householdId: string }) {
  const pathname = usePathname()
  const tabs = [
    { href: `/h/${householdId}/today`, label: 'To-do list' },
    { href: `/h/${householdId}/balance`, label: 'Balance' },
    { href: `/h/${householdId}/household`, label: 'Household' },
  ]

  return (
    <nav className="bg-white border-b border-slate-200 flex px-4">
      {tabs.map(tab => {
        const active = pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              active
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
