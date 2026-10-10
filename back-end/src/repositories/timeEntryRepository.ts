import { prisma } from '../database/client'
import type { Prisma } from '../../generated/prisma/client.ts'

// Marcações são imutáveis: este repository não tem update nem delete.

// Última marcação válida (ignora as substituídas por ajustes)
export function findLastActive(employeeId: number) {
  return prisma.timeEntry.findFirst({
    where: { employee_id: employeeId, superseded_at: null },
    orderBy: { occurred_at: 'desc' },
  })
}

export function findByPeriod(employeeId: number, from: Date, to: Date) {
  return prisma.timeEntry.findMany({
    where: {
      employee_id: employeeId,
      superseded_at: null,
      work_date: { gte: from, lte: to },
    },
    orderBy: { occurred_at: 'asc' },
  })
}

export function create(data: Prisma.TimeEntryUncheckedCreateInput) {
  return prisma.timeEntry.create({ data })
}