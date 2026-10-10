import { DateTime } from 'luxon'
import * as repository from '../repositories/monthlyClosingRepository'
import * as adjustmentRepository from '../repositories/adjustmentRequestRepository'
import * as workdayService from './workDayService'
import type { AuthUser } from './authService.ts'
import type { CloseMonthDto } from '../dtos/monthlyClosing/closeMonthDto.ts'
import { AppError } from '../errors/AppError'
import { BusinessRuleError } from '../errors/BusinessRuleError'

const YEAR_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/

export async function list(yearMonth?: string) {
  if (yearMonth !== undefined && !YEAR_MONTH.test(yearMonth)) {
    throw new BusinessRuleError('O mês deve estar no formato AAAA-MM.')
  }
  return repository.findMany(yearMonth)
}

export async function close(hr: AuthUser, data: CloseMonthDto) {
  if (!data.employee_id || !YEAR_MONTH.test(data.year_month ?? '')) {
    throw new BusinessRuleError('Informe o colaborador e o mês no formato AAAA-MM.')
  }

  // Reaproveita o cálculo da jornada: o fechamento grava exatamente o que o colaborador vê
  const summary = await workdayService.getMonth(data.employee_id, data.year_month)

  if (summary.closing_status === 'CLOSED') {
    throw new AppError('Este mês já está fechado.', 409)
  }

  const currentMonth = DateTime.now().setZone(summary.employee.home_timezone).toFormat('yyyy-MM')
  if (data.year_month >= currentMonth) {
    throw new BusinessRuleError('Só é possível fechar meses que já terminaram.')
  }

  if (summary.totals.inconsistent_days > 0) {
    throw new BusinessRuleError(
      `Existem ${summary.totals.inconsistent_days} dia(s) com jornada inconsistente. ` +
      'Eles precisam ser corrigidos por ajuste antes do fechamento.'
    )
  }

  // Ajustes pendentes que afetam o mês também impedem o fechamento
  const pending = await adjustmentRepository.findPendingByEmployee(data.employee_id)
  const pendingInMonth = pending.filter((request) => {
    const month = request.time_entry
      ? request.time_entry.work_date.toISOString().slice(0, 7)
      : DateTime.fromJSDate(request.requested_occurred_at).setZone(request.timezone).toFormat('yyyy-MM')
    return month === data.year_month
  })

  if (pendingInMonth.length > 0) {
    throw new BusinessRuleError(
      `Existem ${pendingInMonth.length} solicitação(ões) de ajuste pendente(s) neste mês.`
    )
  }

  return repository.close({
    employeeId: data.employee_id,
    yearMonth: data.year_month,
    closedById: hr.id,
    workedMinutes: summary.totals.worked_minutes,
    expectedMinutes: summary.totals.expected_minutes,
    balanceMinutes: summary.totals.balance_minutes,
  })
}