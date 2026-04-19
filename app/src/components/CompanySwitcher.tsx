import { useState } from 'react'
import { Button, Card } from './ui'
import { useAppStore } from '../store/appStore'

export function CompanySwitcher() {
  const companies = useAppStore((s) => s.companies)
  const activeCompany = useAppStore((s) => s.activeCompany)
  const switchCompany = useAppStore((s) => s.switchCompany)
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <Button
        variant="ghost"
        type="button"
        onClick={() => setOpen((x) => !x)}
      >
        {activeCompany?.name ?? 'Select Company'} <span aria-hidden>▾</span>
      </Button>
      {open ? (
        <Card className="absolute right-0 z-20 mt-2 w-72 p-2 shadow-lg">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Switch Company
          </div>
          <div className="space-y-1">
            {companies.map((entry) => (
              <button
                key={entry.company.id}
                type="button"
                className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-slate-100"
                onClick={() => {
                  switchCompany(entry.company.id)
                  setOpen(false)
                }}
              >
                <span className="truncate">{entry.company.name}</span>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs uppercase text-slate-700">
                  {entry.role}
                </span>
              </button>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  )
}
