"use client"

import { CalendarGrid } from "@/components/dashboard/calendar-grid"

export default function AgendaPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Agenda</h1>
        <p className="mt-1 text-sm text-gray-500">Vista interactiva de citas. Click en un horario para agendar.</p>
      </div>
      <CalendarGrid />
    </div>
  )
}
