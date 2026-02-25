import { singleton, inject } from 'tsyringe'
import { IUserService } from '../interfaces/services'
import { IUserRepository, IGroupRepository, IDuelRepository, ISubscriptionRepository } from '../interfaces/repositories'
import { mapUser, mapGroup } from '../utils/mapper'
import { ResponseMessages } from '../constants'
import { User, Duel, Group } from '../types'
import { UserResponseDTO } from '../dto/response/user.response.dto'
import { GroupResponseDTO } from '../dto/response/group.response.dto'

@singleton()
export class UserService implements IUserService {
  constructor(
    @inject("IUserRepository") private _userRepo: IUserRepository,
    @inject("IGroupRepository") private _groupRepo: IGroupRepository,
    @inject("IDuelRepository") private _duelRepo: IDuelRepository,
    @inject("ISubscriptionRepository") private _subscriptions: ISubscriptionRepository
  ) { }

  async profile(id: string): Promise<{
    user: UserResponseDTO | null;
    recentDuels: Duel[];
    joinedGroups: GroupResponseDTO[];
    submissionStats: { total: number, accepted: number, acceptanceRate: number };
  } | null> {
    const userDoc = await this._userRepo.getById(id);
    if (!userDoc) {
      console.error(`User profile not found for id: ${id}`);
      return null;
    }

    // Auto-revoke expired premium status on profile load
    if (userDoc.isPremium && userDoc.subscriptionExpiry && new Date(userDoc.subscriptionExpiry) <= new Date()) {
      await this._userRepo.update(id, { isPremium: false, currentPlanId: undefined, subscriptionExpiry: undefined });
      userDoc.isPremium = false;
      userDoc.currentPlanId = undefined;
      userDoc.subscriptionExpiry = undefined;
    }

    // Fetch duels involving the user
    const allDuels = await this._duelRepo.all();
    const duels = allDuels.filter((duel: Duel) =>
      (typeof duel.player1.user === 'object' && duel.player1.user && '_id' in duel.player1.user && duel.player1.user._id?.toString() === id) ||
      (typeof duel.player1.user === 'string' && duel.player1.user === id) ||
      (typeof duel.player2.user === 'object' && duel.player2.user && '_id' in duel.player2.user && duel.player2.user._id?.toString() === id) ||
      (typeof duel.player2.user === 'string' && duel.player2.user === id)
    ).sort((a: Duel, b: Duel) => b.startTime - a.startTime);

    // Fetch groups the user is a member of
    const allGroups = await this._groupRepo.all();
    const groupsDocs = allGroups.filter((group: Group) =>
      (group.members || []).some((member: User | string) => {
        if (typeof member === 'string') return member === id;
        return member._id?.toString() === id || member.id === id;
      })
    );

    const submissionStats = {
      total: userDoc.duelsWon + userDoc.duelsLost,
      accepted: userDoc.duelsWon,
      acceptanceRate: (userDoc.duelsWon + userDoc.duelsLost) > 0 ? (userDoc.duelsWon / (userDoc.duelsWon + userDoc.duelsLost)) * 100 : 0
    };

    // Calculate Leaderboard Rank
    const rank = await this._userRepo.count({ elo: { $gt: userDoc.elo } }) + 1;

    let features: string[] = [];
    if (userDoc.isPremium && userDoc.currentPlanId) {
      const planIdStr = typeof userDoc.currentPlanId === 'object' ? (userDoc.currentPlanId as object).toString() : userDoc.currentPlanId;
      const plan = await this._subscriptions.getPlanById(planIdStr as string);
      if (plan && plan.features) {
        features = plan.features;
      }
    }

    return {
      user: mapUser(userDoc, rank, features),
      recentDuels: duels,
      joinedGroups: groupsDocs.map(group => mapGroup(group)).filter((group): group is GroupResponseDTO => group !== null),
      submissionStats
    };
  }

  async setPremium(id: string): Promise<User | null> {
    const updated = await this._userRepo.update(id, { isPremium: true });
    return updated !== undefined ? updated : null;
  }

  async leaderboard(page: number = 1, limit: number = 100): Promise<{ users: User[], total: number, page: number, totalPages: number }> {
    const { users, total } = await this._userRepo.leaderboard((page - 1) * limit, limit);
    return {
      users: users.map((user, index) => ({ ...user, leaderboardRank: (page - 1) * limit + index + 1 })),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async updateProfile(id: string, data: Partial<User>): Promise<User | null> {
    const updated = await this._userRepo.update(id, data);
    return updated !== undefined ? updated : null;
  }

  async changePassword(id: string, oldPass: string, newPass: string): Promise<void> {
    const user = await this._userRepo.getById(id);
    if (!user) throw new Error(ResponseMessages.USER_NOT_FOUND);
    if (user.passwordHash) {
      const match = await import('bcryptjs').then(bcrypt => bcrypt.compare(oldPass, user.passwordHash || ''));
      if (!match) throw new Error(ResponseMessages.INCORRECT_PASSWORD);
    }
    const hash = await import('bcryptjs').then(bcrypt => bcrypt.hash(newPass, 10));
    await this._userRepo.update(id, { passwordHash: hash });
  }

  async search(query: string): Promise<User[]> {
    return this._userRepo.search(query);
  }
}
