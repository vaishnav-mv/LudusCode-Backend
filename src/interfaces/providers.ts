import { JwtPayload, Problem, User, Group } from '../types'
import { ExecutionResult } from './repositories' // We might need to move this too

export interface IJwtProvider {
    signAccess(payload: object): string
    signRefresh(payload: object): string
    verify(token: string): JwtPayload | string
}

export interface IPasswordProvider {
    hash(password: string): string
    compare(password: string, hash: string): boolean
}

export interface IEmailProvider {
    sendOtp(email: string, code: string): Promise<boolean>
}

export interface ICloudinaryProvider {
    uploadImage(filePath: string, folder?: string): Promise<string>
}

export interface ICodeExecutionProvider {
    execute(language: string, code: string, timeoutMs?: number): Promise<ExecutionResult>
}

export interface IAiProvider {
    hint(problem: Problem, userCode: string): Promise<string>
    codeReview(problem: Problem, userCode: string): Promise<string>
    performance(data: { user: User, submissionStats: { total: number, accepted: number, acceptanceRate: number }, joinedGroups: Group[] }): Promise<string>

    explainConcept(concept: string): Promise<string>
    summarizeDiscussion(messages: string[]): Promise<string>
    generateProblem(difficulty: string, topic: string): Promise<Problem>
}

export interface IOtpProvider {
    create(email: string, purpose: string): Promise<string>
    verify(email: string, code: string, purpose: string): Promise<boolean>
}

export interface IPaymentProvider {
    createOrder(amount: number, currency: string, receipt: string): Promise<import('../types').RazorpayOrder>
    verifySignature(orderId: string, paymentId: string, signature: string): boolean
    fetchPayment(paymentId: string): Promise<any>
}

export interface IOAuthProvider {
    getGoogleAuthUrl(): string
    getGoogleUser(code: string): Promise<{ email: string, name: string, picture: string, original: any }>
    getGithubAuthUrl(): string
    getGithubUser(code: string): Promise<{ email: string, name: string, picture: string, original: any }>
}
