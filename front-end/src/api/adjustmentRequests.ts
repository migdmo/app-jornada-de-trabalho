import { api } from './client'
import type { AdjustmentRequest, AdjustmentStatus, EntryType } from './types'

export interface CreateAdjustmentInput {
  time_entry_id: number | null
  requested_type: EntryType
  requested_local_time: string   // "2026-10-08T18:00"
  timezone: string
  reason: string
}

export function list(status?: AdjustmentStatus) {
  return api<AdjustmentRequest[]>(`/adjustment-requests${status ? `?status=${status}` : ''}`)
}

export function create(input: CreateAdjustmentInput) {
  return api<AdjustmentRequest>('/adjustment-requests', {
    method: 'POST',
    body: input,
  })
}

export function review(id: number, decision: 'APPROVED' | 'REJECTED', comment: string | null) {
  return api<AdjustmentRequest>(`/adjustment-requests/${id}/review`, {
    method: 'PATCH',
    body: { decision, comment },
  })
}