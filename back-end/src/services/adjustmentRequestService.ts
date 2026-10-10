import { DateTime, IANAZone } from 'luxon'
import * as repository from '../repositories/adjustmentRequestRepository'
import * as timeEntryRepository from '../repositories/timeEntryRepository'
import * as employeeRepository from '../repositories/employeeRepository'
import * as officeRepository from '../repositories/officeRepository'
import type { Prisma } from '../../generated/prisma/client.ts'
import { AdjustmentStatus, EntryType } from '../../generated/prisma/enums'
import type { EntryWorkMode } from '../../generated/prisma/enums.ts'
import type { AuthUser } from './authService.ts'
import { isManagerOf } from './accessService'
import { ensureMonthIsOpen, toDbDate } from './timeEntryService'
import type { CreateAdjustmentRequestDto } from '../dtos/adjustmentRequest/createAdjustmentRequestDto.ts'
import type { ReviewAdjustmentRequestDto } from '../dtos/adjustmentRequest/reviewAdjustmentRequest'
import { AppError } from '../errors/AppError'
import { BusinessRuleError } from '../errors/BusinessRuleError'
import { ForbiddenError } from '../errors/ForbiddenError'
import { NotFoundError } from '../errors/NotFoundError'

const MIN_REASON_LENGTH = 10
const MAX_DAYS_BACK = 60

// Acrescenta o horário solicitado no fuso local, para exibição
function withLocalTime<T extends { requested_occurred_at: Date; timezone: string }>(request: T) {
  return {
    ...request,
    requested_local_time: DateTime.fromJSDate(request.requested_occurred_at)
      .setZone(request.timezone)
      .toISO(),
  }
}

/******************** SOLICITAR ********************/

export async function create(requester: AuthUser, data: CreateAdjustmentRequestDto) {
  if (!Object.values(EntryType).includes(data.requested_type)) {
    throw new BusinessRuleError('Tipo de marcação inválido.')
  }
  if (!data.timezone || !IANAZone.isValidZone(data.timezone)) {
    throw new BusinessRuleError('Fuso horário inválido.')
  }
  if (!data.reason || data.reason.trim().length < MIN_REASON_LENGTH) {
    throw new BusinessRuleError(`Explique o motivo do ajuste (mínimo de ${MIN_REASON_LENGTH} caracteres).`)
  }

  // Converte o horário local informado para um instante real
  const requestedAt = DateTime.fromISO(data.requested_local_time ?? '', { zone: data.timezone })
  if (!requestedAt.isValid) {
    throw new BusinessRuleError('Horário inválido. Use o formato AAAA-MM-DDTHH:mm, ex: 2026-10-08T18:00.')
  }

  const now = DateTime.now()
  if (requestedAt > now) {
    throw new BusinessRuleError('Não é possível solicitar ajuste para um horário futuro.')
  }
  if (now.diff(requestedAt, 'days').days > MAX_DAYS_BACK) {
    throw new BusinessRuleError(`Ajustes só podem ser solicitados para os últimos ${MAX_DAYS_BACK} dias.`)
  }

  // Marcação esquecida: o dia é o do horário informado.
  // Correção: o dia é o da marcação original.
  let workDate = requestedAt.toISODate()!

  if (data.time_entry_id) {
    const entry = await timeEntryRepository.findById(data.time_entry_id)

    if (!entry || entry.employee_id !== requester.id) {
      throw new NotFoundError('Marcação não encontrada.')
    }
    if (entry.superseded_at) {
      throw new BusinessRuleError('Esta marcação já foi substituída por outro ajuste.')
    }
    if (await repository.findPendingByTimeEntry(entry.id)) {
      throw new AppError('Já existe um ajuste pendente para esta marcação.', 409)
    }

    workDate = entry.work_date.toISOString().slice(0, 10)
  }

  await ensureMonthIsOpen(requester.id, workDate)

  const request = await repository.create({
    employee_id: requester.id,
    time_entry_id: data.time_entry_id ?? null,
    requested_type: data.requested_type,
    requested_occurred_at: requestedAt.toUTC().toJSDate(),
    timezone: data.timezone,
    reason: data.reason.trim(),
  })

  return withLocalTime(request)
}

