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
    return list.map((duelDoc: any) => this.mapDoc(duelDoc)!);
  }

  // Count is inherited

  // Override to include population
  async getById(id: string) {
    const duelDoc = await this.model.findById(id)
      .populate('problem')
      .populate('player1.user')
      .populate('player2.user')
      .populate('winner')
      .lean();
    return this.mapDoc(duelDoc);
  }

  async create(item: any) {
    const createdDuel = await this.model.create(item);
    // Return populated
    return (await this.getById(createdDuel._id.toString())) as any;
  }

  async update(id: string, partial: any) {
    await this.model.findByIdAndUpdate(id, partial);
    return this.getById(id);
  }

  // Delete is inherited
  // Atomic join operation
  async attemptJoin(id: string, player2Data: any) {
    const updatedDuel = await this.model.findOneAndUpdate(
      { _id: id, status: 'Waiting' },
      {
        $set: {
          player2: player2Data,
          status: 'InProgress', // Or DuelStatus.InProgress if imported, but string is safer if not
          startTime: Date.now()
        }
      },
      { new: true }
    )
      .populate('problem')
      .populate('player1.user')
      .populate('player2.user')
      .populate('winner')
      .lean();

    const result = updatedDuel ? this.mapDoc(updatedDuel) : null;
    return result || null;
  }
}

