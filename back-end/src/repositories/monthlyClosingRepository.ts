import { prisma } from '../database/client'

export function findByEmployeeAndMonth(employeeId: number, yearMonth: string) {
  return prisma.monthlyClosing.findUnique({
    where: {
      employee_id_year_month: { employee_id: employeeId, year_month: yearMonth },
    },
  })
}

export function findMany(yearMonth?: string) {
  return prisma.monthlyClosing.findMany({
    where: yearMonth ? { year_month: yearMonth } : {},
    include: {
      employee: { select: { id: true, name: true } },
      closed_by: { select: { id: true, name: true } },
    },
    orderBy: { year_month: 'desc' },
  })
}

// Cria o fechamento ou, se já existir um registro aberto, fecha esse registro
export function close(params: {
  employeeId: number;
  yearMonth: string;
  closedById: number;
  workedMinutes: number;
  expectedMinutes: number;
  balanceMinutes: number;
}) {
  const data = {
    status: 'CLOSED' as const,
    worked_minutes: params.workedMinutes,
    expected_minutes: params.expectedMinutes,
    balance_minutes: params.balanceMinutes,
    closed_by_id: params.closedById,
    closed_at: new Date(),
  }

  return prisma.monthlyClosing.upsert({
    where: {
      employee_id_year_month: { employee_id: params.employeeId, year_month: params.yearMonth },
    },
    create: { employee_id: params.employeeId, year_month: params.yearMonth, ...data },
    update: data,
  })
}