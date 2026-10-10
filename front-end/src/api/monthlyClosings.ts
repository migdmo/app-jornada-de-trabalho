import { api } from './client'
import type { MonthlyClosing } from './types'

export function list(month: string) {
  return api<MonthlyClosing[]>(`/monthly-closings?month=${month}`)
}

export function close(employeeId: number, yearMonth: string) {
  return api<MonthlyClosing>('/monthly-closings', {
    method: 'POST',
    body: { employee_id: employeeId, year_month: yearMonth },
  })
}