import { prisma } from '../database/client'
import type { CreateTeamDto } from '../dtos/team/createTeamDto.ts'
import type { UpdateTeamDto } from '../dtos/team/updateTeamDto.ts'

export function findAll() {
  return prisma.team.findMany({
    orderBy: { name: 'asc' },
  })
}

export function findById(id: number) {
  return prisma.team.findUnique({
    where: { id },
  })
}

export function create(data: CreateTeamDto) {
  return prisma.team.create({ data })
}

export function update(id: number, data: UpdateTeamDto) {
  return prisma.team.update({
    where: { id },
    data,
  })
}

export function remove(id: number) {
  return prisma.team.delete({
    where: { id },
  })
}