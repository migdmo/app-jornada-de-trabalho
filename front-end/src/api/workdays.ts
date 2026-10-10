import { api } from './client'
import type { MonthSummary } from './types'

function monthQuery(month?: string): string {
  return month ? `?month=${month}` : ''
}

export function getMine(month?: string) {
  return api<MonthSummary>(`/me/workdays${monthQuery(month)}`)
}

export function getOfEmployee(employeeId: number, month?: string) {
  return api<MonthSummary>(`/employees/${employeeId}/workdays${monthQuery(month)}`)
}