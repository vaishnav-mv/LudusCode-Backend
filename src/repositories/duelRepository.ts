import { singleton } from 'tsyringe'
import { IDuelRepository } from '../interfaces/repositories'
import { DuelModel } from '../models/Duel'
import { Duel } from '../types' // Ensure strict typing
import { BaseRepository } from './BaseRepository'

@singleton()
export class DuelRepository extends BaseRepository<Duel> implements IDuelRepository {
  constructor() {
    super(DuelModel)
  }

  // Override to include population
  async all(skip: number = 0, limit: number = 0, filter: any = {}) {
    const query = this.model.find(filter).sort({ createdAt: -1 });
    if (limit > 0) query.skip(skip).limit(limit);
    const list = await query
      .populate('problem')
      .populate('player1.user')
      .populate('player2.user')
      .populate('winner')
      .lean();
    return list.map((d: any) => this.mapDoc(d)!);
  }

  // Count is inherited

  // Override to include population
  async getById(id: string) {
    const d = await this.model.findById(id)
      .populate('problem')
      .populate('player1.user')
      .populate('player2.user')
      .populate('winner')
      .lean();
    return this.mapDoc(d);
  }

  async create(item: any) {
    const m = await this.model.create(item);
    // Return populated
    return (await this.getById(m._id.toString())) as any;
  }

  async update(id: string, partial: any) {
    await this.model.findByIdAndUpdate(id, partial);
    return this.getById(id);
  }

  // Delete is inherited
}

