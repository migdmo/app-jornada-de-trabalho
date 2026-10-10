import { DateTime } from 'luxon'
import * as timeEntryRepository from '../repositories/timeEntryRepository'
import * as employeeRepository from '../repositories/employeeRepository'
import * as closingRepository from '../repositories/monthlyClosingRepository'
import type { TimeEntry } from '../../generated/prisma/client.ts'
import type { AuthUser } from './authService.ts'
import { withLocalTime, MAX_OPEN_JOURNEY_HOURS } from './timeEntryService'
import { ensureCanViewEmployee } from './accessService'
import { BusinessRuleError } from '../errors/BusinessRuleError'
import { NotFoundError } from '../errors/NotFoundError'

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
  date: string;                   // "2026-10-20"
  weekday: number;                // 1 = segunda ... 7 = domingo
  status: WorkdayStatus;
  worked_minutes: number;
  break_minutes: number;
  expected_minutes: number;
  balance_minutes: number | null; // null = ainda não conta no saldo
  entries: ReturnType<typeof withLocalTime>[];
}

const YEAR_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/

/******************** CÁLCULO DE UM DIA ********************/

// Percorre as marcações em ordem e soma os períodos trabalhados e de intervalo.
// Funciona como uma pequena máquina de estados: FORA → TRABALHANDO → EM INTERVALO...
function summarize(entries: TimeEntry[], now: DateTime) {
  let worked = 0
  let breaks = 0
  let consistent = true
  let state: 'OUT' | 'WORKING' | 'ON_BREAK' = 'OUT'
  let since: DateTime | null = null

  for (const entry of entries) {
    const at = DateTime.fromJSDate(entry.occurred_at)
    const minutes = since ? at.diff(since, 'minutes').minutes : 0

    switch (entry.type) {
      case 'CLOCK_IN':
        if (state !== 'OUT') consistent = false
        state = 'WORKING'
        break

      case 'BREAK_START':
        if (state === 'WORKING') worked += minutes
        else consistent = false
        state = 'ON_BREAK'
        break

      case 'BREAK_END':
        if (state === 'ON_BREAK') breaks += minutes
        else consistent = false
        state = 'WORKING'
        break

      case 'CLOCK_OUT':
        if (state === 'WORKING') worked += minutes
        else consistent = false
        state = 'OUT'
        break
    }

    since = at
  }

  const open = state !== 'OUT'
  const recent = open && since !== null
    && now.diff(since, 'hours').hours <= MAX_OPEN_JOURNEY_HOURS

  // Jornada em andamento: conta o período aberto até agora
  if (recent && since) {
    const openMinutes = now.diff(since, 'minutes').minutes
    if (state === 'WORKING') worked += openMinutes
    else breaks += openMinutes
  }

  return {
    worked: Math.round(worked),
    breaks: Math.round(breaks),
    open,
    recent,
    consistent,
  }
}

function emptyDay(date: string, weekday: number, status: WorkdayStatus): Workday {
  return {
    date, weekday, status,
    worked_minutes: 0, break_minutes: 0,
    expected_minutes: 0, balance_minutes: null,
    entries: [],
  }
}

function buildDay(
  date: string,
  weekday: number,
  entries: TimeEntry[],
  ctx: { today: string; admission: string; dailyExpected: number; now: DateTime }
): Workday {
  const isWeekend = weekday >= 6

  if (date < ctx.admission) return emptyDay(date, weekday, 'BEFORE_ADMISSION')
  if (date > ctx.today) return emptyDay(date, weekday, 'FUTURE')

  if (entries.length === 0) {
    if (isWeekend) return emptyDay(date, weekday, 'DAY_OFF')
    if (date === ctx.today) return emptyDay(date, weekday, 'PENDING')

    // Dia útil que já passou sem marcação: falta
    return {
      ...emptyDay(date, weekday, 'ABSENT'),
      expected_minutes: ctx.dailyExpected,
      balance_minutes: -ctx.dailyExpected,
    }
  }

  const result = summarize(entries, ctx.now)
  const expected = isWeekend ? 0 : ctx.dailyExpected

  let status: WorkdayStatus
  if (result.recent) status = 'IN_PROGRESS'
  else if (result.open || !result.consistent) status = 'INCONSISTENT'
  else status = 'COMPLETE'

  return {
    date,
    weekday,
    status,
    worked_minutes: result.worked,
    break_minutes: result.breaks,
    expected_minutes: expected,
    balance_minutes: status === 'IN_PROGRESS' ? null : result.worked - expected,
    entries: entries.map(withLocalTime),
  }
}

/******************** OPERAÇÕES ********************/

export async function getMonth(employeeId: number, month?: string) {
  const employee = await employeeRepository.findById(employeeId)
  if (!employee) {
    throw new NotFoundError('Colaborador não encontrado.')
  }

  const now = DateTime.now()

  // "Hoje" e "data de admissão" são calculados no fuso base do colaborador
  const today = now.setZone(employee.home_timezone).toISODate()!
  const admission = DateTime.fromJSDate(employee.created_at)
    .setZone(employee.home_timezone)
    .toISODate()!

  const yearMonth = month ?? today.slice(0, 7)
  if (!YEAR_MONTH.test(yearMonth)) {
    throw new BusinessRuleError('O mês deve estar no formato AAAA-MM, ex: 2026-10.')
  }

  const firstDay = DateTime.fromISO(`${yearMonth}-01`, { zone: 'utc' })
  const lastDay = firstDay.endOf('month').startOf('day')

  const entries = await timeEntryRepository.findByPeriod(
    employeeId,
    firstDay.toJSDate(),
    lastDay.toJSDate()
  )

  // Agrupa as marcações pela data da jornada
  const entriesByDate = new Map<string, TimeEntry[]>()
  for (const entry of entries) {
    const key = entry.work_date.toISOString().slice(0, 10)
    entriesByDate.set(key, [...(entriesByDate.get(key) ?? []), entry])
  }

  const ctx = { today, admission, dailyExpected: employee.daily_expected_minutes, now }
  const days: Workday[] = []

  for (let day = firstDay; day <= lastDay; day = day.plus({ days: 1 })) {
    const date = day.toISODate()!
    days.push(buildDay(date, day.weekday, entriesByDate.get(date) ?? [], ctx))
  }

  const counted = days.filter((d) => d.balance_minutes !== null)
  const closing = await closingRepository.findByEmployeeAndMonth(employeeId, yearMonth)

  return {
    employee: {
      id: employee.id,
      name: employee.name,
      home_timezone: employee.home_timezone,
      daily_expected_minutes: employee.daily_expected_minutes,
    },
    month: yearMonth,
    closing_status: closing?.status ?? 'OPEN',
    totals: {
      worked_minutes: days.reduce((sum, d) => sum + d.worked_minutes, 0),
      expected_minutes: counted.reduce((sum, d) => sum + d.expected_minutes, 0),
      balance_minutes: counted.reduce((sum, d) => sum + (d.balance_minutes ?? 0), 0),
      inconsistent_days: days.filter((d) => d.status === 'INCONSISTENT').length,
      absent_days: days.filter((d) => d.status === 'ABSENT').length,
    },
    days,
  }
}

// Mesma consulta, mas verificando antes se quem pede pode ver
export async function getMonthForViewer(viewer: AuthUser, employeeId: number, month?: string) {
  await ensureCanViewEmployee(viewer, employeeId)
  return getMonth(employeeId, month)
}