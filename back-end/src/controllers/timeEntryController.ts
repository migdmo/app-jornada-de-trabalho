import type { Request, Response, NextFunction } from 'express'
import * as service from '../services/timeEntryService'
import type { CreateTimeEntryDto } from '../dtos/timeEntry/createTimeEntryDto.ts'

type CreateTimeEntryRequest = Request<Record<string, never>, unknown, CreateTimeEntryDto>

export async function register(req: CreateTimeEntryRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    // O colaborador vem do TOKEN, nunca do corpo da requisição
    const entry = await service.register(req.user!.id, req.body)
    res.status(201).json(entry)
  } catch (error) {
    next(error)
  }
}

export async function status(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.getStatus(req.user!.id)
    res.json(result)
  } catch (error) {
    next(error)
  }
}

export async function listMine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const from = typeof req.query.from === 'string' ? req.query.from : undefined
    const to = typeof req.query.to === 'string' ? req.query.to : undefined

    const entries = await service.listByPeriod(req.user!.id, from, to)
    res.json(entries)
  } catch (error) {
    next(error)
  }
}