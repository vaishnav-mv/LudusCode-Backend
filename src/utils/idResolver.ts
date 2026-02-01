import mongoose from 'mongoose'
import { UserModel } from '../models/User'
import { GroupModel } from '../models/Group'
import { ProblemModel } from '../models/Problem'

import { DuelModel } from '../models/Duel'

const asId = (doc: any): string | undefined => doc?._id?.toString?.()

export async function resolveUserId(id: string): Promise<string> {
  if (mongoose.Types.ObjectId.isValid(id)) return id
  const byLegacy = await UserModel.findOne({ legacyId: id }).lean()
  return asId(byLegacy) || id
}

export async function resolveGroupId(id: string): Promise<string> {
  if (mongoose.Types.ObjectId.isValid(id)) return id
  const byLegacy = await GroupModel.findOne({ legacyId: id }).lean()
  return asId(byLegacy) || id
}

export async function resolveProblemId(id: string): Promise<string> {
  if (mongoose.Types.ObjectId.isValid(id)) return id
  const byLegacy = await ProblemModel.findOne({ legacyId: id }).lean()
  return asId(byLegacy) || id
}

export async function resolveDuelId(id: string): Promise<string> {
  if (mongoose.Types.ObjectId.isValid(id)) return id
  const byLegacy = await DuelModel.findOne({ legacyId: id }).lean()
  return asId(byLegacy) || id
}
