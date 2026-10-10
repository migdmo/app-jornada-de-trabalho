
import { api } from './client'
import type { Employee } from './types'

// Todos os colaboradores (RH)
export function listAll() {
  return api<Employee[]>('/employees')
}

// Membros dos times do gestor logado
export function listMyTeam() {
  return api<Employee[]>('/me/team')
}