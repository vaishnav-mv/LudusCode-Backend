import mongoose, { Schema } from 'mongoose'



const WalletSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', unique: true, index: true },
    balance: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' }
}, {
    timestamps: true
})

import { Wallet } from '../types'
import { Document } from 'mongoose'

export const WalletModel = mongoose.model<Wallet & Document>('Wallet', WalletSchema)
