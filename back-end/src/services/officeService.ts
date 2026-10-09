import { IANAZone } from 'luxon'
import * as repository from '../repositories/officeRepository'
import type { Office } from '../../generated/prisma/client.ts'
import type { CreateOfficeDto } from '../dtos/office/createOfficeDto'
import type { UpdateOfficeDto } from '../dtos/office/updateOfficeDto'
import { NotFoundError } from '../errors/NotFoundError'
import { BusinessRuleError } from '../errors/BusinessRuleError'

// Regras de negócio da unidade:
// - o fuso precisa ser um fuso IANA válido (ex: America/Sao_Paulo)
// - o país precisa ter 2 letras (padrão ISO), sempre em maiúsculas
function validate<T extends { country_code?: string; timezone?: string }>(data: T): T {
  if (data.timezone !== undefined && !IANAZone.isValidZone(data.timezone)) {
    throw new BusinessRuleError(
      `Fuso horário inválido: "${data.timezone}". Use o formato IANA, ex: America/Sao_Paulo.`
    )
  }

  if (data.country_code !== undefined) {
    const countryCode = data.country_code.toUpperCase()
    if (!/^[A-Z]{2}$/.test(countryCode)) {
      throw new BusinessRuleError('O código do país deve ter 2 letras, ex: BR, PT, ES.')
    }
    return { ...data, country_code: countryCode }
  }

  return data
}

export async function findAll(): Promise<Office[]> {
  return repository.findAll()
}

export async function findById(id: number): Promise<Office> {
  const office = await repository.findById(id)

  if (!office) {
    throw new NotFoundError('Unidade não encontrada.')
  }

  return office
}

export async function create(data: CreateOfficeDto): Promise<Office> {
  return repository.create(validate(data))
}

export async function update(id: number, data: UpdateOfficeDto): Promise<Office> {
  await findById(id)
  return repository.update(id, validate(data))
}

export async function remove(id: number): Promise<Office> {
  await findById(id)
  return repository.remove(id)
}