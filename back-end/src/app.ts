import express, { json, urlencoded } from 'express'
import cookieParser from 'cookie-parser'
import logger from 'morgan'
import cors from 'cors'

import indexRouter from './routes/index'

import officesRouter from './routes/offices'
import teamsRouter from './routes/teams'
import employeesRouter from './routes/employees'
import { errorHandler } from './middlewares/errorHandler'
import authRouter from './routes/auth'
import meRouter from './routes/me'
import adjustmentRequestsRouter from './routes/adjustmentRequests'
import monthlyClosingsRouter from './routes/monthlyClosings'

const app = express()

app.use(cors())
app.use(logger('dev'))
app.use(json())
app.use(urlencoded({ extended: false }))
app.use(cookieParser())

/***************** ROTAS *************************/

app.use('/', indexRouter)
app.use('/offices', officesRouter)
app.use('/teams', teamsRouter)
app.use('/employees', employeesRouter)
app.use('/auth', authRouter)
app.use('/me', meRouter)
app.use('/adjustment-requests', adjustmentRequestsRouter)
app.use('/monthly-closings', monthlyClosingsRouter)

/***************** TRATAMENTO DE ERROS ***********/
// Precisa ser o ÚLTIMO app.use: só recebe erros que passaram pelas rotas
app.use(errorHandler)

export default app