import { singleton } from 'tsyringe'
import { IUserRepository } from '../interfaces/repositories'
import { Model } from 'mongoose'
import { UserModel } from '../models/User'
import { User } from '../types'
import { BaseRepository } from './BaseRepository'

@singleton()
export class UserRepository extends BaseRepository<User> implements IUserRepository {
  constructor() {
    super(UserModel as unknown as Model<User>)
  }

  // Override getById to include rank calculation logic
  async getById(id: string): Promise<User | undefined> {
    let foundUser;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      foundUser = await this.model.findById(id).lean();
    }

    if (foundUser) {
      const user = foundUser;
      const rank = await this.model.countDocuments({ elo: { $gt: user.elo } }) + 1;
      return { ...this.mapDoc(user), leaderboardRank: rank } as User;
    }
    return undefined;
  }

  async getRank(elo: number) {
    return await this.model.countDocuments({ elo: { $gt: elo } }) + 1;
  }

  async getByEmail(email: string) {
    const foundUser = await this.model.findOne({ email: email.toLowerCase() }).lean();
    if (foundUser) {
      const user = foundUser;
      const rank = await this.model.countDocuments({ elo: { $gt: user.elo } }) + 1;
      return { ...this.mapDoc(user), leaderboardRank: rank } as User;
    }
    return undefined;
  }

  async leaderboard(skip: number = 0, limit: number = 100) {
    const list = await this.model.find({ isAdmin: false }).sort({ elo: -1 }).skip(skip).limit(limit).lean();
    const total = await this.model.countDocuments({ isAdmin: false });
    return {
      users: list.map((userDoc) => this.mapDoc(userDoc)!),
      total
    };
  }

  async getByUsername(username: string) {
    const foundUser = await this.model.findOne({ username }).lean();
    if (foundUser) {
      const user = foundUser;
      const rank = await this.model.countDocuments({ elo: { $gt: user.elo } }) + 1;
      return { ...this.mapDoc(user), leaderboardRank: rank } as User;
    }
    return undefined;
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
    return list.map((userDoc) => this.mapDoc(userDoc)!);
  }
}
