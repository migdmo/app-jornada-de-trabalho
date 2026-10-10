import { prisma } from '../database/client'

export function findByEmployeeAndMonth(employeeId: number, yearMonth: string) {
  return prisma.monthlyClosing.findUnique({
    where: {
      employee_id_year_month: { employee_id: employeeId, year_month: yearMonth },
    },
  })
}