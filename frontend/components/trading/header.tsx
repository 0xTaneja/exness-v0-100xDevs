"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { User, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { getUser, getBalance, clearUser, isLoggedIn, type Balance } from "@/lib/api"

export function Header() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [balance, setBalance] = useState(0)

  useEffect(() => {
    if (isLoggedIn()) {
      const { email: userEmail } = getUser()
      setEmail(userEmail)
      getBalance().then((balances: Balance[]) => {
        const total = balances.reduce((sum: number, b: Balance) => sum + parseFloat(b.quantity || "0"), 0)
        setBalance(total)
      }).catch(() => {})
    }

    const handler = () => {
      if (isLoggedIn()) {
        getBalance().then((balances: Balance[]) => {
          const total = balances.reduce((sum: number, b: Balance) => sum + parseFloat(b.quantity || "0"), 0)
          setBalance(total)
        }).catch(() => {})
      }
    }
    window.addEventListener("position-updated", handler)
    return () => window.removeEventListener("position-updated", handler)
  }, [])

  function handleLogout() {
    clearUser()
    router.push("/auth")
  }

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-[#161a1e] border-b border-[#2b2f36]">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-6 h-6 bg-[#f0b90b] rounded flex items-center justify-center">
            <span className="text-black text-xs font-bold">X</span>
          </div>
          <span className="font-bold text-sm text-white">XTERMINAL</span>
        </Link>
        <nav className="flex items-center gap-1">
          <button className="px-3 py-1.5 text-sm font-medium text-[#f0b90b] bg-[#2b2f36] rounded">Trade</button>
          <button className="px-3 py-1.5 text-sm font-medium text-gray-400 hover:text-white hover:bg-[#2b2f36] rounded">Portfolio</button>
          <button className="px-3 py-1.5 text-sm font-medium text-gray-400 hover:text-white hover:bg-[#2b2f36] rounded">Leaderboard</button>
        </nav>
      </div>

      {email && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1e222d] rounded text-xs">
            <span className="text-gray-400">Balance:</span>
            <span className="text-green-400 font-mono font-medium">${balance.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#2b2f36] rounded">
            <User className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-300 max-w-[150px] truncate">{email}</span>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-[#2b2f36] rounded transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
