import { api } from './client'
import type { Employee, LoginResponse } from './types'

export function login(email: string, password: string) {
  return api<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
  })
}

export function me() {
  return api<Employee>('/auth/me')
}