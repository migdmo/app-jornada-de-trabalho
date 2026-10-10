import bcrypt from 'bcryptjs'
import { IANAZone } from 'luxon'
import * as repository from '../repositories/employeeRepository'
import * as officeRepository from '../repositories/officeRepository'
import * as teamRepository from '../repositories/teamRepository'
import type { Employee } from '../../generated/prisma/client.ts'
import type { CreateEmployeeDto } from '../dtos/employee/createEmployeeDto'
import type { UpdateEmployeeDto } from '../dtos/employee/updateEmployeeDto'
import { AppError } from '../errors/AppError'
import { BusinessRuleError } from '../errors/BusinessRuleError'
import { NotFoundError } from '../errors/NotFoundError'

// Colaborador sem o hash da senha: é o que a API devolve
export type SafeEmployee = Omit<Employee, 'password_hash'>

const PASSWORD_MIN_LENGTH = 8
const SALT_ROUNDS = 10
const MAX_DAILY_MINUTES = 12 * 60 // jornada esperada de no máximo 12h

/******************** REGRAS ********************/

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

async function ensureEmailIsAvailable(email: string, ignoreId?: number): Promise<void> {
  const existing = await repository.findByEmail(email)
  if (existing && existing.id !== ignoreId) {
    throw new AppError('Já existe um colaborador com este e-mail.', 409)
  }
}

async function ensureOfficeExists(officeId: number) {
  const office = await officeRepository.findById(officeId)
  if (!office) {
    throw new BusinessRuleError('A unidade informada não existe.')
  }
  return office
}

async function ensureTeamExists(teamId: number | null | undefined): Promise<void> {
  if (teamId === undefined || teamId === null) return
  const team = await teamRepository.findById(teamId)
  if (!team) {
    throw new BusinessRuleError('O time informado não existe.')
  }
}

function validatePassword(password: string): void {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new BusinessRuleError(`A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`)
  }
}

function validateTimezone(timezone: string): void {
  if (!IANAZone.isValidZone(timezone)) {
    throw new BusinessRuleError(`Fuso horário inválido: "${timezone}". Use o formato IANA, ex: Europe/Lisbon.`)
  }
}

function validateDailyMinutes(minutes: number): void {
  if (!Number.isInteger(minutes) || minutes <= 0 || minutes > MAX_DAILY_MINUTES) {
    throw new BusinessRuleError(`A jornada esperada deve estar entre 1 e ${MAX_DAILY_MINUTES} minutos.`)
  }
}

/******************** OPERAÇÕES ********************/

export async function findAll(): Promise<SafeEmployee[]> {
  return repository.findAll()
}

export async function findById(id: number): Promise<SafeEmployee> {
  const employee = await repository.findById(id)

  if (!employee) {
    throw new NotFoundError('Colaborador não encontrado.')
  }

  return employee
}

export async function create(data: CreateEmployeeDto): Promise<SafeEmployee> {
  if (!data.name?.trim() || !data.email?.trim() || !data.password || !data.office_id) {
    throw new BusinessRuleError('Nome, e-mail, senha e unidade são obrigatórios.')
  }

  const email = normalizeEmail(data.email)
  await ensureEmailIsAvailable(email)
  validatePassword(data.password)

  const office = await ensureOfficeExists(data.office_id)
  await ensureTeamExists(data.team_id)

  // Se o fuso base não for informado, assume o fuso da unidade
  const homeTimezone = data.home_timezone ?? office.timezone
  validateTimezone(homeTimezone)

  if (data.daily_expected_minutes !== undefined) {
    validateDailyMinutes(data.daily_expected_minutes)
  }

  const { password, ...rest } = data

  return repository.create({
    ...rest,
    name: data.name.trim(),
    email,
    home_timezone: homeTimezone,
    password_hash: await bcrypt.hash(password, SALT_ROUNDS),
  })
}

export async function update(id: number, data: UpdateEmployeeDto): Promise<SafeEmployee> {
  await findById(id)

  const email = data.email !== undefined ? normalizeEmail(data.email) : undefined
  if (email !== undefined) await ensureEmailIsAvailable(email, id)

  if (data.office_id !== undefined) await ensureOfficeExists(data.office_id)
  await ensureTeamExists(data.team_id)

  if (data.home_timezone !== undefined) validateTimezone(data.home_timezone)
  if (data.daily_expected_minutes !== undefined) validateDailyMinutes(data.daily_expected_minutes)
  if (data.password !== undefined) validatePassword(data.password)

  const { password, ...rest } = data

  return repository.update(id, {
    ...rest,
    email,
    // Campos com valor undefined são ignorados pelo Prisma (não alteram nada)
    password_hash: password !== undefined
      ? await bcrypt.hash(password, SALT_ROUNDS)
      : undefined,
  })
}

export async function deactivate(id: number): Promise<SafeEmployee> {
  await findById(id)
  return repository.deactivate(id)
}

export async function findTeamMembers(managerId: number): Promise<SafeEmployee[]> {
  return repository.findByManager(managerId)
}