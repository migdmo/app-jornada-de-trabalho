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