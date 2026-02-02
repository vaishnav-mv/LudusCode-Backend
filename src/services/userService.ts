import { singleton, inject } from 'tsyringe'
import { IUserService } from '../interfaces/services'
import { IUserRepository, IGroupRepository, IDuelRepository } from '../interfaces/repositories'
import { mapUser, mapGroup } from '../utils/mapper'
import { ResponseMessages } from '../constants'
import { User } from '../types'

@singleton()
export class UserService implements IUserService {
  constructor(
    @inject("IUserRepository") private _userRepo: IUserRepository,
    @inject("IGroupRepository") private _groupRepo: IGroupRepository,
    @inject("IDuelRepository") private _duelRepo: IDuelRepository
  ) { }

  async profile(id: string): Promise<any> {
    const userDoc = await this._userRepo.getById(id);
    if (!userDoc) {
      console.error(`User profile not found for id: ${id}`);
      return null;
    }

    // Fetch duels involving the user
    const allDuels = await this._duelRepo.all();
    const duels = allDuels.filter((duel: any) =>
      (duel.player1.user?._id?.toString?.() === id || duel.player1.user?.id === id) ||
      (duel.player2.user?._id?.toString?.() === id || duel.player2.user?.id === id)
    ).sort((a: any, b: any) => b.startTime - a.startTime);

    // Fetch groups the user is a member of
    const allGroups = await this._groupRepo.all();
    const groupsDocs = allGroups.filter((group: any) =>
      (group.members || []).some((member: any) => (member._id?.toString?.() === id || member.id === id))
    );

    const submissionStats = {
      total: userDoc.duelsWon + userDoc.duelsLost,
      accepted: userDoc.duelsWon,
      acceptanceRate: (userDoc.duelsWon + userDoc.duelsLost) > 0 ? (userDoc.duelsWon / (userDoc.duelsWon + userDoc.duelsLost)) * 100 : 0
    };

    // Calculate Leaderboard Rank
    const rank = await this._userRepo.count({ elo: { $gt: userDoc.elo } }) + 1;

    return {
      user: mapUser(userDoc, rank),
      recentDuels: duels,
      joinedGroups: groupsDocs.map(mapGroup),
      submissionStats
    };
  }

  async setPremium(id: string): Promise<User | null> {
    const updated = await this._userRepo.update(id, { isPremium: true });
    return updated !== undefined ? updated : null;
  }

  async leaderboard(): Promise<any[]> {
    const list = await this._userRepo.leaderboard();
    return list.map(mapUser).filter(user => user !== null);
  }

  async updateProfile(id: string, data: { name?: string; avatarUrl?: string }): Promise<User | null> {
    const updateData: any = {};
    if (data.name) updateData.username = data.name;
    if (data.avatarUrl) updateData.avatarUrl = data.avatarUrl;
    const updated = await this._userRepo.update(id, updateData);
    return updated !== undefined ? updated : null;
  }

  async changePassword(id: string, oldPass: string, newPass: string): Promise<void> {
    const user = await this._userRepo.getById(id);
    if (!user) throw new Error(ResponseMessages.USER_NOT_FOUND);
    if (user.passwordHash) {
      const match = await import('bcryptjs').then(b => b.compare(oldPass, user.passwordHash || ''));
      if (!match) throw new Error(ResponseMessages.INCORRECT_PASSWORD);
    }
    const hash = await import('bcryptjs').then(b => b.hash(newPass, 10));
    await this._userRepo.update(id, { passwordHash: hash });
  }

  async search(query: string): Promise<User[]> {
    const users = await this._userRepo.search(query);
    return users.map(user => mapUser(user)).filter(user => user !== null && user !== undefined) as User[];
  }
}
