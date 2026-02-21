
const MODEL_NAME = 'gemini-2.5-flash'; // Or 'gemini-2.5-pro', 'gemini-1.5-pro', etc.
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${process.env.GEMINI_API_KEY}`

export const getGeminiAdvice = async (item, price, budget) => {
  const spent = budget.spent || 0
  const total = budget.total || 0
  const remaining = total - spent

  console.log('1. Budget data received:', { item, price, spent, total, remaining })

//   CHANGE THIS 
  const prompt = `
    A user is about to buy: "${item}" for $${price}.
    Their monthly budget is $${total}.
    They have spent $${spent} so far this month.
    They have $${remaining} remaining.
    
    Give them one short, honest, and slightly witty reason to pause before buying.
    Keep it under 3 sentences. Be encouraging, not preachy.
  `

  console.log('2. Calling Gemini API...')

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  })

  console.log('3. Gemini status:', response.status)

  const data = await response.json()

  console.log('4. Gemini raw response:', JSON.stringify(data, null, 2))

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  console.log('5. Extracted text:', text)

  return text || "Pause and think — do you really need this right now?"
}