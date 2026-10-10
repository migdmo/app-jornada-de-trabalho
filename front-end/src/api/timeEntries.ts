import { api } from './client'
import type { ClockStatus, EntryType, EntryWorkMode, TimeEntry } from './types'

export interface RegisterTimeEntryInput {
  type: EntryType
  timezone: string
  country_code: string
  work_mode: EntryWorkMode
}

export function getStatus() {
  return api<ClockStatus>('/me/time-entries/status')
}

export function listMine(from: string, to: string) {
  return api<TimeEntry[]>(`/me/time-entries?from=${from}&to=${to}`)
}

export function register(input: RegisterTimeEntryInput) {
  return api<TimeEntry>('/me/time-entries', {
    method: 'POST',
    body: input,
  })
}