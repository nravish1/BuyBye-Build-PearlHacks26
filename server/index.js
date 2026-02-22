import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { plaidClient } from './plaid.js'
import { connect } from './db.js'
import { User, Purchase } from './models.js'
import { getGeminiAdvice } from './gemini.js'


const app = express()
app.use(cors({
  origin: '*'
}))
app.use(express.json({limit: '50mb'}))

await connect()

// Register
app.post('/register', async (req, res) => {
  const { name, email, password } = req.body
  const existing = await User.findOne({ email })
  if (existing) return res.status(400).json({ error: 'Email already in use' })
  const user = await User.create({ name, email, password })
  res.json({ userId: user._id, name: user.name })
})

// Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body
  const user = await User.findOne({ email, password })
  if (!user) return res.status(401).json({ error: 'Invalid email or password' })
  res.json({ userId: user._id, name: user.name })
})

// USER data

app.get('/user/:userId', async (req, res) => {
  const user = await User.findById(req.params.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json(user)
})

app.get('/purchases/:userId', async (req, res) => {
  const purchases = await Purchase.find({ userId: req.params.userId })
    .sort({ createdAt: -1 })
    .limit(10)
  res.json(purchases)
})

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

//TEST PLAID

app.post('/plaid/test-setup', async (req, res) => {
  const { userId } = req.body

  // Creates a sandbox access token directly — no Link flow needed
  const sandboxResponse = await plaidClient.sandboxPublicTokenCreate({
    institution_id: 'ins_109508',   // Chase sandbox
    initial_products: ['transactions']
  })

  const exchangeResponse = await plaidClient.itemPublicTokenExchange({
    public_token: sandboxResponse.data.public_token
  })

  await User.findByIdAndUpdate(userId, {
    plaidAccessToken: exchangeResponse.data.access_token
  })

  res.json({ success: true, message: 'Sandbox access token saved' })
})

app.patch('/user/:userId/budget', async (req, res) => {
  const { total, categories } = req.body
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { $set: { 'budget.total': total, 'budget.categories': categories } },
      { new: true }
    )
    res.json({ success: true, budget: user.budget })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.patch('/user/:userId/goal', async (req, res) => {
  const { label, targetAmount, savedAmount, deadline } = req.body
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { $set: { goal: { label, targetAmount, savedAmount, deadline } } },
      { new: true }
    )
    res.json({ success: true, goal: user.goal })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Main endpoint the extension calls
//mock user and budget
// app.post('/check-purchase', async (req, res) => {
//   const { item, price, userId, decision } = req.body
  
//   let budget = { total: 300, spent: 240, categories: { clothing: 200 } }
//   const user = await User.findById(userId).catch(() => null)
//   if (user) budget = user.budget

//   const advice = await getGeminiAdvice(item, price, budget)
//   try {
//     await Purchase.create({ userId: userId, item, price, decision: decision || 'paused' })}
//   catch (e) {
//     console.log('[server] Error saving purchase');
//   }
//   res.json({ message: advice })
// })
app.post('/check-purchase', async (req, res) => {
  const { item, price, userId, decision } = req.body
  
  let budget = { total: 300, spent: 240, categories: { clothing: 200 } }
  const user = await User.findById(userId).catch(() => null)
  if (user) budget = user.budget

  const advice = await getGeminiAdvice(item, price, budget)
  try {

    await Purchase.create({ userId: userId, item, price, decision: decision || 'paused' })
    if (decision === 'Purchased' && user) {
      const numericPrice = Number(price);
      
      user.budget.total -= numericPrice; 
      user.budget.spent += numericPrice; 
      
      user.markModified('budget'); 
      await user.save();
      
      console.log(`[server] Real purchase made. New Total: ${user.budget.total}`);
    }
  
  }
  catch (e) {
    console.log('[server] Error saving purchase');
  }
  res.json({ message: advice })
})
/*
app.post('/check-purchase', async (req, res) => {
  const { item, price, userId } = req.body

  const user = await User.findById(userId)
  if (!user) return res.status(404).json({ error: 'User not found' })

  const advice = await getGeminiAdvice(item, price, user.budget)

  await Purchase.create({ userId, item, price, decision: 'paused' })

  res.json({ message: advice })
})
*/

// Step 1 — frontend calls this to get a link token to open Plaid Link
app.post('/plaid/link', async (req, res) => {
  const { userId } = req.body
  const response = await plaidClient.linkTokenCreate({
    user: { client_user_id: userId },
    client_name: 'Pause & Think',
    products: ['transactions'],
    country_codes: ['US'],
    language: 'en',
  })
  res.json({ link_token: response.data.link_token })
})

// Step 2 — after user connects bank, swap public token for access token
app.post('/plaid/exchange', async (req, res) => {
  const { public_token, userId } = req.body
  const response = await plaidClient.itemPublicTokenExchange({ public_token })
  await User.findByIdAndUpdate(userId, {
    plaidAccessToken: response.data.access_token
  })
  res.json({ success: true })
})

// Step 3 — fetch transactions for this user
app.get('/plaid/transactions/:userId', async (req, res) => {
  const user = await User.findById(req.params.userId)
  if (!user?.plaidAccessToken) return res.json([])

  const response = await plaidClient.transactionsGet({
    access_token: user.plaidAccessToken,
    start_date: '2026-01-01',
    end_date: '2026-02-21',
  })
  res.json(response.data.transactions)
})

app.patch('/user/:userId', async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.userId, req.body, { new: true })
  res.json(user)
})

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`)
})

