import { singleton } from 'tsyringe'
import { IProblemRepository } from '../interfaces/repositories'
import { ProblemModel } from '../models/Problem'
import { Problem } from '../types'
import { BaseRepository } from './BaseRepository'

@singleton()
export class ProblemRepository extends BaseRepository<Problem> implements IProblemRepository {
  constructor() {
    super(ProblemModel)
  }

  // Standard CRUD inherited

  async pending() {
    const list = await this.model.find({ status: 'Pending' }).lean();
    return list.map((p: any) => this.mapDoc(p)!);
  }
}
