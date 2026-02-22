const BASE_URL = 'http://localhost:3000'

// Auth
export const registerUser = async (name, email, password) => {
  const res = await fetch(`${BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  })
  return res.json()
}

export const loginUser = async (email, password) => {
  const res = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  return res.json()
}

// Budget
export const getBudget = async (userId) => {
  const res = await fetch(`${BASE_URL}/budget/${userId}`)
  return res.json()
}

export const setBudget = async (userId, budget) => {
  const res = await fetch(`${BASE_URL}/budget`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, budget })
  })
  return res.json()
}

// Purchases
export const checkPurchase = async (item, price, userId) => {
  const res = await fetch(`${BASE_URL}/check-purchase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item, price, userId })
  })
  return res.json()
}

export const getPurchases = async (userId) => {
  const res = await fetch(`${BASE_URL}/purchases/${userId}`)
  return res.json()
}

// Plaid NOT YET BUILT
export const createLinkToken = async (userId) => {
  const res = await fetch(`${BASE_URL}/plaid/link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  })
  return res.json()
}