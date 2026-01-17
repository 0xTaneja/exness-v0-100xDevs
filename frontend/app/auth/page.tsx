"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signup, signin, saveUser } from "@/lib/api"

export default function AuthPage() {
  const router = useRouter()
  const [isSignup, setIsSignup] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")

    try {
      if (isSignup) {
        const result = await signup({ email, password })
        if (result.success && result.user_id) {
          saveUser(result.user_id, email, result.token)
          setMessage(result.message)
          setTimeout(() => router.push("/trade"), 1000)
        } else {
          setError(result.message)
        }
      } else {
        const result = await signin({ email, password })
        if (result.success && result.user_id) {
          saveUser(result.user_id, email, result.token)
          setMessage(result.message)
          setTimeout(() => router.push("/trade"), 1000)
        } else {
          setError(result.message)
        }
      }
    } catch {
      setError("Connection error. Is the server running?")
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0b0e11] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#161a1e] rounded-lg border border-[#2b2f36] p-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 bg-[#f0b90b] rounded flex items-center justify-center">
              <span className="text-black font-bold text-xl">X</span>
            </div>
            <span className="font-bold text-2xl text-white">Terminal</span>
          </div>

          {/* Toggle */}
          <div className="flex mb-6 border border-[#2b2f36] rounded overflow-hidden">
            <button
              onClick={() => setIsSignup(true)}
              className={`flex-1 py-2 text-sm font-medium transition ${
                isSignup ? "bg-[#f0b90b] text-black" : "bg-[#1e222d] text-gray-400"
              }`}
            >
              Sign Up
            </button>
            <button
              onClick={() => setIsSignup(false)}
              className={`flex-1 py-2 text-sm font-medium transition ${
                !isSignup ? "bg-[#f0b90b] text-black" : "bg-[#1e222d] text-gray-400"
              }`}
            >
              Sign In
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-[#2b2f36] rounded bg-[#0b0e11] text-white focus:outline-none focus:ring-2 focus:ring-[#f0b90b] focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 border border-[#2b2f36] rounded bg-[#0b0e11] text-white focus:outline-none focus:ring-2 focus:ring-[#f0b90b] focus:border-transparent"
                placeholder="Min 6 characters"
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm text-center bg-red-500/10 py-2 rounded border border-red-500/20">
                {error}
              </div>
            )}

            {message && (
              <div className="text-green-400 text-sm text-center bg-green-500/10 py-2 rounded border border-green-500/20">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#f0b90b] text-black font-medium rounded hover:bg-[#d4a50b] transition disabled:opacity-50"
            >
              {loading ? "Loading..." : isSignup ? "Create Account" : "Sign In"}
            </button>
          </form>

          {/* Info */}
          {isSignup && (
            <p className="mt-4 text-center text-sm text-gray-500">
              New accounts receive <span className="font-semibold text-green-400">$10,000</span> demo balance
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
