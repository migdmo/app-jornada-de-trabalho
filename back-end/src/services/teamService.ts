import * as repository from '../repositories/teamRepository'
import * as employeeRepository from '../repositories/employeeRepository'
import type { Team } from '../../generated/prisma/client.ts'
import type { CreateTeamDto } from '../dtos/team/createTeamDto.ts'
import type { UpdateTeamDto } from '../dtos/team/updateTeamDto.ts'
import { NotFoundError } from '../errors/NotFoundError'
import { BusinessRuleError } from '../errors/BusinessRuleError'

// Regra: o responsável pelo time precisa existir, estar ativo
// e ter papel de gestor ou RH
async function validateManager(managerId: number | null | undefined): Promise<void> {
  if (managerId === undefined || managerId === null) return

  const manager = await employeeRepository.findById(managerId)

  if (!manager || !manager.active) {
    throw new BusinessRuleError('O gestor informado não existe ou está inativo.')
  }

  if (manager.role !== 'MANAGER' && manager.role !== 'HR') {
    throw new BusinessRuleError('O responsável pelo time precisa ter o papel MANAGER ou HR.')
  }
}

export async function findAll(): Promise<Team[]> {
  return repository.findAll()
}

export async function findById(id: number): Promise<Team> {
  const team = await repository.findById(id)

  if (!team) {
    throw new NotFoundError('Time não encontrado.')
  }

  return team
}

export async function create(data: CreateTeamDto): Promise<Team> {
  await validateManager(data.manager_id)
  return repository.create(data)
}

export async function update(id: number, data: UpdateTeamDto): Promise<Team> {
  await findById(id)
  await validateManager(data.manager_id)
  return repository.update(id, data)
}

export async function remove(id: number): Promise<Team> {
  await findById(id)
  return repository.remove(id)
}