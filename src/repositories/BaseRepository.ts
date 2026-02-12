import { Model, FilterQuery, SortOrder, UpdateQuery } from 'mongoose'
import { IBaseRepository } from '../interfaces/repositories'

export abstract class BaseRepository<T> implements IBaseRepository<T> {
  protected model: Model<T>;

  constructor(model: Model<T>) {
    this.model = model;
  }

  async all(skip: number = 0, limit: number = 0, filter: FilterQuery<T> = {}, sort: Record<string, SortOrder> = { createdAt: -1 }): Promise<T[]> {
    const query = this.model.find(filter).sort(sort);
    if (limit > 0) query.skip(skip).limit(limit);
    const list = await query.lean();
    return list.map((doc) => this.mapDoc(doc as any)).filter((item): item is T => item !== undefined);
  }

  async count(filter: FilterQuery<T> = {}): Promise<number> {
    return this.model.countDocuments(filter);
  }

  async getById(id: string): Promise<T | undefined> {
    const doc = await this.model.findById(id).lean();
    return this.mapDoc(doc as any);
  }

  async create(item: Partial<T>): Promise<T> {
    const createdDoc = await this.model.create(item);
    return this.mapDoc(createdDoc.toObject() as any) as T;
  }

  async update(id: string, partial: UpdateQuery<T>): Promise<T | undefined> {
    const updatedDoc = await this.model.findByIdAndUpdate(id, partial, { new: true }).lean();
    return this.mapDoc(updatedDoc as any);
  }

  async delete(id: string): Promise<boolean> {
    const res = await this.model.findByIdAndDelete(id);
    return !!res;
  }

  protected mapDoc(doc: any): T | undefined {
    if (!doc) return undefined;
    return { ...doc, id: doc._id?.toString() || doc.id } as T;
  }
}

