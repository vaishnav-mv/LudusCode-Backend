import { singleton } from 'tsyringe'
import { IUserRepository } from '../interfaces/repositories'
import { UserModel } from '../models/User'
import { User } from '../types'
import { BaseRepository } from './BaseRepository'

@singleton()
export class UserRepository extends BaseRepository<User> implements IUserRepository {
  constructor() {
    super(UserModel)
  }

  // Override getById to include rank calculation logic
  async getById(id: string) {
    let u;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      u = await this.model.findById(id).lean();
    }
    if (!u) {
      u = await this.model.findOne({ legacyId: id }).lean();
    }
    if (u) {
      const user = u as any;
      const rank = await this.model.countDocuments({ elo: { $gt: user.elo } }) + 1;
      return { ...this.mapDoc(user), leaderboardRank: rank } as User;
    }
    return undefined;
  }

  async getRank(elo: number) {
    return await this.model.countDocuments({ elo: { $gt: elo } }) + 1;
  }

  async getByEmail(email: string) {
    const u = await this.model.findOne({ email: email.toLowerCase() }).lean();
    return this.mapDoc(u);
  }

  async leaderboard() {
    const list = await this.model.find({ isAdmin: false }).sort({ elo: -1 }).lean();
    return list.map((u: any) => this.mapDoc(u)!);
  }

  async getByUsername(username: string) {
    const u = await this.model.findOne({ username }).lean();
    return this.mapDoc(u);
  }

  async search(query: string) {
    const regex = new RegExp(query, 'i');
    const list = await this.model.find({
      $and: [
        {
          $or: [
            { username: regex },
            { email: regex }
          ]
        },
        { isAdmin: false }
      ]
    }).limit(10).lean();
    return list.map((u: any) => this.mapDoc(u)!);
  }
}
