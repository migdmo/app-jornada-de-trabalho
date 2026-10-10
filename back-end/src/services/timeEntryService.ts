import { DateTime, IANAZone } from 'luxon'
import * as repository from '../repositories/timeEntryRepository'
import * as employeeRepository from '../repositories/employeeRepository'
import * as closingRepository from '../repositories/monthlyClosingRepository'
import type { TimeEntry } from '../../generated/prisma/client'
import { EntryType, EntryWorkMode } from '../../generated/prisma/enums'
import type { CreateTimeEntryDto } from '../dtos/timeEntry/createTimeEntryDto'
import { BusinessRuleError } from '../errors/BusinessRuleError'
import { NotFoundError } from '../errors/NotFoundError'

const MIN_SECONDS_BETWEEN_ENTRIES = 60
export const MAX_OPEN_JOURNEY_HOURS = 16
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

// A partir da última marcação, quais são as próximas permitidas
const NEXT_ALLOWED: Record<EntryType, EntryType[]> = {
  CLOCK_IN: ['BREAK_START', 'CLOCK_OUT'],
  BREAK_START: ['BREAK_END'],
  BREAK_END: ['BREAK_START', 'CLOCK_OUT'],
  CLOCK_OUT: ['CLOCK_IN'],
}

const LABELS: Record<EntryType, string> = {
  CLOCK_IN: 'entrada',
  BREAK_START: 'início de intervalo',
  BREAK_END: 'fim de intervalo',
  CLOCK_OUT: 'saída',
}

/******************** AUXILIARES ********************/

// Converte "2026-10-20" no formato que o banco usa para colunas DATE
export function toDbDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`)
}

// Acrescenta o horário local de onde a marcação foi feita
export function withLocalTime(entry: TimeEntry) {
  return {
    ...entry,
    local_time: DateTime.fromJSDate(entry.occurred_at).setZone(entry.timezone).toISO(),
  }
}

// Retorna a última marcação se a jornada ainda estiver aberta.
// Jornada aberta há mais de 16h é considerada esquecida: o colaborador
// pode iniciar outra, e a anterior será corrigida por ajuste.
function getOpenJourney(last: TimeEntry | null, now: DateTime): TimeEntry | null {
  if (!last || last.type === 'CLOCK_OUT') return null

  const hoursOpen = now.diff(DateTime.fromJSDate(last.occurred_at), 'hours').hours
  return hoursOpen > MAX_OPEN_JOURNEY_HOURS ? null : last
}

function nextAllowedTypes(openJourney: TimeEntry | null): EntryType[] {
  return openJourney ? NEXT_ALLOWED[openJourney.type] : ['CLOCK_IN']
}

function validate(data: CreateTimeEntryDto): void {
  if (!Object.values(EntryType).includes(data.type)) {
    throw new BusinessRuleError('Tipo de marcação inválido.')
  }
  if (!data.timezone || !IANAZone.isValidZone(data.timezone)) {
    throw new BusinessRuleError('Fuso horário inválido.')
  }
  if (!/^[A-Z]{2}$/.test(data.country_code?.toUpperCase() ?? '')) {
    throw new BusinessRuleError('Código do país inválido.')
  }
  if (!Object.values(EntryWorkMode).includes(data.work_mode)) {
    throw new BusinessRuleError('Modalidade de trabalho inválida.')
  }
}

export async function ensureMonthIsOpen(employeeId: number, workDate: string): Promise<void> {
  const yearMonth = workDate.slice(0, 7)
  const closing = await closingRepository.findByEmployeeAndMonth(employeeId, yearMonth)

  if (closing?.status === 'CLOSED') {
    throw new BusinessRuleError(`O mês ${yearMonth} já foi fechado pelo RH.`)
  }
}

async function ensureActiveEmployee(employeeId: number) {
  const employee = await employeeRepository.findById(employeeId)
  if (!employee || !employee.active) {
    throw new NotFoundError('Colaborador não encontrado ou inativo.')
  }
  return employee
}

/******************** OPERAÇÕES ********************/

export async function register(employeeId: number, data: CreateTimeEntryDto) {
  validate(data)
  await ensureActiveEmployee(employeeId)

  // O instante é definido pelo SERVIDOR, no fuso de onde a pessoa está
  const now = DateTime.now().setZone(data.timezone)

  const last = await repository.findLastActive(employeeId)
  const openJourney = getOpenJourney(last, now)
  const allowed = nextAllowedTypes(openJourney)

  if (!allowed.includes(data.type)) {
    const expected = allowed.map((type) => LABELS[type]).join(' ou ')
    throw new BusinessRuleError(
      `Não é possível registrar ${LABELS[data.type]} agora. Próxima marcação esperada: ${expected}.`
    )
  }

  if (last) {
    const secondsSinceLast = now.diff(DateTime.fromJSDate(last.occurred_at), 'seconds').seconds
    if (secondsSinceLast < MIN_SECONDS_BETWEEN_ENTRIES) {
      throw new BusinessRuleError('Aguarde pelo menos 1 minuto entre duas marcações.')
    }
  }

  // A jornada pertence à data local da ENTRADA, mesmo que passe da meia-noite
  const workDate = data.type === 'CLOCK_IN'
    ? now.toISODate()!
    : openJourney!.work_date.toISOString().slice(0, 10)

  await ensureMonthIsOpen(employeeId, workDate)

  const entry = await repository.create({
    employee_id: employeeId,
    type: data.type,
    occurred_at: now.toUTC().toJSDate(),
    timezone: data.timezone,
    utc_offset_minutes: now.offset,
    work_date: toDbDate(workDate),
    country_code: data.country_code.toUpperCase(),
    work_mode: data.work_mode,
    note: data.note ?? null,
  })

  return withLocalTime(entry)
}

// Usado pelo front-end para saber qual botão mostrar
export async function getStatus(employeeId: number) {
  const last = await repository.findLastActive(employeeId)
  const openJourney = getOpenJourney(last, DateTime.now())

  return {
    last_entry: last ? withLocalTime(last) : null,
    journey_open: openJourney !== null,
    next_allowed: nextAllowedTypes(openJourney),
  }
}

export async function listByPeriod(employeeId: number, from?: string, to?: string) {
  const employee = await ensureActiveEmployee(employeeId)

  // Padrão: mês atual, no fuso base do colaborador
  const today = DateTime.now().setZone(employee.home_timezone)
  const start = from ?? today.startOf('month').toISODate()!
  const end = to ?? today.endOf('month').toISODate()!

  if (!ISO_DATE.test(start) || !ISO_DATE.test(end)) {
    throw new BusinessRuleError('As datas devem estar no formato AAAA-MM-DD.')
  }
  if (start > end) {
    throw new BusinessRuleError('A data inicial deve ser anterior à final.')
  }

  const entries = await repository.findByPeriod(employeeId, toDbDate(start), toDbDate(end))
  return entries.map(withLocalTime)
}