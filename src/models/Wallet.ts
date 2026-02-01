import mongoose, { Schema } from 'mongoose'

const TransactionSchema = new Schema({
    id: { type: String },
    type: { type: String },
    status: { type: String },
    amount: { type: Number },
    description: { type: String },
    timestamp: { type: String }
})

const WalletSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    balance: { type: Number },
    currency: { type: String },
    transactions: { type: [TransactionSchema], default: [] }
})

export const WalletModel = mongoose.model('Wallet', WalletSchema)
