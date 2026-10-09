import { AppError } from './AppError'

export class UnauthorizedError extends AppError {
  constructor(message = 'Autenticação necessária.') {
    super(message, 401)
    this.name = 'UnauthorizedError'
  }
}