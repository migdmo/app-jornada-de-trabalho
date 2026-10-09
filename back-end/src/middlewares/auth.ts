import type { Request, Response, NextFunction } from 'express'
import type { Role } from '../../generated/prisma/enums.ts'
import * as authService from '../services/authService'
import { UnauthorizedError } from '../errors/UnauthorizedError'
import { ForbiddenError } from '../errors/ForbiddenError'

// Exige um token válido no cabeçalho: Authorization: Bearer <token>
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization

  if (!header?.startsWith('Bearer ')) {
    next(new UnauthorizedError())
    return
  }

  try {
    req.user = authService.verifyToken(header.slice('Bearer '.length))
    next()
  } catch (error) {
    next(error)
  }
}

// Exige que o usuário logado tenha um dos papéis informados.
// Uso: authorize('HR') ou authorize('MANAGER', 'HR')
export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError())
      return
    }

    if (!roles.includes(req.user.role)) {
      next(new ForbiddenError())
      return
    }

    next()
  }
}