import { singleton, inject } from 'tsyringe'
import { IProblemRepository } from '../interfaces/repositories'
import { IProblemService, ProblemListParams } from '../interfaces/services'
import { mapProblem } from '../utils/mapper'
import { Problem, PaginatedResponse } from '../types'

@singleton()
export class ProblemService implements IProblemService {
  constructor(
    @inject("IProblemRepository") private _repo: IProblemRepository,
    @inject("IAiService") private _ai: import('../interfaces/services').IAiService
  ) { }

  async list(params: ProblemListParams = {}) {
    const { q, sort, difficulty, status, tags, page = 1, limit = 12 } = params;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;

    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ];
    }
    if (difficulty) filter.difficulty = difficulty;
    if (tags) {
      filter.tags = { $in: typeof tags === 'string' ? tags.split(',') : tags };
    }

    let sortOption: Record<string, 1 | -1> = { createdAt: -1 };
    if (sort === 'oldest') sortOption = { createdAt: 1 };
    if (sort === 'difficulty') sortOption = { difficulty: 1 };

    const problems = await this._repo.all(skip, limit, filter, sortOption);
    const total = await this._repo.count(filter);
    return {
      data: problems.map(mapProblem),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async daily() {
    const list = await this._repo.all(0, 0, { status: 'Approved' });
    if (list.length === 0) return undefined;
    const idx = new Date().getDate() % list.length;
    return mapProblem(list[idx]);
  }

  async create(data: Partial<Problem>) {
    const problem = await this._repo.create(data);
    return mapProblem(problem);
  }

  async generate(difficulty: string, topic: string) {
    return this._ai.generateProblem(difficulty, topic);
  }
}
