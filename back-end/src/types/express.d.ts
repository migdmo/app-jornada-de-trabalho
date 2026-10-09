import type { Role } from '../../generated/prisma/enums'

// Acrescenta o campo "user" ao Request do Express.
// Ele é preenchido pelo middleware authenticate.
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role: Role;
      };
    }
  }
}

export {}