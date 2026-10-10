import type { Request, Response, NextFunction } from 'express'
import * as service from '../services/workDayService'

function getMonthQuery(req: Request): string | undefined {
  return typeof req.query.month === 'string' ? req.query.month : undefined
}

// GET /me/workdays?month=2026-10
export async function mine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.getMonth(req.user!.id, getMonthQuery(req))
    res.json(result)
  } catch (error) {
    next(error)
  }
}

// GET /employees/:id/workdays?month=2026-10
export async function ofEmployee(req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.getMonthForViewer(
      req.user!,
      Number(req.params.id),
      getMonthQuery(req)
    )
    res.json(result)
  } catch (error) {
    next(error)
  }
}