"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRepository = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
const AppError_1 = __importDefault(require("../utils/AppError"));
/**
 * A generic base repository providing common CRUD operations for Mongoose models.
 * @template T - The type of the Mongoose document.
 */
class BaseRepository {
    constructor(model) {
        this._model = model;
    }
    /**
     * Creates a new document.
     * @param data - The data for the new document.
     * @returns The created document.
     * @throws AppError if creation fails
     */
    async create(data) {
        try {
            return await this._model.create(data);
        }
        catch (error) {
            logger_1.default.error(`Error creating document: ${error instanceof Error ? error.message : String(error)}`);
            throw new AppError_1.default(`Failed to create document: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    /**
     * Finds a document by its ID.
     * @param id - The ID of the document.
     * @param projection - Optional fields to select or exclude.
     * @returns The found document or null.
     * @throws AppError if query fails
     */
    async findById(id, projection) {
        try {
            return await this._model.findById(id).select(projection).exec();
        }
        catch (error) {
            logger_1.default.error(`Error finding document by ID ${id}: ${error instanceof Error ? error.message : String(error)}`);
            throw new AppError_1.default(`Failed to find document by ID: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    /**
     * Finds a single document matching the query.
     * @param query - The query to match.
     * @param projection - Optional fields to select or exclude.
     * @returns The found document or null.
     * @throws AppError if query fails
     */
    async findOne(query, projection) {
        try {
            return await this._model.findOne(query).select(projection).exec();
        }
        catch (error) {
            logger_1.default.error(`Error finding document: ${error instanceof Error ? error.message : String(error)}`);
            throw new AppError_1.default(`Failed to find document: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    /**
     * Finds all documents matching the query.
     * @param query - The query to match (defaults to empty object for all documents).
     * @param projection - Optional fields to select or exclude.
     * @param options - Additional query options like sort, limit, etc.
     * @returns An array of documents.
     * @throws AppError if query fails
     */
    async find(query = {}, projection, options) {
        try {
            let queryBuilder = this._model.find(query);
            if (projection) {
                queryBuilder = queryBuilder.select(projection);
            }
            if (options?.sort) {
                queryBuilder = queryBuilder.sort(options.sort);
            }
            if (options?.limit) {
                queryBuilder = queryBuilder.limit(options.limit);
            }
            if (options?.skip) {
                queryBuilder = queryBuilder.skip(options.skip);
            }
            return await queryBuilder.exec();
        }
        catch (error) {
            logger_1.default.error(`Error finding documents: ${error instanceof Error ? error.message : String(error)}`);
            throw new AppError_1.default(`Failed to find documents: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    /**
     * Finds all documents (convenience method).
     * @param projection - Optional fields to select or exclude.
     * @param options - Additional query options like sort, limit, etc.
     * @returns An array of all documents.
     * @throws AppError if query fails
     */
    async findAll(projection, options) {
        try {
            return await this.find({}, projection, options);
        }
        catch (error) {
            logger_1.default.error(`Error finding all documents: ${error instanceof Error ? error.message : String(error)}`);
            throw new AppError_1.default(`Failed to find all documents: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    /**
     * Finds documents with pagination support.
     * @param query - The query to match (defaults to empty object for all documents).
     * @param page - Page number (1-indexed).
     * @param limit - Number of documents per page.
     * @param projection - Optional fields to select or exclude.
     * @param options - Additional query options like sort.
     * @returns Paginated result with documents and metadata.
     * @throws AppError if query fails
     */
    async findPaginated(query = {}, page = 1, limit = 20, projection, options) {
        try {
            const skip = (page - 1) * limit;
            const [data, total] = await Promise.all([
                this.find(query, projection, { ...options, skip, limit }),
                this.count(query),
            ]);
            return {
                data,
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            };
        }
        catch (error) {
            logger_1.default.error(`Error finding paginated documents: ${error instanceof Error ? error.message : String(error)}`);
            throw new AppError_1.default(`Failed to find paginated documents: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    /**
     * Updates a document by its ID.
     * @param id - The ID of the document to update.
     * @param update - The update data.
     * @param options - Mongoose query options.
     * @returns The updated document or null.
     * @throws AppError if update fails
     */
    async updateById(id, update, options = { new: true }) {
        try {
            return await this._model.findByIdAndUpdate(id, update, options).exec();
        }
        catch (error) {
            logger_1.default.error(`Error updating document by ID ${id}: ${error instanceof Error ? error.message : String(error)}`);
            throw new AppError_1.default(`Failed to update document: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    /**
     * Updates a single document matching the query.
     * @param query - The query to match.
     * @param update - The update data.
     * @param options - Mongoose query options.
     * @returns The updated document or null.
     * @throws AppError if update fails
     */
    async updateOne(query, update, options = { new: true }) {
        try {
            return await this._model.findOneAndUpdate(query, update, options).exec();
        }
        catch (error) {
            logger_1.default.error(`Error updating document: ${error instanceof Error ? error.message : String(error)}`);
            throw new AppError_1.default(`Failed to update document: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    /**
     * Deletes a document by its ID.
     * @param id - The ID of the document to delete.
     * @returns The deleted document or null.
     * @throws AppError if deletion fails
     */
    async deleteById(id) {
        try {
            return await this._model.findByIdAndDelete(id).exec();
        }
        catch (error) {
            logger_1.default.error(`Error deleting document by ID ${id}: ${error instanceof Error ? error.message : String(error)}`);
            throw new AppError_1.default(`Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    /**
     * Deletes a single document matching the query.
     * @param query - The query to match.
     * @returns The deleted document or null.
     * @throws AppError if deletion fails
     */
    async deleteOne(query) {
        try {
            return await this._model.findOneAndDelete(query).exec();
        }
        catch (error) {
            logger_1.default.error(`Error deleting document: ${error instanceof Error ? error.message : String(error)}`);
            throw new AppError_1.default(`Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    /**
     * Counts documents matching the query.
     * @param query - The query to match (defaults to empty object for all documents).
     * @returns The count of matching documents.
     * @throws AppError if count fails
     */
    async count(query = {}) {
        try {
            return await this._model.countDocuments(query).exec();
        }
        catch (error) {
            logger_1.default.error(`Error counting documents: ${error instanceof Error ? error.message : String(error)}`);
            throw new AppError_1.default(`Failed to count documents: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
    /**
     * Checks if a document exists matching the query.
     * @param query - The query to match.
     * @returns True if document exists, false otherwise.
     * @throws AppError if check fails
     */
    async exists(query) {
        try {
            const result = await this._model.exists(query).exec();
            return result !== null;
        }
        catch (error) {
            logger_1.default.error(`Error checking document existence: ${error instanceof Error ? error.message : String(error)}`);
            throw new AppError_1.default(`Failed to check document existence: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
        }
    }
}
exports.BaseRepository = BaseRepository;
