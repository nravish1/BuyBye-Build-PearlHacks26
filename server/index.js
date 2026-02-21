import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { connect } from './db.js'
import { User, Purchase } from './models.js'
import { getGeminiAdvice } from './gemini.js'

const app = express()
app.use(cors())
app.use(express.json())

await connect()


app.get('/', (req, res) => {
  res.json({ message: 'Server is running' })
})

app.get('/seed', async (req, res) => {
  const user = await User.create({
    email: 'test@test.com',
    password: 'test123',
    budget: {
      total: 300,
      spent: 240,
      categories: { clothing: 200, food: 100 }
    }
  })
  res.json(user)
})

// Test Gemini connection
app.get('/test-gemini', async (req, res) => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'Say hello' }] }] })
    }
  )
  const data = await response.json()
  res.json(data)
})

// Main endpoint the extension calls
app.post('/check-purchase', async (req, res) => {
  const { item, price, userId } = req.body

  const user = await User.findById(userId)
  if (!user) return res.status(404).json({ error: 'User not found' })

  const advice = await getGeminiAdvice(item, price, user.budget)

  await Purchase.create({ userId, item, price, decision: 'paused' })

  res.json({ message: advice })
})

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`)
})