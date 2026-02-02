import { singleton, inject } from 'tsyringe'
import { IGroupRepository, IUserRepository } from '../interfaces/repositories'
import { IGroupService } from '../interfaces/services'
import { mapGroup } from '../utils/mapper'

import { ResponseMessages } from '../constants'

@singleton()
export class GroupService implements IGroupService {
    constructor(
        @inject("IGroupRepository") private _groups: IGroupRepository,
        @inject("IUserRepository") private _users: IUserRepository
    ) { }

    async list(userId?: string, params: any = {}) {
        const { q, sort, isPrivate, page = 1, limit = 100 } = params;
        const skip = (page - 1) * limit;

        // Base Filter: Default to public groups only
        let baseFilter: any = { isPrivate: { $ne: true } };

        if (userId) {
            const resolvedId = userId;
            // If user logged in: Public OR Member OR Owner
            baseFilter = {
                $or: [
                    { isPrivate: { $ne: true } },
                    { members: resolvedId },
                    { owner: resolvedId }
                ]
            };
        }

        // Additional Filters from Params
        const queryFilter: any = {};
        if (q) {
            queryFilter.$or = [
                { name: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } }
            ];
        }

        if (isPrivate !== undefined) {
            // String 'true'/'false' from query params
            queryFilter.isPrivate = isPrivate === 'true' || isPrivate === true;
        }

        const finalFilter = { $and: [baseFilter, queryFilter] };

        // Sort Logic
        let sortOption: any = { createdAt: -1 };
        if (sort === 'oldest') sortOption = { createdAt: 1 };
        if (sort === 'alphabetical') sortOption = { name: 1 };

