import { singleton, inject } from 'tsyringe'
import { IAiService } from '../interfaces/services'
import { IProblemRepository, IUserRepository, IGroupRepository } from '../interfaces/repositories'
import { IAiProvider } from '../interfaces/providers'
import { Problem, User, Group } from '../types'

@singleton()
export class AiService implements IAiService {
    constructor(
        @inject("IAiProvider") private _provider: IAiProvider,
        @inject("IProblemRepository") private _problemRepo: IProblemRepository,
        @inject("IUserRepository") private _userRepo: IUserRepository,
        @inject("IGroupRepository") private _groupRepo: IGroupRepository
    ) { }

    async hint(problemId: string, userCode: string): Promise<string> {
        const problem = await this._problemRepo.getById(problemId);
        if (!problem) throw new Error("Problem not found");
        return this._provider.hint(problem, userCode);
    }

    async codeReview(problemId: string, userCode: string): Promise<string> {
        const problem = await this._problemRepo.getById(problemId);
        if (!problem) throw new Error("Problem not found");
        return this._provider.codeReview(problem, userCode);
    }

    async performance(userId: string): Promise<string> {
        const profile = await this._userRepo.getById(userId);
        if (!profile) throw new Error("User not found");

        const allGroups = await this._groupRepo.all();
        const joinedGroups = allGroups.filter((group: Group) => (group.members || []).some((member: User | string) => {
            const memberId = typeof member === 'string' ? member : member._id?.toString() || member.id;
            return memberId === userId;
        }));

        const submissionStats = {
            total: profile.duelsWon + profile.duelsLost,
            accepted: profile.duelsWon,
            acceptanceRate: (profile.duelsWon + profile.duelsLost) > 0 ? (profile.duelsWon / (profile.duelsWon + profile.duelsLost)) * 100 : 0
        };

        return this._provider.performance({ user: profile, submissionStats, joinedGroups });
    }

    async explainConcept(concept: string): Promise<string> {
        return this._provider.explainConcept(concept);
    }

    async summarizeDiscussion(messages: string[]): Promise<string> {
        return this._provider.summarizeDiscussion(messages);
    }

    async generateProblem(difficulty: string, topic: string): Promise<Problem> {
        return this._provider.generateProblem(difficulty, topic);
    }
}
