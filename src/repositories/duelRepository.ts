import { singleton } from 'tsyringe'
import { IDuelRepository } from '../interfaces/repositories'
import { DuelModel } from '../models/Duel'
import { Duel, DuelStatus } from '../types'
import { Model } from 'mongoose'
import { BaseRepository } from './BaseRepository'

@singleton()
export class DuelRepository extends BaseRepository<Duel> implements IDuelRepository {
  constructor() {
    super(DuelModel as unknown as Model<Duel>)
  }

  // Override to include population
  async all(skip: number = 0, limit: number = 0, filter: Record<string, unknown> = {}) {
    const query = this.model.find(filter).sort({ createdAt: -1 });
    if (limit > 0) query.skip(skip).limit(limit);
    const list = await query
      .populate('problem')
      .populate('player1.user')
      .populate('player2.user')
      .populate('winner')
      .lean();
    return list.map((duelDoc) => this.mapDoc(duelDoc)!);
  }


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

  async create(item: Partial<Duel>) {
    const createdDuel = await this.model.create(item);
    // Return populated
    return (await this.getById(createdDuel._id.toString())) as Duel;
  }

  async update(id: string, partial: Record<string, unknown>) {
    await this.model.findByIdAndUpdate(id, partial);
    return this.getById(id);
  }


  // Atomic join operation
  async attemptJoin(id: string, player2Data: { user: string | import('../types').User, warnings: number }) {
    const updatedDuel = await this.model.findOneAndUpdate(
      { _id: id, status: DuelStatus.Waiting },
      {
        $set: {
          player2: player2Data,
          status: DuelStatus.InProgress,
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

    console.log('[DuelRepository] attemptJoin result:', updatedDuel ? 'Found' : 'Null', updatedDuel?.player2);

    const result = updatedDuel ? this.mapDoc(updatedDuel) : null;
    return result || null;
  }

  async attemptFinish(id: string, winner: string | import('../types').User | null, finalStatus: string) {
    const updatedDuel = await this.model.findOneAndUpdate(
      { _id: id, status: DuelStatus.InProgress },
      {
        $set: {
          status: finalStatus as DuelStatus,
          winner
        }
      },
      { new: true }
    )
      .populate('problem')
      .populate('player1.user')
      .populate('player2.user')
      .populate('winner')
      .lean();

    return (updatedDuel ? this.mapDoc(updatedDuel) : null) || null;
  }

  async attemptCancel(id: string) {
    const updatedDuel = await this.model.findOneAndUpdate(
      { _id: id, status: DuelStatus.Waiting },
      {
        $set: {
          status: DuelStatus.Cancelled
        }
      },
      { new: true }
    )
      .populate('problem')
      .populate('player1.user')
      .populate('player2.user')
      .populate('winner')
      .lean();

    return (updatedDuel ? this.mapDoc(updatedDuel) : null) || null;
  }
}

