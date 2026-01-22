"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useWebSocket } from "@/hooks/use-websocket"
import {
  openOrder,
  getBalance,
  isLoggedIn,
  BTC_ASSET_ID,
  USDT_ASSET_ID,
  type Balance
} from "@/lib/api"

export function TradingPanel() {
  const router = useRouter()
  const [orderType, setOrderType] = useState<"long" | "short">("long")
  const [marketType, setMarketType] = useState("Market")
  const [quantity, setQuantity] = useState("0.01")
  const [limitPrice, setLimitPrice] = useState("")
  const [sliderValue, setSliderValue] = useState(25)
  const [takeProfitStopLoss, setTakeProfitStopLoss] = useState(false)
  const [stopLoss, setStopLoss] = useState("")
  const [takeProfit, setTakeProfit] = useState("")
  const [balances, setBalances] = useState<Balance[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [loggedIn, setLoggedIn] = useState(false)

  const { ticker } = useWebSocket()
  const currentPrice = ticker ? parseFloat(ticker.bestbid) : 0

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/auth")
      return
    }
    setLoggedIn(true)
    fetchBalance()
  }, [router])

  useEffect(() => {
    if (currentPrice > 0 && takeProfitStopLoss) {
      if (!stopLoss) {
        const slPrice = orderType === "long" ? currentPrice * 0.95 : currentPrice * 1.05
        setStopLoss(slPrice.toFixed(2))
      }
      if (!takeProfit) {
        const tpPrice = orderType === "long" ? currentPrice * 1.10 : currentPrice * 0.90
        setTakeProfit(tpPrice.toFixed(2))
      }
    }
  }, [currentPrice, takeProfitStopLoss, orderType, stopLoss, takeProfit])

  useEffect(() => {
    const handler = () => {
      if (loggedIn) fetchBalance()
    }
    window.addEventListener("position-updated", handler)
    return () => window.removeEventListener("position-updated", handler)
  }, [loggedIn])

  async function fetchBalance() {
    try {
      const data = await getBalance()
      setBalances(data)
    } catch (e) {
      console.error("Failed to fetch balance", e)
    }
  }

  async function handlePlaceOrder() {
    if (!loggedIn) {
      setMessage("Not logged in")
      return
    }

    const price = marketType === "Limit" ? limitPrice : currentPrice.toString()
    if (!price || parseFloat(price) <= 0) {
      setMessage(marketType === "Limit" ? "Enter a limit price" : "No price available")
      return
    }

    setLoading(true)
    setMessage("")

    try {
      const result = await openOrder({
        asset_id: BTC_ASSET_ID,
        direction: orderType,
        quantity,
        price,
        quote_asset_id: USDT_ASSET_ID,
        stop_loss: takeProfitStopLoss && stopLoss ? stopLoss : undefined,
        take_profit: takeProfitStopLoss && takeProfit ? takeProfit : undefined,
        idempotency_key: `order-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      })

      if (result.success) {
        setMessage(`Order placed!`)
        fetchBalance()
        window.dispatchEvent(new CustomEvent("position-updated"))
      } else {
        setMessage(result.message)
      }
    } catch {
      setMessage("Failed to place order")
    }

    setLoading(false)
  }

  const execPrice = marketType === "Limit" ? parseFloat(limitPrice || "0") : currentPrice
  const orderValue = execPrice * parseFloat(quantity || "0")
  const totalBalance = balances.reduce((sum, b) => sum + parseFloat(b.quantity || "0"), 0)
  const leverageNum = 10
  const liqPrice = orderType === "long"
    ? execPrice * (1 - 1/leverageNum)
    : execPrice * (1 + 1/leverageNum)

  useEffect(() => {
    if (totalBalance > 0 && currentPrice > 0) {
      const maxQty = (totalBalance / currentPrice) * (sliderValue / 100)
      if (maxQty > 0) setQuantity(maxQty.toFixed(5))
    }
  }, [sliderValue, totalBalance, currentPrice])

  return (
    <div className="w-[220px] border border-[#2b2f36] rounded bg-[#161a1e] overflow-y-auto">
      {/* Cross / Leverage / Mode */}
      <div className="grid grid-cols-3 border-b border-[#2b2f36]">
        <button className="px-2 py-1.5 text-xs font-medium text-white bg-[#2b2f36]">Cross</button>
        <button className="px-2 py-1.5 text-xs font-medium text-[#f0b90b] border-x border-[#2b2f36]">10x</button>
        <button className="px-2 py-1.5 text-xs font-medium text-gray-400">Oneway</button>
      </div>

      {/* Market / Limit */}
      <div className="grid grid-cols-2 border-b border-[#2b2f36] text-[10px]">
        {["Market", "Limit"].map((type) => (
          <button
            key={type}
            onClick={() => setMarketType(type)}
            className={`px-2 py-1.5 ${
              marketType === type
                ? "text-[#f0b90b] border-b-2 border-[#f0b90b]"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Buy / Sell */}
      <div className="grid grid-cols-2 m-2 rounded overflow-hidden">
        <button
          onClick={() => setOrderType("long")}
          className={`px-3 py-2 text-xs font-medium ${
            orderType === "long" ? "bg-green-500 text-white" : "bg-[#2b2f36] text-gray-400"
          }`}
        >
          BUY / LONG
        </button>
        <button
          onClick={() => setOrderType("short")}
          className={`px-3 py-2 text-xs font-medium ${
            orderType === "short" ? "bg-red-500 text-white" : "bg-[#2b2f36] text-gray-400"
          }`}
        >
          SELL / SHORT
        </button>
      </div>

      <div className="px-2 space-y-1.5 text-[10px] pb-2">
        <div className="flex justify-between">
          <span className="text-gray-500">Mark Price</span>
          <span className="font-mono text-green-400">
            {currentPrice ? `$${currentPrice.toLocaleString("en-US", { minimumFractionDigits: 1 })}` : "..."}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Available</span>
          <span className="font-mono text-white">${totalBalance.toFixed(2)}</span>
        </div>

        {marketType === "Limit" && (
          <div className="pt-1">
            <span className="text-gray-500">Limit Price ($)</span>
            <input
              type="text"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              placeholder={currentPrice ? currentPrice.toFixed(1) : "Price"}
              className="w-full mt-1 px-2 py-1.5 text-xs border border-[#2b2f36] rounded bg-[#0b0e11] text-white outline-none focus:border-[#f0b90b] font-mono"
            />
          </div>
        )}

        <div className="pt-1">
          <span className="text-gray-500">Quantity (BTC)</span>
          <input
            type="text"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full mt-1 px-2 py-1.5 text-xs border border-[#2b2f36] rounded bg-[#0b0e11] text-white outline-none focus:border-[#f0b90b] font-mono"
          />
        </div>

        <div className="pt-1">
          <input
            type="range"
            min="0"
            max="100"
            value={sliderValue}
            onChange={(e) => setSliderValue(parseInt(e.target.value))}
            className="w-full h-1 bg-[#2b2f36] rounded-lg appearance-none cursor-pointer accent-[#f0b90b]"
          />
          <div className="flex justify-between text-[9px] text-gray-500 mt-0.5">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>

        <div className="space-y-1 pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-gray-400">
            <input
              type="checkbox"
              checked={takeProfitStopLoss}
              onChange={(e) => {
                setTakeProfitStopLoss(e.target.checked)
                if (!e.target.checked) { setStopLoss(""); setTakeProfit("") }
              }}
              className="w-3 h-3 rounded accent-[#f0b90b]"
            />
            <span>TP / SL</span>
          </label>
        </div>

        {takeProfitStopLoss && (
          <div className="space-y-2 pt-1 border-t border-[#2b2f36]">
            <div>
              <span className="text-gray-500">Stop Loss ($)</span>
              <input
                type="text"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="SL Price"
                className="w-full mt-1 px-2 py-1.5 text-xs border border-[#2b2f36] rounded bg-[#0b0e11] text-white outline-none focus:border-red-500 font-mono"
              />
            </div>
            <div>
              <span className="text-gray-500">Take Profit ($)</span>
              <input
                type="text"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                placeholder="TP Price"
                className="w-full mt-1 px-2 py-1.5 text-xs border border-[#2b2f36] rounded bg-[#0b0e11] text-white outline-none focus:border-green-500 font-mono"
              />
            </div>
          </div>
        )}

        <div className="space-y-0.5 pt-2 border-t border-[#2b2f36] text-gray-400">
          <div className="flex justify-between">
            <span>Order Value</span>
            <span className="text-white font-mono">${orderValue.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Est. Liq. Price</span>
            <span className="text-orange-400 font-mono">${liqPrice > 0 ? liqPrice.toFixed(2) : "--"}</span>
          </div>
          <div className="flex justify-between">
            <span>Fees (0.025%)</span>
            <span className="text-white font-mono">${(orderValue * 0.00025).toFixed(4)}</span>
          </div>
        </div>

        {message && (
          <div className={`text-[10px] text-center py-1 ${message.includes("placed") ? "text-green-400" : "text-red-400"}`}>
            {message}
          </div>
        )}

        <button
          onClick={handlePlaceOrder}
          disabled={loading || (!currentPrice && marketType === "Market")}
          className={`w-full py-2.5 mt-1 text-xs font-bold rounded ${
            orderType === "long"
              ? "bg-green-500 hover:bg-green-600 text-white"
              : "bg-red-500 hover:bg-red-600 text-white"
          } disabled:opacity-50 transition-colors`}
        >
          {loading ? "PLACING..." : `${orderType === "long" ? "BUY / LONG" : "SELL / SHORT"} BTC`}
        </button>
      </div>
    </div>
  )
}
