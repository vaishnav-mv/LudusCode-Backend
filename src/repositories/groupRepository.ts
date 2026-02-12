import { singleton } from 'tsyringe'
import { IGroupRepository } from '../interfaces/repositories'
import { GroupModel } from '../models/Group'
import { Model } from 'mongoose'
import { Group } from '../types'
import { BaseRepository } from './BaseRepository'

@singleton()
export class GroupRepository extends BaseRepository<Group> implements IGroupRepository {
  constructor() {
    super(GroupModel as unknown as Model<Group>)
  }

  async all(skip: number = 0, limit: number = 0, filter: Record<string, unknown> = {}, sort: Record<string, unknown> = { createdAt: -1 }) {
    const query = this.model.find(filter as any).sort(sort as any)
    if (limit > 0) query.skip(skip).limit(limit)

    const list = await query
      .populate('members')
      .populate('pendingMembers')
      .populate('blockedMembers')
      .populate('owner')
      .lean()

    return list.map((group: any) => this.mapDoc(group)!)
  }

  // Count inherited

  async getById(id: string) {
    const group = await this.model.findById(id)
      .populate('members')
      .populate('pendingMembers')
      .populate('blockedMembers')
      .populate('owner')
      .lean()

    return this.mapDoc(group)
  }

  // Create inherited (no populate needed on create return usually, or service handles it)

  async update(id: string, partial: Partial<Group>) {
    const group = await this.model.findByIdAndUpdate(id, partial, { new: true })
      .populate('members')
      .populate('pendingMembers')
      .populate('blockedMembers')
      .populate('owner')
      .lean()

    return this.mapDoc(group)
  }

  // Delete inherited

  async findByName(name: string) {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    const group = await this.model.findOne({
      name: { $regex: `^${escapedName}$`, $options: 'i' }
    } as any)
      .populate('members')
      .populate('pendingMembers')
      .populate('blockedMembers')
      .populate('owner')
      .lean()

    return this.mapDoc(group)
  }
}
