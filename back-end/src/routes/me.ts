import { Router } from 'express'
import * as timeEntryController from '../controllers/timeEntryController'
import * as workdayController from '../controllers/workDayController'
import * as employeeController from '../controllers/employeeController'
import { authenticate, authorize } from '../middlewares/auth'

// Rotas de uso pessoal: o usuário é sempre o dono do token
const router = Router()

router.use(authenticate)

router.get('/time-entries/status', timeEntryController.status)
router.get('/time-entries', timeEntryController.listMine)
router.post('/time-entries', timeEntryController.register)

router.get('/workdays', workdayController.mine)

router.get('/team', authorize('MANAGER'), employeeController.myTeam)

export default router