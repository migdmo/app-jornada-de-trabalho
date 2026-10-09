import type { Request, Response, NextFunction } from 'express'
import * as authService from '../services/authService'
import * as employeeService from '../services/employeeService'

type LoginBody = { email: string; password: string }

export async function login(
  req: Request<Record<string, never>, unknown, LoginBody>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await authService.login(req.body?.email, req.body?.password)
    res.json(result)
  } catch (error) {
    next(error)
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const employee = await employeeService.findById(req.user!.id)
    res.json(employee)
  } catch (error) {
    next(error)
  }
}