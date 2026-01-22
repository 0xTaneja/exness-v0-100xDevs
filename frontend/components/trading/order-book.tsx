"use client"

import { useMemo } from "react"
import { useWebSocket } from "@/hooks/use-websocket"

export function OrderBook() {
  const { ticker, orderbook, connected } = useWebSocket()

  const currentPrice = ticker ? parseFloat(ticker.bestbid) : 0

  const { sellOrders, buyOrders, spread, spreadPercent } = useMemo(() => {
    // Use real orderbook data if available
    if (orderbook && orderbook.asks.length > 0 && orderbook.bids.length > 0) {
      const asks = orderbook.asks.slice(0, 12).map((level) => {
        const price = level.price
        const size = level.quantity
        return { price, size, total: size }
      })

      // Compute cumulative totals for asks (top to bottom)
      let cumAsk = 0
      for (let i = asks.length - 1; i >= 0; i--) {
        cumAsk += parseFloat(asks[i].size)
        asks[i].total = cumAsk.toFixed(4)
      }

      const bids = orderbook.bids.slice(0, 12).map((level) => {
        const price = level.price
        const size = level.quantity
        return { price, size, total: size }
      })

      // Compute cumulative totals for bids (top to bottom)
      let cumBid = 0
      for (let i = 0; i < bids.length; i++) {
        cumBid += parseFloat(bids[i].size)
        bids[i].total = cumBid.toFixed(4)
      }

      const bestAsk = parseFloat(orderbook.asks[0].price)
      const bestBid = parseFloat(orderbook.bids[0].price)
      const sp = (bestAsk - bestBid).toFixed(1)
      const spPct = bestBid > 0 ? ((bestAsk - bestBid) / bestBid * 100).toFixed(3) : "0.000"

      return { sellOrders: asks, buyOrders: bids, spread: sp, spreadPercent: spPct }
    }

    // Fallback: generate from ticker data
    const basePrice = currentPrice || 71000
    const sell = []
    const buy = []

    for (let i = 11; i >= 0; i--) {
      const sellPrice = (basePrice + (i + 1) * (basePrice * 0.0001)).toFixed(1)
      const buyPrice = (basePrice - (i + 1) * (basePrice * 0.0001)).toFixed(1)
      const sellSize = (Math.random() * 2 + 0.01).toFixed(4)
      const buySize = (Math.random() * 2 + 0.01).toFixed(4)
      const sellTotal = ((12 - i) * 0.4 + Math.random() * 0.4).toFixed(4)
      const buyTotal = ((12 - i) * 0.4 + Math.random() * 0.4).toFixed(4)
      sell.push({ price: sellPrice, size: sellSize, total: sellTotal })
      buy.push({ price: buyPrice, size: buySize, total: buyTotal })
    }

    const sp = ticker
      ? (parseFloat(ticker.bestask) - parseFloat(ticker.bestbid)).toFixed(1)
      : "0.0"
    const spPct = ticker
      ? ((parseFloat(ticker.bestask) - parseFloat(ticker.bestbid)) / parseFloat(ticker.bestbid) * 100).toFixed(3)
      : "0.000"

    return { sellOrders: sell, buyOrders: buy, spread: sp, spreadPercent: spPct }
  }, [currentPrice, ticker, orderbook])

  // Find max total for depth bar scaling
  const maxTotal = useMemo(() => {
    const allTotals = [...sellOrders, ...buyOrders].map(o => parseFloat(o.total))
    return Math.max(...allTotals, 1)
  }, [sellOrders, buyOrders])

  return (
    <div className="w-[200px] border border-[#2b2f36] rounded bg-[#161a1e] flex flex-col">
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#2b2f36]">
        <span className="text-xs font-medium text-white">Order Book</span>
        <span className={`text-[10px] ${connected ? "text-green-400" : "text-red-400"}`}>
          {connected ? "● LIVE" : "● OFFLINE"}
        </span>
      </div>

      <div className="grid grid-cols-3 px-2 py-1 text-[10px] text-gray-500 border-b border-[#2b2f36]">
        <span>PRICE</span>
        <span className="text-right">SIZE</span>
        <span className="text-right">TOTAL</span>
      </div>

      {/* Sell orders (asks) */}
      <div className="flex-1 overflow-hidden flex flex-col justify-end">
        {sellOrders.map((order, i) => {
          const depth = Math.min(parseFloat(order.total) / maxTotal * 100, 100)
          return (
            <div key={`s${i}`} className="relative grid grid-cols-3 px-2 py-[2px] text-[10px]">
              <div
                className="absolute inset-0 bg-red-500/10"
                style={{ width: `${depth}%`, marginLeft: "auto" }}
              />
              <span className="text-red-400 relative z-10 font-mono">{order.price}</span>
              <span className="text-right relative z-10 text-gray-300 font-mono">{order.size}</span>
              <span className="text-right relative z-10 text-gray-500 font-mono">{order.total}</span>
            </div>
          )
        })}
      </div>

      {/* Spread */}
      <div className="grid grid-cols-3 px-2 py-1.5 text-[10px] border-y border-[#2b2f36] bg-[#1e222d]">
        <span className="text-gray-500">Spread</span>
        <span className="text-right text-[#f0b90b] font-mono">${spread}</span>
        <span className="text-right text-[#f0b90b] font-mono">{spreadPercent}%</span>
      </div>

      {/* Buy orders (bids) */}
      <div className="flex-1 overflow-hidden">
        {buyOrders.map((order, i) => {
          const depth = Math.min(parseFloat(order.total) / maxTotal * 100, 100)
          return (
            <div key={`b${i}`} className="relative grid grid-cols-3 px-2 py-[2px] text-[10px]">
              <div
                className="absolute inset-0 bg-green-500/10"
                style={{ width: `${depth}%`, marginLeft: "auto" }}
              />
              <span className="text-green-400 relative z-10 font-mono">{order.price}</span>
              <span className="text-right relative z-10 text-gray-300 font-mono">{order.size}</span>
              <span className="text-right relative z-10 text-gray-500 font-mono">{order.total}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