/******************** LISTAR ********************/

// Colaborador vê as próprias; gestor vê as próprias e as do time; RH vê todas
export async function list(viewer: AuthUser, status?: string) {
  if (status !== undefined && !Object.values(AdjustmentStatus).includes(status as AdjustmentStatus)) {
    throw new BusinessRuleError('Status inválido. Use PENDING, APPROVED ou REJECTED.')
  }

  let scope: Prisma.AdjustmentRequestWhereInput

  if (viewer.role === 'HR') {
    scope = {}
  } else if (viewer.role === 'MANAGER') {
    scope = {
      OR: [
        { employee_id: viewer.id },
        { employee: { team: { manager_id: viewer.id } } },
      ],
    }
  } else {
    scope = { employee_id: viewer.id }
  }

  const requests = await repository.findMany({
    ...scope,
    ...(status ? { status: status as AdjustmentStatus } : {}),
  })

  return requests.map(withLocalTime)
}

/******************** REVISAR ********************/

export async function review(reviewer: AuthUser, requestId: number, data: ReviewAdjustmentRequestDto) {
  if (data.decision !== 'APPROVED' && data.decision !== 'REJECTED') {
    throw new BusinessRuleError('A decisão deve ser APPROVED ou REJECTED.')
  }

  const request = await repository.findById(requestId)

  if (!request) {
    throw new NotFoundError('Solicitação de ajuste não encontrada.')
  }
  if (request.status !== 'PENDING') {
    throw new AppError('Esta solicitação já foi revisada.', 409)
  }
  if (request.employee_id === reviewer.id) {
    throw new ForbiddenError('Você não pode revisar a sua própria solicitação.')
  }
  if (reviewer.role !== 'HR' && !(await isManagerOf(reviewer.id, request.employee_id))) {
    throw new ForbiddenError('Você só pode revisar solicitações do seu time.')
  }

  const comment = data.comment?.trim() || null

  if (data.decision === 'REJECTED') {
    if (!comment) {
      throw new BusinessRuleError('Informe o motivo da rejeição.')
    }
    return withLocalTime(await repository.reject(request.id, reviewer.id, comment))
  }

  // ----- Aprovação -----
  const original = request.time_entry
  if (original?.superseded_at) {
    throw new BusinessRuleError('A marcação original já foi substituída por outro ajuste.')
  }

  const requestedAt = DateTime.fromJSDate(request.requested_occurred_at).setZone(request.timezone)
  const workDate = original
    ? original.work_date.toISOString().slice(0, 10)
    : requestedAt.toISODate()!

  await ensureMonthIsOpen(request.employee_id, workDate)

  // País e modalidade: herdados da marcação original ou de outra do mesmo dia.
  // Se o dia não tiver nenhuma, usa a unidade e o contrato do colaborador.
  const reference = original
    ?? await timeEntryRepository.findFirstOfDay(request.employee_id, toDbDate(workDate))

  let countryCode: string
  let workMode: EntryWorkMode

  if (reference) {
    countryCode = reference.country_code
    workMode = reference.work_mode
  } else {
    const employee = await employeeRepository.findById(request.employee_id)
    const office = await officeRepository.findById(employee!.office_id)
    countryCode = office!.country_code
    workMode = employee!.work_mode === 'REMOTE' ? 'REMOTE' : 'OFFICE'
  }

  const approved = await repository.approve({
    requestId: request.id,
    reviewerId: reviewer.id,
    comment,
    supersededEntryId: original?.id ?? null,
    newEntry: {
      employee_id: request.employee_id,
      type: request.requested_type,
      occurred_at: request.requested_occurred_at,
      timezone: request.timezone,
      utc_offset_minutes: requestedAt.offset,
      work_date: toDbDate(workDate),
      country_code: countryCode,
      work_mode: workMode,
      source: 'ADJUSTMENT',
      note: `Ajuste #${request.id}: ${request.reason}`,
    },
  })

  return withLocalTime(approved)
}