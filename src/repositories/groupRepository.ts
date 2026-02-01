import { singleton } from 'tsyringe'
import { IGroupRepository } from '../interfaces/repositories'
import { GroupModel } from '../models/Group'
import { Group } from '../types'
import { BaseRepository } from './BaseRepository'

@singleton()
export class GroupRepository extends BaseRepository<Group> implements IGroupRepository {
  constructor() {
    super(GroupModel)
  }

  async all(skip: number = 0, limit: number = 0, filter: any = {}, sort: any = { createdAt: -1 }) {
    const query = this.model.find(filter).sort(sort)
    if (limit > 0) query.skip(skip).limit(limit)

    const list = await query
      .populate('members')
      .populate('pendingMembers')
      .populate('blockedMembers')
      .populate('owner')
      .lean()

    return list.map((g: any) => this.mapDoc(g)!)
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

  async update(id: string, partial: any) {
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
    })
      .populate('members')
      .populate('pendingMembers')
      .populate('blockedMembers')
      .populate('owner')
      .lean()

    return this.mapDoc(group)
  }
}
