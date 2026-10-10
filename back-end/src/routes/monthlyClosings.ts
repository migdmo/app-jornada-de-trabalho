import { Router } from 'express'
import * as controller from '../controllers/monthlyClosingController.ts'
import { authenticate, authorize } from '../middlewares/auth.ts'

// Fechamento é exclusivo do RH
const router = Router()

router.use(authenticate, authorize('HR'))

router.get('/', controller.list)
router.post('/', controller.close)

export default router