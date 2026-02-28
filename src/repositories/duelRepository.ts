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

  async countRecentDuels(userId: string, since: Date): Promise<number> {
    return this.model.countDocuments({
      $or: [
        /* eslint-disable-next-line @typescript-eslint/naming-convention */
        { 'player1.user': userId },
        /* eslint-disable-next-line @typescript-eslint/naming-convention */
        { 'player2.user': userId }
      ],
      createdAt: { $gte: since }
    });
  }

  async getCommissionStats(): Promise<{ totalWagered: number, totalCommissions: number, totalDuelsWithWagers: number }> {
    const result = await this.model.aggregate([
      { $match: { status: DuelStatus.Finished, wager: { $gt: 0 }, winner: { $ne: null } } },
      { $lookup: { from: 'users', localField: 'winner', foreignField: '_id', as: 'winnerDoc' } },
      { $unwind: '$winnerDoc' },
      {
        $project: {
          wager: 1,
          commission: {
            $multiply: [
              { $multiply: ['$wager', 2] },
              { $cond: [{ $eq: ['$winnerDoc.isPremium', true] }, 0.05, 0.1] }
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          totalWagered: { $sum: { $multiply: ['$wager', 2] } },
          totalCommissions: { $sum: '$commission' },
          totalDuelsWithWagers: { $sum: 1 }
        }
      }
    ]);
    return result.length > 0 ? result[0] : { totalWagered: 0, totalCommissions: 0, totalDuelsWithWagers: 0 };
  }

  async getRecentCommissions(page: number, limit: number): Promise<{ recent: { duelId: string, problemTitle: string, winnerName: string, wager: number, commission: number, timestamp: number }[], total: number }> {
    const skip = (page - 1) * limit;
    const matchStage = { status: DuelStatus.Finished, wager: { $gt: 0 }, winner: { $ne: null } };
    const total = await this.model.countDocuments(matchStage);

    const result = await this.model.aggregate([
      { $match: matchStage },
      { $sort: { startTime: -1 } },
      { $skip: skip },
      { $limit: limit },
      { $lookup: { from: 'users', localField: 'winner', foreignField: '_id', as: 'winnerDoc' } },
      { $unwind: { path: '$winnerDoc', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'problems', localField: 'problem', foreignField: '_id', as: 'problemDoc' } },
      { $unwind: { path: '$problemDoc', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          duelId: { $toString: '$_id' },
          problemTitle: { $ifNull: ['$problemDoc.title', 'Unknown'] },
          winnerName: { $ifNull: ['$winnerDoc.username', 'Unknown'] },
          wager: 1,
          commission: {
            $multiply: [
              { $multiply: ['$wager', 2] },
              { $cond: [{ $eq: ['$winnerDoc.isPremium', true] }, 0.05, 0.1] }
            ]
          },
          timestamp: '$startTime'
        }
      }
    ]);
    return { recent: result, total };
  }

  async getCommissionsByDay(): Promise<{ date: string, amount: number }[]> {
    const result = await this.model.aggregate([
      { $match: { status: DuelStatus.Finished, wager: { $gt: 0 }, winner: { $ne: null } } },
      { $lookup: { from: 'users', localField: 'winner', foreignField: '_id', as: 'winnerDoc' } },
      { $unwind: '$winnerDoc' },
      {
        $project: {
          dateString: {
            $dateToString: { format: '%Y-%m-%d', date: { $toDate: '$startTime' } }
          },
          commission: {
            $multiply: [
              { $multiply: ['$wager', 2] },
              { $cond: [{ $eq: ['$winnerDoc.isPremium', true] }, 0.05, 0.1] }
            ]
          }
        }
      },
      {
        $group: {
          _id: '$dateString',
          amount: { $sum: '$commission' }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          amount: 1
        }
      }
    ]);
    return result;
  }

  async getFlaggedActivities(page: number, limit: number): Promise<{ data: any[], total: number }> {
    const suspectDuels = await this.model.find({
      $or: [
        { 'player1.warnings': { $gt: 0 } },
        { 'player2.warnings': { $gt: 0 } },
        {
          $expr: {
            $and: [
              { $gte: [{ $size: { $ifNull: ["$submissions", []] } }, 2] },
              { $eq: [{ $arrayElemAt: ["$submissions.codeHash", 0] }, { $arrayElemAt: ["$submissions.codeHash", 1] }] },
              { $ne: [{ $arrayElemAt: ["$submissions.codeHash", 0] }, null] },
              { $lte: [{ $abs: { $subtract: [{ $ifNull: [{ $arrayElemAt: ["$submissions.submittedAt", 0] }, 0] }, { $ifNull: [{ $arrayElemAt: ["$submissions.submittedAt", 1] }, 0] }] } }, 120000] }
            ]
          }
        }
      ]
    }).populate('player1.user').populate('player2.user').populate('submissions.user').lean();

    const flags = new Map<string, { count: number; paste: number; visibility: number; last: number; userObj: any }>();

    for (const duel of suspectDuels) {
      const submissions = duel.submissions || [];
      if (submissions.length >= 2) {
        const submission1 = submissions[0];
        const submission2 = submissions[1];
        const close = Math.abs((submission1.submittedAt || 0) - (submission2.submittedAt || 0)) <= 120000;
        const copied = submission1.codeHash && submission2.codeHash && submission1.codeHash === submission2.codeHash;
        if (copied && close) {
          const u1 = submission1.user as any;
          const u2 = submission2.user as any;
          const uid1 = typeof u1 === 'object' && u1 ? (u1._id?.toString() || u1.id) : u1;
          const uid2 = typeof u2 === 'object' && u2 ? (u2._id?.toString() || u2.id) : u2;

          const uids = [{ id: uid1, obj: u1 }, { id: uid2, obj: u2 }].filter(u => u.id);
          for (const { id: uid, obj } of uids) {
            if (!uid) continue;
            const prev = flags.get(uid) || { count: 0, paste: 0, visibility: 0, last: 0, userObj: null };
            const last = Math.max(prev.last, (submission1.submittedAt || 0), (submission2.submittedAt || 0));
            flags.set(uid, { ...prev, count: prev.count + 1, paste: prev.paste + 1, last, userObj: prev.userObj || obj });
          }
        }
      }

      const checkPlayer = (player: any) => {
        if (player.user && player.warnings && player.warnings > 0) {
          const uid = typeof player.user === 'object' ? (player.user._id?.toString() || player.user.id) : player.user;
          if (uid) {
            const prev = flags.get(uid) || { count: 0, paste: 0, visibility: 0, last: 0, userObj: null };
            const duelTime = new Date(duel.updatedAt || duel.startTime || Date.now()).getTime();
            const last = Math.max(prev.last, duelTime);
            const breakdown = player.warningsBreakdown || { paste: 0, visibility: 0 };
            flags.set(uid, {
              count: prev.count + player.warnings,
              paste: prev.paste + (breakdown.paste || 0),
              visibility: prev.visibility + (breakdown.visibility || 0),
              last,
              userObj: prev.userObj || player.user
            });
          }
        }
      };

      checkPlayer(duel.player1);
      checkPlayer(duel.player2);
    }

    const out = Array.from(flags.values()).map(flagData => ({
      user: flagData.userObj,
      totalWarnings: flagData.count,
      lastOffense: new Date(flagData.last || Date.now()).toISOString(),
      breakdown: { paste: flagData.paste, visibility: flagData.visibility }
    })).sort((a, b) => new Date(b.lastOffense).getTime() - new Date(a.lastOffense).getTime());

    const total = out.length;
    const skip = (page - 1) * limit;
    const paginatedOut = out.slice(skip, skip + limit);

    return { data: paginatedOut, total };
  }
}

