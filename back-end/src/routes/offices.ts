import { Router } from 'express'
import * as controller from '../controllers/officeController'
import { authenticate, authorize } from '../middlewares/auth'

const router = Router()

// Todas as rotas abaixo exigem login
router.use(authenticate)

// Consultar: qualquer usuário logado
router.get('/', controller.retrieveAll)
router.get('/:id', controller.retrieveOne)

// Alterar: só o RH
router.post('/', authorize('HR'), controller.create)
router.put('/:id', authorize('HR'), controller.update)
router.delete('/:id', authorize('HR'), controller.remove)

export default router