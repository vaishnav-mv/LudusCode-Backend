import { Request, Response } from 'express'
import { singleton, inject } from 'tsyringe'
import { HttpStatus, ResponseMessages } from '../constants'
import { IProblemService } from '../interfaces/services'
import { GenerateProblemDTO } from '../dto/request/problem.request.dto'

@singleton()
export class ProblemController {
    constructor(@inject("IProblemService") private _service: IProblemService) { }

    /**
     * @desc    Get approved problems
     * @route   GET /api/problems/approved
     * @req     -
     * @res     [Problem]
     */
    approvedProblems = async (req: Request, res: Response) => {
        const { q, sort, difficulty, tags, page, limit } = req.query;
        const problems = await this._service.list({
            q: q as string,
            sort: sort as string,
            difficulty: difficulty as string,
            tags: tags as string,
            status: 'Approved',
            page: page ? parseInt(page as string) : undefined,
            limit: limit ? parseInt(limit as string) : undefined
        });
        console.log(`[ProblemController] Approved problems count: ${problems.length}`);
        res.json(problems);
    }

    /**
     * @desc    Get daily problem
     * @route   GET /api/problems/daily
     * @req     -
     * @res     { problem }
     */
    dailyProblem = async (req: Request, res: Response) => {
        const problem = await this._service.daily();
        if (!problem) return res.status(HttpStatus.NOT_FOUND).json({ message: ResponseMessages.NOT_FOUND });
        res.json(problem);
    }

    /**
     * @desc    Generate a new problem using AI
     * @route   POST /api/problems/generate
     * @req     body: { difficulty, topic }
     * @res     { problem }
     */
    generateProblem = async (req: Request, res: Response) => {
        try {
            const body = req.body as GenerateProblemDTO
            const { difficulty, topic } = body;
            const problem = await this._service.generate(difficulty, topic);
            res.json(problem);
        } catch (error: any) {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: error.message || 'Failed to generate problem' });
        }
    }

    /**
     * @desc    Create a new problem
     * @route   POST /api/problems
     * @req     body: { title, description, difficulty, tags, testCases, solution }
     * @res     { problem }
     */
    createProblem = async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            let status = 'Custom';
            if (user && user.isAdmin && req.body.status === 'Approved') {
                status = 'Approved';
            }
            const problemData = { ...req.body, status };
            const problem = await this._service.create(problemData);
            res.status(HttpStatus.CREATED).json(problem);
        } catch (error: any) {
            res.status(HttpStatus.BAD_REQUEST).json({ message: error.message || 'Failed to create problem' });
        }
    }
}

