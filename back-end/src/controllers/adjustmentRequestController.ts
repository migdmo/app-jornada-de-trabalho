import type { Request, Response, NextFunction } from 'express'
import * as service from '../services/adjustmentRequestService'
import type { CreateAdjustmentRequestDto } from '../dtos/adjustmentRequest/createAdjustmentRequestDto.ts'
import type { ReviewAdjustmentRequestDto } from '../dtos/adjustmentRequest/reviewAdjustmentRequest'

type IdParams = { id: string }

export async function create(
  req: Request<Record<string, never>, unknown, CreateAdjustmentRequestDto>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const request = await service.create(req.user!, req.body)
    res.status(201).json(request)
  } catch (error) {
    next(error)
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined
    const requests = await service.list(req.user!, status)
    res.json(requests)
  } catch (error) {
    next(error)
  }
}

export async function review(
  req: Request<IdParams, unknown, ReviewAdjustmentRequestDto>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const request = await service.review(req.user!, Number(req.params.id), req.body)
    res.json(request)
  } catch (error) {
    next(error)
  }
}