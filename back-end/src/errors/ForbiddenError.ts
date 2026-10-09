import { AppError } from './AppError'

export class ForbiddenError extends AppError {
  constructor(message = 'Você não tem permissão para esta ação.') {
    super(message, 403)
    this.name = 'ForbiddenError'
  }
}