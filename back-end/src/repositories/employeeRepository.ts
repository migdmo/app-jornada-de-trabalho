import { prisma } from '../database/client'
import type { Prisma } from '../../generated/prisma/client.ts'

export function findAll() {
  return prisma.employee.findMany({
    orderBy: { name: 'asc' },
  })
}

export function findById(id: number) {
  return prisma.employee.findUnique({
    where: { id },
  })
}

export function findByEmail(email: string) {
  return prisma.employee.findUnique({
    where: { email },
  })
}

// ÚNICA função que devolve o hash da senha. Usada apenas no login.
export function findByEmailWithPassword(email: string) {
  return prisma.employee.findUnique({
    where: { email },
    omit: { password_hash: false },
  })
}

export function create(data: Prisma.EmployeeUncheckedCreateInput) {
  return prisma.employee.create({ data })
}

export function update(id: number, data: Prisma.EmployeeUncheckedUpdateInput) {
  return prisma.employee.update({
    where: { id },
    data,
  })
}

export function deactivate(id: number) {
  return prisma.employee.update({
    where: { id },
    data: { active: false },
  })
}
// Colaboradores ativos dos times gerenciados por um gestor
export function findByManager(managerId: number) {
  return prisma.employee.findMany({
    where: { active: true, team: { manager_id: managerId } },
    orderBy: { name: 'asc' },
  })
}