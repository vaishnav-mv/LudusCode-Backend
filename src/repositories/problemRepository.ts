import { singleton } from 'tsyringe'
import { IProblemRepository } from '../interfaces/repositories'
import { ProblemModel } from '../models/Problem'
import { Model } from 'mongoose'
import { Problem } from '../types'
import { BaseRepository } from './BaseRepository'

@singleton()
export class ProblemRepository extends BaseRepository<Problem> implements IProblemRepository {
  constructor() {
    super(ProblemModel as unknown as Model<Problem>)
  }

  async pending(): Promise<Problem[]> {
    const list = await this.model.find({ status: 'Pending' }).lean();
    return list.map((problem) => this.mapDoc(problem)!);
  }

}
