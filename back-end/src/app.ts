import express, { json, urlencoded } from 'express'
import cookieParser from 'cookie-parser'
import logger from 'morgan'
import cors from 'cors'

import indexRouter from './routes/index'
import usersRouter from './routes/users'
import officesRouter from './routes/offices'
import { errorHandler } from './middlewares/errorHandler'

const app = express()

app.use(cors())
app.use(logger('dev'))
app.use(json())
app.use(urlencoded({ extended: false }))
app.use(cookieParser())

/***************** ROTAS *************************/

app.use('/', indexRouter)
app.use('/users', usersRouter)
app.use('/offices', officesRouter)

/***************** TRATAMENTO DE ERROS ***********/
// Precisa ser o ÚLTIMO app.use: só recebe erros que passaram pelas rotas
app.use(errorHandler)

export default app