import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import * as employeeRepository from '../repositories/employeeRepository'
import type { Role } from '../../generated/prisma/enums.ts'
import { UnauthorizedError } from '../errors/UnauthorizedError'
import { AppError } from '../errors/AppError'

const TOKEN_EXPIRES_IN = '8h' // cobre uma jornada de trabalho

export type AuthUser = { id: number; role: Role }

function getSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET não definida no .env')
  }
  return secret
}

export async function login(email: string, password: string) {
  if (!email || !password) {
    throw new AppError('Informe e-mail e senha.', 400)
  }

  const employee = await employeeRepository.findByEmailWithPassword(
    email.trim().toLowerCase()
  )

  // Mesma mensagem para "e-mail não existe" e "senha errada":
  // assim ninguém descobre quais e-mails estão cadastrados
  const invalid = new UnauthorizedError('E-mail ou senha inválidos.')

  if (!employee || !employee.active) throw invalid

  const passwordMatches = await bcrypt.compare(password, employee.password_hash)
  if (!passwordMatches) throw invalid

  const token = jwt.sign(
    { role: employee.role },
    getSecret(),
    { subject: String(employee.id), expiresIn: TOKEN_EXPIRES_IN }
  )

  // Remove o hash antes de devolver os dados do usuário
  const { password_hash, ...user } = employee

  return { token, user }
}

export function verifyToken(token: string): AuthUser {
  try {
    const payload = jwt.verify(token, getSecret()) as jwt.JwtPayload
    return { id: Number(payload.sub), role: payload.role as Role }
  } catch {
    throw new UnauthorizedError('Sessão inválida ou expirada. Faça login novamente.')
  }
}