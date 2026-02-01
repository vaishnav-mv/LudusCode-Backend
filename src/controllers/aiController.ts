import { Request, Response } from 'express'
import { singleton, inject } from 'tsyringe'
import { HttpStatus, ResponseMessages } from '../constants'
import { IAiService } from '../interfaces/services'
import { IProblemRepository, IUserRepository, IGroupRepository } from '../interfaces/repositories'
import { HintDTO, CodeReviewDTO, PerformanceDTO } from '../dto/request/ai.request.dto'

@singleton()
export class AiController {
    constructor(
        @inject("IAiService") private _service: IAiService,
        @inject("IProblemRepository") private _problemRepo: IProblemRepository,
        @inject("IUserRepository") private _userRepo: IUserRepository,
        @inject("IGroupRepository") private _groupRepo: IGroupRepository
    ) { }

    /**
     * @desc    Get AI hint for a problem
     * @route   POST /api/ai/hint
     * @req     body: { problemId, userCode }
     * @res     { hint }
     */
    hint = async (req: Request, res: Response) => {
        try {
            const body = req.body as HintDTO
            const { problemId, userCode } = body;
            const p = await this._problemRepo.getById(problemId);
            if (!p) return res.status(HttpStatus.NOT_FOUND).json({ message: ResponseMessages.NOT_FOUND });
            const h = await this._service.hint(p, userCode);
            res.json({ hint: h });
        } catch (e: any) {
            res.status(HttpStatus.NOT_IMPLEMENTED).json({ message: e.message });
        }
    }

    /**
     * @desc    Get AI code review
     * @route   POST /api/ai/code-review
     * @req     body: { problemId, userCode }
     * @res     { review }
     */
    codeReview = async (req: Request, res: Response) => {
        try {
            const body = req.body as CodeReviewDTO
            const { problemId, userCode } = body;
            const p = await this._problemRepo.getById(problemId);
            if (!p) return res.status(HttpStatus.NOT_FOUND).json({ message: ResponseMessages.NOT_FOUND });
            const r = await this._service.codeReview(p, userCode);
            res.json({ review: r });
        } catch (e: any) {
            res.status(HttpStatus.NOT_IMPLEMENTED).json({ message: e.message });
        }
    }

    /**
     * @desc    Get AI performance analysis
     * @route   POST /api/ai/performance
     * @req     body: { userId }
     * @res     { analysis }
     */
    performance = async (req: Request, res: Response) => {
        try {
            const body = req.body as PerformanceDTO
            const { userId } = body;
            const profile = await this._userRepo.getById(userId);
            if (!profile) return res.status(HttpStatus.NOT_FOUND).json({ message: ResponseMessages.NOT_FOUND });
            const joinedGroups = (await this._groupRepo.all()).filter((g: any) => (g.members || []).some((m: any) => (m._id?.toString?.() === userId)));
            const submissionStats = {
                total: (profile as any).duelsWon + (profile as any).duelsLost,
                accepted: (profile as any).duelsWon,
                acceptanceRate: ((profile as any).duelsWon + (profile as any).duelsLost) > 0 ? ((profile as any).duelsWon / ((profile as any).duelsWon + (profile as any).duelsLost)) * 100 : 0
            };
            const analysis = await this._service.performance({ user: profile, submissionStats, joinedGroups });
            res.json({ analysis });
        } catch (e: any) {
            res.status(HttpStatus.NOT_IMPLEMENTED).json({ message: e.message });
        }
    }

    /**
     * @desc    Get AI explanation for a concept
     * @route   POST /api/ai/explain-concept
     * @req     body: { concept }
     * @res     { explanation }
     */
    explainConcept = async (req: Request, res: Response) => {
        try {
            const { concept } = req.body;
            const explanation = await this._service.explainConcept(concept);
            res.json({ explanation });
        } catch (e: any) {
            res.status(HttpStatus.NOT_IMPLEMENTED).json({ message: e.message });
        }
    }

    /**
     * @desc    Summarize a chat discussion
     * @route   POST /api/ai/summarize-discussion
     * @req     body: { messages }
     * @res     { summary }
     */
    summarizeDiscussion = async (req: Request, res: Response) => {
        try {
            const { messages } = req.body;
            const summary = await this._service.summarizeDiscussion(messages);
            res.json({ summary });
        } catch (e: any) {
            res.status(HttpStatus.NOT_IMPLEMENTED).json({ message: e.message });
        }
    }

    /**
     * @desc    Generate a problem using AI
     * @route   POST /api/ai/generate-problem
     * @req     body: { difficulty, topic }
     * @res     { problem }
     */
    generateProblem = async (req: Request, res: Response) => {
        try {
            const { difficulty, topic } = req.body;
            const problem = await this._service.generateProblem(difficulty, topic);
            res.json(problem);
        } catch (e: any) {
            res.status(HttpStatus.NOT_IMPLEMENTED).json({ message: e.message });
        }
    }
}

