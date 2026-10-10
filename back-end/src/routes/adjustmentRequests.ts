import { Router } from 'express'
import * as controller from '../controllers/adjustmentRequestController'
import { authenticate, authorize } from '../middlewares/auth'

const router = Router()

router.use(authenticate)

router.get('/', controller.list)
router.post('/', controller.create)
router.patch('/:id/review', authorize('MANAGER', 'HR'), controller.review)

export default router