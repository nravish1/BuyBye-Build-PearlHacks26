import mongoose from 'mongoose'
import { type } from 'os'

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  plaidAccessToken: String,
  interests: [String],
  goal: {
    label: String,
    targetAmount: Number,
    savedAmount: Number,
    deadline: Date
    
  },
  budget: {
    total: Number,
    spent: { type: Number, default: 0 },
    categories: Object
  }

})

const purchaseSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  item: String,
  price: Number,
  decision: String,
  createdAt: { type: Date, default: Date.now }
})

export const User = mongoose.model('User', userSchema)
export const Purchase = mongoose.model('Purchase', purchaseSchema)