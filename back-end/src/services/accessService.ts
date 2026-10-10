import * as employeeRepository from '../repositories/employeeRepository'
import * as teamRepository from '../repositories/teamRepository'
import type { AuthUser } from './authService.ts'
import { ForbiddenError } from '../errors/ForbiddenError'

// O gestor informado gerencia o time do colaborador?
export async function isManagerOf(managerId: number, employeeId: number): Promise<boolean> {
  const employee = await employeeRepository.findById(employeeId)
  if (!employee?.team_id) return false

  const team = await teamRepository.findById(employee.team_id)
  return team?.manager_id === managerId
}

// Regras de visibilidade:
// - o próprio colaborador vê os seus dados
// - o RH vê os de todos
// - o gestor vê os dos membros dos times que ele gerencia
export async function ensureCanViewEmployee(viewer: AuthUser, employeeId: number): Promise<void> {
  if (viewer.role === 'HR' || viewer.id === employeeId) return
  if (viewer.role === 'MANAGER' && await isManagerOf(viewer.id, employeeId)) return

  throw new ForbiddenError('Você só pode consultar dados dos membros do seu time.')
}