import * as employeeRepository from '../repositories/employeeRepository'
import * as teamRepository from '../repositories/teamRepository'
import type { AuthUser } from './authService.ts'
import { ForbiddenError } from '../errors/ForbiddenError'

// Regras de visibilidade:
// - o próprio colaborador vê os seus dados
// - o RH vê os de todos
// - o gestor vê os dos membros dos times que ele gerencia
export async function ensureCanViewEmployee(viewer: AuthUser, employeeId: number): Promise<void> {
  if (viewer.role === 'HR' || viewer.id === employeeId) return

  if (viewer.role === 'MANAGER') {
    const employee = await employeeRepository.findById(employeeId)

    if (employee?.team_id) {
      const team = await teamRepository.findById(employee.team_id)
      if (team?.manager_id === viewer.id) return
    }
  }

  throw new ForbiddenError('Você só pode consultar dados dos membros do seu time.')
}