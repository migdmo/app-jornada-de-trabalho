import { Router } from 'express'
import * as controller from '../controllers/employeeController'
import { authenticate, authorize } from '../middlewares/auth'

const router = Router()

router.use(authenticate)

router.get('/', authorize('MANAGER', 'HR'), controller.retrieveAll)
router.get('/:id', authorize('MANAGER', 'HR'), controller.retrieveOne)
router.post('/', authorize('HR'), controller.create)
router.put('/:id', authorize('HR'), controller.update)
router.delete('/:id', authorize('HR'), controller.remove)

export default router