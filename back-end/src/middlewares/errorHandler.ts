import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../errors/AppError'
import { Prisma } from '../../generated/prisma/client'

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Erros lançados de propósito pela aplicação
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ message: error.message })
    return
  }

  // Erros conhecidos do banco de dados
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      res.status(409).json({ message: 'Já existe um registro com esse valor único.' })
      return
    }
    if (error.code === 'P2003') {
      res.status(409).json({ message: 'Operação não permitida: existem registros relacionados.' })
      return
    }
    if (error.code === 'P2025') {
      res.status(404).json({ message: 'Registro não encontrado.' })
      return
    }
  }

  // Qualquer outro erro: não expomos detalhes internos ao cliente
  console.error(error)
  res.status(500).json({ message: 'Erro interno do servidor.' })
}