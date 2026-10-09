import type { Request, Response, NextFunction } from 'express'
import * as service from '../services/officeService'
import type { CreateOfficeDto } from '../dtos/office/createOfficeDto'
import type { UpdateOfficeDto } from '../dtos/office/updateOfficeDto'

type OfficeIdParams = { id: string }

type CreateOfficeRequest = Request<Record<string, never>, unknown, CreateOfficeDto>
type UpdateOfficeRequest = Request<OfficeIdParams, unknown, UpdateOfficeDto>

export async function retrieveAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const offices = await service.findAll()
    res.json(offices)
  } catch (error) {
    next(error)
  }
}

export async function retrieveOne(req: Request<OfficeIdParams>, res: Response, next: NextFunction): Promise<void> {
  try {
    const office = await service.findById(Number(req.params.id))
    res.json(office)
  } catch (error) {
    next(error)
  }
}

export async function create(req: CreateOfficeRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const office = await service.create(req.body)
    res.status(201).json(office)
  } catch (error) {
    next(error)
  }
}

export async function update(req: UpdateOfficeRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const office = await service.update(Number(req.params.id), req.body)
    res.json(office)
  } catch (error) {
    next(error)
  }
}

export async function remove(req: Request<OfficeIdParams>, res: Response, next: NextFunction): Promise<void> {
  try {
    await service.remove(Number(req.params.id))
    res.status(204).end()
  } catch (error) {
    next(error)
  }
}