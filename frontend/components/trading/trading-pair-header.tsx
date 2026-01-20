"use client"

import { useWebSocket } from "@/hooks/use-websocket"
import { useEffect, useRef, useState } from "react"

export function TradingPairHeader() {
  const { ticker, connected } = useWebSocket()
  const [priceDirection, setPriceDirection] = useState<"up" | "down" | "neutral">("neutral")
  const prevPriceRef = useRef(0)

  const currentPrice = ticker ? parseFloat(ticker.bestbid) : 0
  const askPrice = ticker ? parseFloat(ticker.bestask) : 0

  useEffect(() => {
    if (currentPrice > 0 && prevPriceRef.current > 0) {
      if (currentPrice > prevPriceRef.current) setPriceDirection("up")
      else if (currentPrice < prevPriceRef.current) setPriceDirection("down")
    }
    if (currentPrice > 0) prevPriceRef.current = currentPrice
  }, [currentPrice])

  const spread = askPrice - currentPrice
  const spreadPct = currentPrice > 0 ? (spread / currentPrice * 100) : 0

  return (
    <div className="flex items-center gap-6 text-xs">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-[#f7931a] flex items-center justify-center">
          <span className="text-white font-bold text-[10px]">&#8383;</span>
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm text-white">BTC-USD</span>
          <span className="text-[10px] text-gray-500">Bitcoin Perpetual</span>
        </div>
        <span className={`ml-1 px-1.5 py-0.5 text-[10px] rounded font-medium ${
          connected ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
        }`}>
          {connected ? "LIVE" : "OFFLINE"}
        </span>
      </div>

      <div className="flex items-center gap-6 text-gray-400">
        <div>
          <span className="text-gray-500 text-[10px]">MARK</span>
          <span className={`ml-1 font-mono font-medium text-sm ${
            priceDirection === "up" ? "text-green-400" : priceDirection === "down" ? "text-red-400" : "text-white"
          }`}>
            {currentPrice > 0 ? `$${currentPrice.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}` : "--"}
          </span>
        </div>
        <div>
          <span className="text-gray-500 text-[10px]">ASK</span>
          <span className="ml-1 text-white font-mono">
            {askPrice > 0 ? `$${askPrice.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}` : "--"}
          </span>
        </div>
        <div>
          <span className="text-gray-500 text-[10px]">SPREAD</span>
          <span className="ml-1 text-[#f0b90b] font-mono">
            {spread > 0 ? `$${spread.toFixed(1)} (${spreadPct.toFixed(3)}%)` : "--"}
          </span>
        </div>
        <div>
          <span className="text-gray-500 text-[10px]">BID QTY</span>
          <span className="ml-1 text-white font-mono">
            {ticker ? parseFloat(ticker.bidquantity).toFixed(5) : "--"}
          </span>
        </div>
        <div>
          <span className="text-gray-500 text-[10px]">ASK QTY</span>
          <span className="ml-1 text-white font-mono">
            {ticker ? parseFloat(ticker.askquantity).toFixed(5) : "--"}
          </span>
        </div>
      </div>
    </div>
  )
}
