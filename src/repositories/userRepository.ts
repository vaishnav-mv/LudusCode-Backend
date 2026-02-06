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
    let foundUser;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      foundUser = await this.model.findById(id).lean();
    }

    if (foundUser) {
      const user = foundUser as any;
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
    return this.mapDoc(foundUser);
  }

  async leaderboard(skip: number = 0, limit: number = 100) {
    const list = await this.model.find({ isAdmin: false }).sort({ elo: -1 }).skip(skip).limit(limit).lean();
    return list.map((userDoc: any) => this.mapDoc(userDoc)!);
  }

  async getByUsername(username: string) {
    const foundUser = await this.model.findOne({ username }).lean();
    return this.mapDoc(foundUser);
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
    return list.map((userDoc: any) => this.mapDoc(userDoc)!);
  }
}
