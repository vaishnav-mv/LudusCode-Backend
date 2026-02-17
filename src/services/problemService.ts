import { singleton, inject } from 'tsyringe'
import { IProblemRepository } from '../interfaces/repositories'
import { IProblemService, IAiService, ProblemListParams } from '../interfaces/services'
import { mapProblem } from '../utils/mapper'
import { Problem, PaginatedResponse } from '../types'

@singleton()
export class ProblemService implements IProblemService {
  constructor(
    @inject("IProblemRepository") private _repo: IProblemRepository,
    @inject("IAiService") private _ai: IAiService
  ) { }

  async list(params: ProblemListParams = {}): Promise<PaginatedResponse<Problem>> {
    const { query, sort, difficulty, status, tags, page = 1, limit = 12 } = params;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;

    if (query) {
      filter.$or = [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
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
      data: problems.map(p => mapProblem(p)).filter(p => p !== null) as Problem[],
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async daily() {
    const list = await this._repo.all(0, 0, { status: 'Approved' });
    if (list.length === 0) return undefined;
    const idx = new Date().getDate() % list.length;
    return mapProblem(list[idx]) || undefined;
  }

  async create(data: Partial<Problem>) {
    const problem = await this._repo.create(data);
    const dto = mapProblem(problem);
    if (!dto) throw new Error('Failed to map problem');
    return dto;
  }

  async update(id: string, data: Partial<Problem>) {
    const problem = await this._repo.update(id, data);
    return problem ? mapProblem(problem) : null;
  }

  async generate(difficulty: string, topic: string) {
    return this._ai.generateProblem(difficulty, topic);
  }
}
