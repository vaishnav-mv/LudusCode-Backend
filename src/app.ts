import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import { env } from './config/env'

import rateLimit from 'express-rate-limit'
import csurf from 'csurf'
import { AuthRoutes } from './routes/auth.routes'
import { GroupRoutes } from './routes/group.routes'
import { StudySessionRoutes } from './routes/studySession.routes'
import { DuelRoutes } from './routes/duel.routes'
import { WalletRoutes } from './routes/wallet.routes'
import { AdminRoutes } from './routes/admin.routes'
import { UserRoutes } from './routes/user.routes'
import { ChatRoutes } from './routes/chat.routes'
import { JudgeRoutes } from './routes/judge.routes'
import { ProblemRoutes } from './routes/problem.routes'
import { AiRoutes } from './routes/ai.routes'
import { SubmissionRoutes } from './routes/submission.routes'
import { SubscriptionRoutes } from './routes/subscription.routes'
import { HealthRoutes } from './routes/health.routes'
import { container } from 'tsyringe'
import { AuthMiddleware } from './middleware/auth'
const auth = container.resolve(AuthMiddleware).auth
import { PermissionsMiddleware } from './middleware/permissions'
const requireAdmin = container.resolve(AuthMiddleware).roleGuard('admin')
const requirePremium = container.resolve(PermissionsMiddleware).requirePremium
const app = express()
app.use(express.json())
app.use(cookieParser())
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }))
app.use(helmet())
import Logger from './utils/logger'

const morganFormat = ':method :url :status :response-time ms'

app.use(
    morgan(morganFormat, {
        stream: {
            write: (message) => {
                const logObject = {
                    method: message.split(' ')[0],
                    url: message.split(' ')[1],
                    status: message.split(' ')[2],
                    responseTime: message.split(' ')[3],
                }
                Logger.info(JSON.stringify(logObject))
            },
        },
    })
)
const authLimiter = rateLimit({ windowMs: 60 * 1000, max: 100 })
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 500 })
const csrfProtection = csurf({ cookie: true, ignoreMethods: ['GET', 'HEAD', 'OPTIONS'] })
app.get('/api/csrf-token', csrfProtection, (req, res) => { res.json({ csrfToken: (req as any).csrfToken() }) })
app.use('/api/auth', authLimiter, csrfProtection, new AuthRoutes().router)
app.use('/api/groups', apiLimiter, csrfProtection, auth, new GroupRoutes().router)
app.use('/api/study-sessions', apiLimiter, csrfProtection, auth, new StudySessionRoutes().router)
app.use('/api/duels', apiLimiter, csrfProtection, auth, new DuelRoutes().router)
app.use('/api/wallet', apiLimiter, csrfProtection, auth, new WalletRoutes().router)
app.use('/api/admin', apiLimiter, csrfProtection, auth, requireAdmin, new AdminRoutes().router)
app.use('/api/users', apiLimiter, csrfProtection, new UserRoutes().router)
app.use('/api/chat', apiLimiter, csrfProtection, auth, new ChatRoutes().router)
app.use('/api/judge', apiLimiter, csrfProtection, auth, new JudgeRoutes().router)
app.use('/api/problems', new ProblemRoutes().router)
app.use('/api/ai', apiLimiter, csrfProtection, auth, requirePremium, new AiRoutes().router)
app.use('/api/submissions', apiLimiter, csrfProtection, auth, new SubmissionRoutes().router)
app.use('/api/subscriptions', apiLimiter, csrfProtection, new SubscriptionRoutes().router)
app.use('/api/health', new HealthRoutes().router)
app.use((req, res) => res.status(404).json({ message: 'Not found' }))
import { ErrorMiddleware } from './middleware/errorHandler'
const errorHandler = container.resolve(ErrorMiddleware).handle
app.use(errorHandler)
export default app
