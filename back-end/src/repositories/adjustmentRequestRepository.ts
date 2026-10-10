import { prisma } from '../database/client'
import type { Prisma } from '../../generated/prisma/client.ts'

// Dados relacionados que acompanham cada solicitação nas respostas
const include = {
  employee: { select: { id: true, name: true } },
  reviewed_by: { select: { id: true, name: true } },
  time_entry: true,
} satisfies Prisma.AdjustmentRequestInclude

export function findMany(where: Prisma.AdjustmentRequestWhereInput) {
  return prisma.adjustmentRequest.findMany({
    where,
    include,
    orderBy: { created_at: 'desc' },
  })
}

export function findById(id: number) {
  return prisma.adjustmentRequest.findUnique({
    where: { id },
    include,
  })
}

export function findPendingByTimeEntry(timeEntryId: number) {
  return prisma.adjustmentRequest.findFirst({
    where: { time_entry_id: timeEntryId, status: 'PENDING' },
  })
}

export function findPendingByEmployee(employeeId: number) {
  return prisma.adjustmentRequest.findMany({
    where: { employee_id: employeeId, status: 'PENDING' },
    include: { time_entry: true },
  })
}

export function create(data: Prisma.AdjustmentRequestUncheckedCreateInput) {
  return prisma.adjustmentRequest.create({ data, include })
}

export function reject(id: number, reviewerId: number, comment: string) {
  return prisma.adjustmentRequest.update({
    where: { id },
    data: {
      status: 'REJECTED',
      reviewed_by_id: reviewerId,
      reviewed_at: new Date(),
      review_comment: comment,
    },
    include,
  })
}

// Aprovação em TRANSAÇÃO: as três operações são gravadas juntas,
// ou nenhuma é gravada se qualquer uma falhar
export function approve(params: {
  requestId: number;
  reviewerId: number;
  comment: string | null;
  newEntry: Prisma.TimeEntryUncheckedCreateInput;
  supersededEntryId: number | null;
}) {
  return prisma.$transaction(async (tx) => {
    await tx.timeEntry.create({ data: params.newEntry })

    if (params.supersededEntryId !== null) {
      await tx.timeEntry.update({
        where: { id: params.supersededEntryId },
        data: { superseded_at: new Date() },
      })
    }

    return tx.adjustmentRequest.update({
      where: { id: params.requestId },
      data: {
        status: 'APPROVED',
        reviewed_by_id: params.reviewerId,
        reviewed_at: new Date(),
        review_comment: params.comment,
      },
      include,
    })
  })
}