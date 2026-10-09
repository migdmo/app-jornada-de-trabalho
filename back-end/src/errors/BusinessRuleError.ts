import { AppError } from './AppError'

export class BusinessRuleError extends AppError {
  constructor(message: string) {
    super(message, 422)
    this.name = 'BusinessRuleError'
  }
}