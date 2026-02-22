import { useState } from 'react'
import { loginUser, registerUser } from '../api'

export default function Login() {
  const [isRegister, setIsRegister] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setError('')
    const res = isRegister
      ? await registerUser(form.name, form.email, form.password)
      : await loginUser(form.email, form.password)

    if (res.error) return setError(res.error)

    // Save to localStorage so other pages can access it
    localStorage.setItem('userId', res.userId)
    localStorage.setItem('userName', res.name)

    window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--blush)' }}>
      <div className="card w-full max-w-sm">

        <h1 className="text-2xl text-center mb-1" style={{ fontFamily: "'Lora', serif" }}>
          Pause & Think
        </h1>
        <p className="text-center text-sm mb-8" style={{ color: 'var(--text-light)' }}>
          {isRegister ? 'Create your account' : 'Welcome back'}
        </p>

        {isRegister && (
          <input
            className="w-full border rounded-xl px-4 py-2.5 text-sm mb-3 outline-none"
            style={{ borderColor: 'var(--dusty)', fontFamily: "'DM Sans', sans-serif" }}
            placeholder="Name"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
          />
        )}

        <input
          className="w-full border rounded-xl px-4 py-2.5 text-sm mb-3 outline-none"
          style={{ borderColor: 'var(--dusty)', fontFamily: "'DM Sans', sans-serif" }}
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })}
        />

        <input
          className="w-full border rounded-xl px-4 py-2.5 text-sm mb-4 outline-none"
          style={{ borderColor: 'var(--dusty)', fontFamily: "'DM Sans', sans-serif" }}
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={e => setForm({ ...form, password: e.target.value })}
        />

        {error && (
          <p className="text-sm text-center mb-3" style={{ color: '#b06060' }}>{error}</p>
        )}

        <button className="btn-primary w-full" onClick={handleSubmit}>
          {isRegister ? 'Create Account' : 'Log In'}
        </button>

        <p className="text-center text-xs mt-4" style={{ color: 'var(--text-light)' }}>
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <span
            className="underline cursor-pointer"
            style={{ color: 'var(--accent)' }}
            onClick={() => setIsRegister(!isRegister)}
          >
            {isRegister ? 'Log in' : 'Sign up'}
          </span>
        </p>

      </div>
    </div>
  )
}