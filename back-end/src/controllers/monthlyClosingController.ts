import type { Request, Response, NextFunction } from 'express'
import * as service from '../services/monthlyClosingService'
import type { CloseMonthDto } from '../dtos/monthlyClosing/closeMonthDto.ts'

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const month = typeof req.query.month === 'string' ? req.query.month : undefined
    const closings = await service.list(month)
    res.json(closings)
  } catch (error) {
    next(error)
  }
}

export async function close(
  req: Request<Record<string, never>, unknown, CloseMonthDto>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const closing = await service.close(req.user!, req.body)
    res.status(201).json(closing)
  } catch (error) {
    next(error)
  }
}