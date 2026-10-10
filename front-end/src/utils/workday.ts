import type { WorkdayStatus } from '../api/types'

export const DAY_STATUS: Record<WorkdayStatus, { label: string; badge: string; icon: string }> = {
  COMPLETE: { label: 'Completa', badge: 'text-bg-success', icon: 'bi-check-circle' },
  IN_PROGRESS: { label: 'Em andamento', badge: 'text-bg-primary', icon: 'bi-play-circle' },
  INCONSISTENT: { label: 'Inconsistente', badge: 'text-bg-danger', icon: 'bi-exclamation-triangle' },
  ABSENT: { label: 'Falta', badge: 'text-bg-warning', icon: 'bi-x-circle' },
  PENDING: { label: 'Hoje', badge: 'text-bg-light border', icon: 'bi-hourglass-split' },
  DAY_OFF: { label: 'Folga', badge: 'text-bg-light border', icon: 'bi-moon' },
  FUTURE: { label: 'Futuro', badge: 'text-bg-light', icon: 'bi-calendar' },
  BEFORE_ADMISSION: { label: 'Antes da admissão', badge: 'text-bg-light', icon: 'bi-dash' },
}

// "2026-10" + (-1) → "2026-09"
export function addMonths(yearMonth: string, amount: number): string {
  const [year, month] = yearMonth.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1 + amount, 1)).toISOString().slice(0, 7)
}

// "2026-10" → "outubro de 2026"
export function formatMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)))
}

// "2026-10-08" → "qui., 08/10"
export function formatDay(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`))
}