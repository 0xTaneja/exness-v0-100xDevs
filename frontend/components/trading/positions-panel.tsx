"use client"

import { useState, useEffect, useCallback } from "react"
import { X } from "lucide-react"
import { useWebSocket } from "@/hooks/use-websocket"
import {
  getPositions,
  closePosition,
  getPnL,
  isLoggedIn,
  USDT_ASSET_ID,
  type Position,
  type PositionPnL
} from "@/lib/api"

export function PositionsPanel() {
  const [activeTab, setActiveTab] = useState("Positions")
  const [positions, setPositions] = useState<Position[]>([])
  const [closedPositions, setClosedPositions] = useState<Position[]>([])
  const [pnlData, setPnlData] = useState<PositionPnL[]>([])
  const [totalPnL, setTotalPnL] = useState("0")
  const [equity, setEquity] = useState("0")
  const [loading, setLoading] = useState(true)
  const [closingId, setClosingId] = useState<string | null>(null)
  const [loggedIn, setLoggedIn] = useState(false)

  const { ticker } = useWebSocket()
  const currentPrice = ticker ? parseFloat(ticker.bestbid) : 0

  const tabs = ["Positions", "Trade History"]

  const fetchPositions = useCallback(async () => {
    try {
      const data = await getPositions("open")
      setPositions(data)
    } catch (e) {
      console.error("Failed to fetch positions", e)
    }
    setLoading(false)
  }, [])

  const fetchClosedPositions = useCallback(async () => {
    try {
      const data = await getPositions("closed")
      setClosedPositions(data)
    } catch (e) {
      console.error("Failed to fetch closed positions", e)
    }
  }, [])

  useEffect(() => {
    if (isLoggedIn()) {
      setLoggedIn(true)
      fetchPositions()
      fetchClosedPositions()
    }
  }, [fetchPositions, fetchClosedPositions])

  useEffect(() => {
    const handler = () => {
      if (loggedIn) {
        fetchPositions()
        fetchClosedPositions()
      }
    }
    window.addEventListener("position-updated", handler)
    return () => window.removeEventListener("position-updated", handler)
  }, [loggedIn, fetchPositions, fetchClosedPositions])

  useEffect(() => {
    if (currentPrice > 0 && positions.length > 0 && loggedIn) {
      fetchPnL()
    }
  }, [currentPrice, positions.length, loggedIn])

  async function fetchPnL() {
    if (!currentPrice) return
    try {
      const data = await getPnL(currentPrice.toString())
      setPnlData(data.positions)
      setTotalPnL(data.total_unrealized_pnl)
      setEquity(data.equity)
    } catch (e) {
      console.error("Failed to fetch PnL", e)
    }
  }

  async function handleClosePosition(positionId: string) {
    if (!currentPrice || !loggedIn) return
    setClosingId(positionId)

    try {
      const result = await closePosition({
        position_id: positionId,
        close_price: currentPrice.toString(),
        close_reason: "manual",
        quote_asset_id: USDT_ASSET_ID,
      })

      if (result.success) {
        fetchPositions()
        fetchClosedPositions()
        window.dispatchEvent(new CustomEvent("position-updated"))
      } else {
        alert(result.message)
      }
    } catch (e) {
      console.error("Failed to close position", e)
    }

    setClosingId(null)
  }

  function getPositionPnL(positionId: string): PositionPnL | undefined {
    return pnlData.find(p => p.position_id === positionId)
  }

  return (
    <div className="mt-px border border-[#2b2f36] rounded bg-[#161a1e]">
      {/* Tabs */}
      <div className="flex border-b border-[#2b2f36]">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-medium ${
              activeTab === tab
                ? "text-[#f0b90b] border-b-2 border-[#f0b90b]"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {tab} {tab === "Positions" && `(${positions.length})`}
          </button>
        ))}

        {/* Total PnL Summary */}
        <div className="ml-auto flex items-center gap-4 px-4 text-xs">
          <span className="text-gray-500">
            Unrealized PnL:{" "}
            <span className={`font-mono ${parseFloat(totalPnL) >= 0 ? "text-green-400" : "text-red-400"}`}>
              ${parseFloat(totalPnL).toFixed(2)}
            </span>
          </span>
          <span className="text-gray-500">
            Equity: <span className="font-mono text-white">${parseFloat(equity).toFixed(2)}</span>
          </span>
        </div>
      </div>

      {activeTab === "Positions" && (
        <>
          <div className="grid grid-cols-10 gap-2 px-3 py-2 text-[10px] text-gray-500 border-b border-[#2b2f36]">
            <span>DIRECTION</span>
            <span>SIZE</span>
            <span>ENTRY PRICE</span>
            <span>MARK PRICE</span>
            <span>PNL (ROE%)</span>
            <span>LIQ. PRICE</span>
            <span>LEVERAGE</span>
            <span>SL</span>
            <span>TP</span>
            <span>ACTION</span>
          </div>

          <div className="divide-y divide-[#2b2f36] max-h-[200px] overflow-y-auto">
            {loading ? (
              <div className="px-3 py-4 text-xs text-gray-500 text-center">Loading...</div>
            ) : positions.length === 0 ? (
              <div className="px-3 py-4 text-xs text-gray-500 text-center">No open positions</div>
            ) : (
              positions.map((position) => {
                const pnl = getPositionPnL(position.position_id)
                const unrealizedPnl = pnl ? parseFloat(pnl.unrealized_pnl) : 0
                const isProfit = unrealizedPnl >= 0

                return (
                  <div
                    key={position.position_id}
                    className="grid grid-cols-10 gap-2 px-3 py-2 text-[10px] hover:bg-[#1e222d]"
                  >
                    <span className={`font-medium ${position.direction === "long" ? "text-green-400" : "text-red-400"}`}>
                      {position.direction.toUpperCase()}
                    </span>
                    <span className="text-gray-300 font-mono">{parseFloat(position.position_size).toFixed(4)}</span>
                    <span className="text-gray-300 font-mono">${parseFloat(position.entry_price).toFixed(1)}</span>
                    <span className="text-gray-300 font-mono">${currentPrice.toFixed(1)}</span>
                    <span className={`font-mono ${isProfit ? "text-green-400" : "text-red-400"}`}>
                      ${unrealizedPnl.toFixed(2)} ({pnl?.pnl_percentage || "0%"})
                    </span>
                    <span className="text-orange-400 font-mono">
                      ${position.liquidation_price ? parseFloat(position.liquidation_price).toFixed(1) : "--"}
                    </span>
                    <span className="text-gray-300">{position.leverage || "1"}x</span>
                    <span className="text-gray-300 font-mono">
                      {position.stop_loss_price ? `$${parseFloat(position.stop_loss_price).toFixed(1)}` : "--"}
                    </span>
                    <span className="text-gray-300 font-mono">
                      {position.profit_price ? `$${parseFloat(position.profit_price).toFixed(1)}` : "--"}
                    </span>
                    <button
                      onClick={() => handleClosePosition(position.position_id)}
                      disabled={closingId === position.position_id}
                      className="flex items-center justify-center text-red-400 hover:text-red-300 disabled:opacity-50"
                    >
                      {closingId === position.position_id ? "..." : <X className="w-3 h-3" />}
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </>
      )}

      {activeTab === "Trade History" && (
        <>
          <div className="grid grid-cols-7 gap-2 px-3 py-2 text-[10px] text-gray-500 border-b border-[#2b2f36]">
            <span>DIRECTION</span>
            <span>SIZE</span>
            <span>ENTRY</span>
            <span>CLOSE</span>
            <span>PNL</span>
            <span>REASON</span>
            <span>TIME</span>
          </div>
          <div className="divide-y divide-[#2b2f36] max-h-[200px] overflow-y-auto">
            {closedPositions.length === 0 ? (
              <div className="px-3 py-4 text-xs text-gray-500 text-center">No trade history</div>
            ) : (
              closedPositions.map((pos) => {
                const pnl = pos.profit_realized ? parseFloat(pos.profit_realized) : 0
                return (
                  <div key={pos.position_id} className="grid grid-cols-7 gap-2 px-3 py-2 text-[10px] hover:bg-[#1e222d]">
                    <span className={`font-medium ${pos.direction === "long" ? "text-green-400" : "text-red-400"}`}>
                      {pos.direction.toUpperCase()}
                    </span>
                    <span className="text-gray-300 font-mono">{parseFloat(pos.position_size).toFixed(4)}</span>
                    <span className="text-gray-300 font-mono">${parseFloat(pos.entry_price).toFixed(1)}</span>
                    <span className="text-gray-300 font-mono">
                      ${pos.close_price ? parseFloat(pos.close_price).toFixed(1) : "--"}
                    </span>
                    <span className={`font-mono ${pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                      ${pnl.toFixed(2)}
                    </span>
                    <span className="text-gray-500 capitalize">{pos.position_status}</span>
                    <span className="text-gray-500">
                      {pos.close_time ? new Date(pos.close_time).toLocaleTimeString() : "--"}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}
