import { prisma } from '../database/client'
import type { CreateOfficeDto } from '../dtos/office/createOfficeDto'
import type { UpdateOfficeDto } from '../dtos/office/updateOfficeDto'

export function findAll() {
  return prisma.office.findMany({
    orderBy: { name: 'asc' },
  })
}

export function findById(id: number) {
  return prisma.office.findUnique({
    where: { id },
  })
}

export function create(data: CreateOfficeDto) {
  return prisma.office.create({ data })
}

export function update(id: number, data: UpdateOfficeDto) {
  return prisma.office.update({
    where: { id },
    data,
  })
}

export function remove(id: number) {
  return prisma.office.delete({
    where: { id },
  })
}