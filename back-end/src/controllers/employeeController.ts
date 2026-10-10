import type { Request, Response, NextFunction } from 'express'
import * as service from '../services/employeeService'
import type { CreateEmployeeDto } from '../dtos/employee/createEmployeeDto.ts'
import type { UpdateEmployeeDto } from '../dtos/employee/updateEmployeeDto.ts'

type EmployeeIdParams = { id: string }

type CreateEmployeeRequest = Request<Record<string, never>, unknown, CreateEmployeeDto>
type UpdateEmployeeRequest = Request<EmployeeIdParams, unknown, UpdateEmployeeDto>

export async function retrieveAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const employees = await service.findAll()
    res.json(employees)
  } catch (error) {
    next(error)
  }
}

export async function retrieveOne(req: Request<EmployeeIdParams>, res: Response, next: NextFunction): Promise<void> {
  try {
    const employee = await service.findById(Number(req.params.id))
    res.json(employee)
  } catch (error) {
    next(error)
  }
}

export async function create(req: CreateEmployeeRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const employee = await service.create(req.body)
    res.status(201).json(employee)
  } catch (error) {
    next(error)
  }
}

export async function update(req: UpdateEmployeeRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const employee = await service.update(Number(req.params.id), req.body)
    res.json(employee)
  } catch (error) {
    next(error)
  }
}

// DELETE não apaga: desativa o colaborador para preservar o histórico de marcações
export async function remove(req: Request<EmployeeIdParams>, res: Response, next: NextFunction): Promise<void> {
  try {
    await service.deactivate(Number(req.params.id))
    res.status(204).end()
  } catch (error) {
    next(error)
  }
}

export async function myTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const members = await service.findTeamMembers(req.user!.id)
    res.json(members)
  } catch (error) {
    next(error)
  }
}