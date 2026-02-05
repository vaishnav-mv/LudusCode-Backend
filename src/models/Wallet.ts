import mongoose, { Schema } from 'mongoose'



const WalletSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', unique: true, index: true },
    balance: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' }
}, {
    timestamps: true
})

export const WalletModel = mongoose.model('Wallet', WalletSchema)
