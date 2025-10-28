import { injectable } from 'tsyringe';
import User from '../models/User';
import { IUser } from '../types/models';
import { HttpStatus } from '../constants';
import { Schema } from 'mongoose';
import { IUserRepository } from '../interfaces/repositories/IUserRepository';
import { BaseRepository } from './BaseRepository';
import logger from '../utils/logger';
import AppError from '../utils/AppError';

@injectable()
export class UserRepository extends BaseRepository<IUser> implements IUserRepository {
  constructor() {
    super(User);
  }

  async findById(id: string, select?: string): Promise<IUser | null> {
    try {
      return await super.findById(id, select);
    } catch (error) {
      logger.error(
        `UserRepository.findById error: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new AppError(
        `Failed to find user by ID: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async findByEmail(email: string, select?: string): Promise<IUser | null> {
    try {
      return await super.findOne({ email }, select);
    } catch (error) {
      logger.error(
        `UserRepository.findByEmail error for ${email}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new AppError(
        `Failed to find user by email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async findOne(query: object, select?: string): Promise<IUser | null> {
    try {
      return await super.findOne(query, select);
    } catch (error) {
      logger.error(
        `UserRepository.findOne error: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new AppError(
        `Failed to find user: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async findAll(): Promise<IUser[]> {
    try {
      return await super.findAll(undefined, { sort: { createdAt: -1 } });
    } catch (error) {
      logger.error(
        `UserRepository.findAll error: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new AppError(
        `Failed to find all users: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async findAllPaginated(
    page: number = 1,
    limit: number = 20
  ): Promise<{
    data: IUser[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> {
    try {
      return await super.findPaginated({}, page, limit, undefined, { sort: { createdAt: -1 } });
    } catch (error) {
      logger.error(
        `UserRepository.findAllPaginated error: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new AppError(
        `Failed to find paginated users: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async create(userData: Partial<IUser>): Promise<IUser> {
    try {
      return await super.create(userData);
    } catch (error) {
      logger.error(
        `UserRepository.create error: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new AppError(
        `Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async updateById(
    id: string | Schema.Types.ObjectId,
    updateData: Partial<IUser>
  ): Promise<IUser | null> {
    try {
      return await super.updateById(id.toString(), updateData);
    } catch (error) {
      logger.error(
        `UserRepository.updateById error for ID ${id}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new AppError(
        `Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}

// Export a default instance for backward compatibility
export default new UserRepository();
