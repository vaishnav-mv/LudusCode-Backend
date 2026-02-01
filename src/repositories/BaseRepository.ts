import { Model } from 'mongoose'
import { IBaseRepository } from '../interfaces/repositories'

export abstract class BaseRepository<T> implements IBaseRepository<T> {
  protected model: Model<any>;

  constructor(model: Model<any>) {
    this.model = model;
  }

  async all(skip: number = 0, limit: number = 0, filter: any = {}, sort: any = { createdAt: -1 }): Promise<T[]> {
    const query = this.model.find(filter).sort(sort);
    if (limit > 0) query.skip(skip).limit(limit);
    const list = await query.lean();
    return list.map((doc: any) => this.mapDoc(doc)).filter((item): item is T => item !== undefined);
  }

  async count(filter: any = {}): Promise<number> {
    return this.model.countDocuments(filter);
  }

  async getById(id: string): Promise<T | undefined> {
    const doc = await this.model.findById(id).lean();
    return this.mapDoc(doc);
  }

  async create(item: T): Promise<T> {
    const m = await this.model.create(item);
    return this.mapDoc(m.toObject()) as T;
  }

  async update(id: string, partial: Partial<T>): Promise<T | undefined> {
    const m = await this.model.findByIdAndUpdate(id, partial, { new: true }).lean();
    return this.mapDoc(m);
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

