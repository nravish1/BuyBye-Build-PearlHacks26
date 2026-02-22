import mongoose from 'mongoose'

const categorySchema = new mongoose.Schema({
  limit: { type: Number, default: 0 },
  spent: { type: Number, default: 0 }
}, { _id: false })

const userSchema = new mongoose.Schema({
  name:             String,
  email:            String,
  password:         String,
  plaidAccessToken: String,
  interests:        [String],
  hourlyWage: { type: Number, default: 0 },
  goal: {
    label:        String,
    targetAmount: Number,
    savedAmount:  { type: Number, default: 0 },
    deadline:     Date,
  },

  budget: {
    total: { type: Number, default: 300 },
    spent: { type: Number, default: 0 },
    categories: {
      clothing:      { type: categorySchema, default: () => ({}) },
      food:          { type: categorySchema, default: () => ({}) },
      beauty:        { type: categorySchema, default: () => ({}) },
      entertainment: { type: categorySchema, default: () => ({}) },
    }
  }
})

const purchaseSchema = new mongoose.Schema({
  userId:    mongoose.Schema.Types.ObjectId,
  item:      String,
  price:     Number,
  category:  String,
  tag:       String,
  decision:  String,
  site:      String,
  createdAt: { type: Date, default: Date.now }
})

export const User     = mongoose.model('User', userSchema)
export const Purchase = mongoose.model('Purchase', purchaseSchema)