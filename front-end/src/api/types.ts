export type Role = 'EMPLOYEE' | 'MANAGER' | 'HR'
export type ContractWorkMode = 'ONSITE' | 'REMOTE' | 'HYBRID'
export type EntryType = 'CLOCK_IN' | 'BREAK_START' | 'BREAK_END' | 'CLOCK_OUT'
export type EntryWorkMode = 'OFFICE' | 'REMOTE' | 'TRAVEL'

export interface Employee {
  id: number
  name: string
  email: string
  role: Role
  work_mode: ContractWorkMode
  home_timezone: string
  daily_expected_minutes: number
  active: boolean
  office_id: number
  team_id: number | null
  created_at: string
}

export interface TimeEntry {
  id: number
  employee_id: number
  type: EntryType
  occurred_at: string        // instante em UTC
  local_time: string         // mesmo instante, no fuso onde foi registrado
  timezone: string
  utc_offset_minutes: number
  work_date: string
  country_code: string
  work_mode: EntryWorkMode
  source: 'WEB' | 'ADJUSTMENT'
  note: string | null
  superseded_at: string | null
  created_at: string
}

export interface ClockStatus {
  last_entry: TimeEntry | null
  journey_open: boolean
  next_allowed: EntryType[]
}

export interface LoginResponse {
  token: string
  user: Employee
}

export type WorkdayStatus =
  | 'COMPLETE'
  | 'IN_PROGRESS'
  | 'INCONSISTENT'
  | 'ABSENT'
  | 'PENDING'
  | 'DAY_OFF'
  | 'FUTURE'
  | 'BEFORE_ADMISSION'

export interface Workday {
  date: string
  weekday: number
  status: WorkdayStatus
  worked_minutes: number
  break_minutes: number
  expected_minutes: number
  balance_minutes: number | null
  entries: TimeEntry[]
}

export interface MonthSummary {
  employee: {
    id: number
    name: string
    home_timezone: string
    daily_expected_minutes: number
  }
  month: string
  closing_status: 'OPEN' | 'CLOSED'
  totals: {
    worked_minutes: number
    expected_minutes: number
    balance_minutes: number
    inconsistent_days: number
    absent_days: number
  }
  days: Workday[]
}

export type AdjustmentStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface AdjustmentRequest {
  id: number
  employee_id: number
  time_entry_id: number | null
  requested_type: EntryType
  requested_occurred_at: string
  requested_local_time: string
  timezone: string
  reason: string
  status: AdjustmentStatus
  reviewed_by_id: number | null
  reviewed_at: string | null
  review_comment: string | null
  created_at: string
  employee: { id: number; name: string }
  reviewed_by: { id: number; name: string } | null
  time_entry: Omit<TimeEntry, 'local_time'> | null
}