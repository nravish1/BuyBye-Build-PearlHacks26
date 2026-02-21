import mongoose from 'mongoose'
import 'dotenv/config'

export const connect = async () => {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('MongoDB connected')
}