        const groups = await this._groups.all(skip, limit, finalFilter, sortOption);
        return groups.map(mapGroup);
    }

    async detail(id: string) {
        const group = await this._groups.getById(id);
        if (group) {
            if (group.members && Array.isArray(group.members)) {
                // Populate ranks for members
                // Parallelize for performance
                await Promise.all(group.members.map(async (member: any) => {
                    if (member.elo !== undefined) {
                        member.leaderboardRank = await this._users.getRank(member.elo);
                    }
                }));
            }
            return mapGroup(group);
        }
        return undefined;
    }

    async create(name: string, description: string, topics: string[], creatorId: string, isPrivate: boolean = false) {
        const userId = creatorId;
        const creator = await this._users.getById(userId);
        if (!creator) throw new Error(ResponseMessages.USER_NOT_FOUND);

        const existingGroup = await this._groups.findByName(name);
        if (existingGroup) {
            throw new Error(ResponseMessages.GROUP_NAME_TAKEN);
        }

        const created = await this._groups.create({ name, description, isPrivate, topics: topics || [], members: [creator], owner: creator } as any);
        return mapGroup(created);
    }

    async update(id: string, userId: string, data: { name?: string, description?: string }) {
        const group = await this._groups.getById(id);
        if (!group) return null;

        const ownerId = (group as any).owner?._id?.toString?.() || (group as any).owner?.toString?.();
        const resolvedUserId = userId;

        if (ownerId !== resolvedUserId) {
            throw new Error(ResponseMessages.FORBIDDEN_EDIT_GROUP);
        }

        const updated = await this._groups.update(id, data);
        return updated ? mapGroup(updated) : null;
    }

    private getId(member: any) {
        return member && (member._id?.toString?.() || member.id);
    }

    async join(groupId: string, userId: string) {
        const resolvedGroupId = groupId;
        const resolvedUserId = userId;
        const group = await this._groups.getById(resolvedGroupId);
        const user = await this._users.getById(resolvedUserId);
        if (!group || !user) return false;

        // Check if blocked
        if (group.blockedMembers && group.blockedMembers.some((member: any) => this.getId(member) === resolvedUserId)) {
            throw new Error(ResponseMessages.BLOCKED_FROM_GROUP);
        }

        // If already a member, do nothing
        if (group.members.find((member: any) => this.getId(member) === resolvedUserId)) return true;

        // Add to pendingMembers if not already there
        if (!(group.pendingMembers || []).find((member: any) => this.getId(member) === resolvedUserId)) {
            if (!group.pendingMembers) group.pendingMembers = [];
            group.pendingMembers.push(user as any);
            const pendingMemberIds = group.pendingMembers.map((member: any) => this.getId(member)).filter(Boolean);
            await this._groups.update(resolvedGroupId, { pendingMembers: pendingMemberIds });
        }
        return true;
    }

    async approveJoin(groupId: string, userId: string, requesterId: string) {
        console.log(`[GroupService] approveJoin: groupId=${groupId}, userId=${userId}, requesterId=${requesterId}`);
        const resolvedGroupId = groupId;
        const resolvedUserId = userId; // User to approve
        console.log(`[GroupService] Resolved IDs: group=${resolvedGroupId}, user=${resolvedUserId}`);

        const group = await this._groups.getById(resolvedGroupId);
        if (!group) {
            console.log('[GroupService] Group not found');
            return false;
        }

        if (!group.pendingMembers) {
            console.log('[GroupService] No pendingMembers array');
            return false;
        }

        console.log('[GroupService] Pending members count:', group.pendingMembers.length);
        const pendingIndex = group.pendingMembers.findIndex((member: any) => {
            const id = this.getId(member);
            // console.log(`Checking member: ${id} vs ${resolvedUserId}`);
            return id === resolvedUserId;
        });

        if (pendingIndex === -1) {
            console.log('[GroupService] User not found in pendingMembers');
            return false;
        }

        const userToApprove = group.pendingMembers[pendingIndex];
        console.log('[GroupService] Found user to approve:', this.getId(userToApprove));

        group.pendingMembers.splice(pendingIndex, 1);
        group.members.push(userToApprove);

        const memberIds = group.members.map((member: any) => this.getId(member)).filter(Boolean);
        const pendingMemberIds = group.pendingMembers.map((member: any) => this.getId(member)).filter(Boolean);

        console.log(`[GroupService] Updating group. Members: ${memberIds.length}, Pending: ${pendingMemberIds.length}`);
        await this._groups.update(resolvedGroupId, { members: memberIds, pendingMembers: pendingMemberIds });
        return true;
    }

    async rejectJoin(groupId: string, userId: string, requesterId: string) {
        console.log(`[GroupService] rejectJoin: groupId=${groupId}, userId=${userId}`);
        const resolvedGroupId = groupId;
        const resolvedUserId = userId;

        const group = await this._groups.getById(resolvedGroupId);
        if (!group) return false;

        if (!group.pendingMembers) return false;
        const pendingIndex = group.pendingMembers.findIndex((m: any) => this.getId(m) === resolvedUserId);
        if (pendingIndex === -1) {
            console.log('[GroupService] Reject: User not found in pending');
            return false;
        }

        group.pendingMembers.splice(pendingIndex, 1);
        const pendingMemberIds = group.pendingMembers.map((member: any) => this.getId(member)).filter(Boolean);
        await this._groups.update(resolvedGroupId, { pendingMembers: pendingMemberIds });
        return true;
    }

    async leave(groupId: string, userId: string) {
        const resolvedGroupId = groupId;
        const resolvedUserId = userId;
        const group = await this._groups.getById(resolvedGroupId);
        if (!group) return false;
        group.members = group.members.filter((member: any) => {
            const id = this.getId(member);
            return id && id !== resolvedUserId;
        });
        const memberIds = group.members.map((member: any) => this.getId(member)).filter(Boolean);
        await this._groups.update(resolvedGroupId, { members: memberIds });
        return true;
    }

    async kickMember(groupId: string, userId: string, requesterId: string) {
        // Reuse leave logic but with requester check if needed
        // For now, controller handles auth check or we assume trusted caller
        return this.leave(groupId, userId);
    }

    async blockMember(groupId: string, userId: string, requesterId: string) {
        const resolvedGroupId = groupId;
        const resolvedUserId = userId;
        const resolvedRequesterId = requesterId;

        const group = await this._groups.getById(resolvedGroupId);
        const user = await this._users.getById(resolvedUserId);
        if (!group || !user) return false;

        const ownerId = (group as any).owner?._id?.toString?.() || (group as any).owner?.toString?.();
        if (ownerId !== resolvedRequesterId) {
            throw new Error(ResponseMessages.FORBIDDEN_EDIT_GROUP);
        }

        // Add to blockedMembers if not already there
        if (!group.blockedMembers) group.blockedMembers = [];
        if (!group.blockedMembers.find((member: any) => this.getId(member) === resolvedUserId)) {
            group.blockedMembers.push(user as any);
        }

        // Remove from members
        group.members = group.members.filter((member: any) => {
            const id = this.getId(member);
            return id && id !== resolvedUserId;
        });

        // Remove from pendingMembers
        if (group.pendingMembers) {
            group.pendingMembers = group.pendingMembers.filter((member: any) => {
                const id = this.getId(member);
                return id && id !== resolvedUserId;
            });
        }

        const memberIds = group.members.map((member: any) => this.getId(member)).filter(Boolean);
        const pendingMemberIds = group.pendingMembers ? group.pendingMembers.map((member: any) => this.getId(member)).filter(Boolean) : [];
        const blockedMemberIds = group.blockedMembers.map((member: any) => this.getId(member)).filter(Boolean);

        await this._groups.update(resolvedGroupId, { members: memberIds, pendingMembers: pendingMemberIds, blockedMembers: blockedMemberIds });
        return true;
    }

    async delete(groupId: string, requesterId: string) {
        const group = await this._groups.getById(groupId);
        if (!group) return false;

        const ownerId = (group as any).owner?._id?.toString?.() || (group as any).owner?.toString?.();
        const resolvedRequesterId = requesterId;

        if (ownerId !== resolvedRequesterId) {
            throw new Error(ResponseMessages.FORBIDDEN_EDIT_GROUP);
        }

        // Delete all dependent data like competitions, chat, etc if necessary
        // For now, just delete the group
        return this._groups.delete(groupId);
    }

    async addMember(groupId: string, targetUserId: string, requesterId: string) {
        const group = await this._groups.getById(groupId);
        if (!group) return false;

        const ownerId = (group as any).owner?._id?.toString?.() || (group as any).owner?.toString?.();
        const resolvedRequesterId = requesterId;

        if (ownerId !== resolvedRequesterId) {
            throw new Error(ResponseMessages.FORBIDDEN_EDIT_GROUP);
        }

        const resolvedTargetUserId = targetUserId;
        const userToAdd = await this._users.getById(resolvedTargetUserId);

        if (!userToAdd) throw new Error(ResponseMessages.USER_NOT_FOUND);

        // Check if already a member
        if (group.members.find((member: any) => this.getId(member) === resolvedTargetUserId)) {
            return true;
        }

        group.members.push(userToAdd as any);

        // Also remove from pending if they were there
        if (group.pendingMembers) {
            group.pendingMembers = group.pendingMembers.filter((member: any) => this.getId(member) !== resolvedTargetUserId);
        }

        const memberIds = group.members.map((member: any) => this.getId(member)).filter(Boolean);
        const pendingMemberIds = group.pendingMembers ? group.pendingMembers.map((member: any) => this.getId(member)).filter(Boolean) : [];

        await this._groups.update(groupId, { members: memberIds, pendingMembers: pendingMemberIds });
        return true;
    }
}
