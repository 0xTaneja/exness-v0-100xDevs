"use client"

import { useEffect, useState, useRef, useCallback } from "react"

const WS_URL = "ws://localhost:3003/ws"
const RECONNECT_BASE = 1000
const RECONNECT_MAX = 30000

export interface TickerData {
  bestbid: string
  bestask: string
  bidquantity: string
  askquantity: string
  ticker: string
}

export interface OrderBookLevel {
  price: string
  quantity: string
}

export interface OrderBookData {
  bids: OrderBookLevel[]
  asks: OrderBookLevel[]
}

// Merge incremental depth deltas into accumulated orderbook state
function mergeOrderbookDelta(
  current: { bids: Map<string, string>; asks: Map<string, string> },
  bids: string[][],
  asks: string[][],
) {
  for (const [price, qty] of bids) {
    if (qty === "0.00000" || qty === "0" || parseFloat(qty) === 0) {
      current.bids.delete(price)
    } else {
      current.bids.set(price, qty)
    }
  }
  for (const [price, qty] of asks) {
    if (qty === "0.00000" || qty === "0" || parseFloat(qty) === 0) {
      current.asks.delete(price)
    } else {
      current.asks.set(price, qty)
    }
  }
}

function snapshotOrderbook(state: { bids: Map<string, string>; asks: Map<string, string> }): OrderBookData {
  const bids = Array.from(state.bids.entries())
    .map(([price, quantity]) => ({ price, quantity }))
    .sort((a, b) => parseFloat(b.price) - parseFloat(a.price))
    .slice(0, 20)

  const asks = Array.from(state.asks.entries())
    .map(([price, quantity]) => ({ price, quantity }))
    .sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
    .slice(0, 20)

  return { bids, asks }
}

export function useWebSocket() {
  const [ticker, setTicker] = useState<TickerData | null>(null)
  const [orderbook, setOrderbook] = useState<OrderBookData | null>(null)
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectDelay = useRef(RECONNECT_BASE)
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null)
  const unmounted = useRef(false)

  // Accumulated orderbook from depth deltas
  const obState = useRef({ bids: new Map<string, string>(), asks: new Map<string, string>() })
  const obThrottle = useRef<NodeJS.Timeout | null>(null)

  const flushOrderbook = useCallback(() => {
    if (obState.current.bids.size > 0 || obState.current.asks.size > 0) {
      setOrderbook(snapshotOrderbook(obState.current))
    }
  }, [])

  const connect = useCallback(() => {
    if (unmounted.current) return

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      reconnectDelay.current = RECONNECT_BASE
      // Reset orderbook on new connection
      obState.current = { bids: new Map(), asks: new Map() }
      setOrderbook(null)
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        const type = msg.type
        const data = msg.data

        if (!data) return

        if (type === "ticker") {
          setTicker({
            bestbid: data.b || data.bestbid || "0",
            bestask: data.a || data.bestask || "0",
            bidquantity: data.B || data.bidquantity || "0",
            askquantity: data.A || data.askquantity || "0",
            ticker: data.s || data.ticker || "",
          })
        } else if (type === "orderbook") {
          // Backpack depth uses short keys: b=bids, a=asks
          const bids: string[][] = data.b || data.bids || []
          const asks: string[][] = data.a || data.asks || []
          mergeOrderbookDelta(obState.current, bids, asks)

          // Throttle orderbook renders to ~4/sec
          if (!obThrottle.current) {
            obThrottle.current = setTimeout(() => {
              obThrottle.current = null
              flushOrderbook()
            }, 250)
          }
        }
      } catch (e) {
        console.error("Failed to parse WS message", e)
      }
    }

    ws.onclose = () => {
      setConnected(false)
      wsRef.current = null
      scheduleReconnect()
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [flushOrderbook])

  const scheduleReconnect = useCallback(() => {
    if (unmounted.current) return
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current)

    const delay = reconnectDelay.current
    reconnectTimer.current = setTimeout(() => {
      reconnectDelay.current = Math.min(delay * 2, RECONNECT_MAX)
      connect()
    }, delay)
  }, [connect])

  useEffect(() => {
    unmounted.current = false
    connect()

    return () => {
      unmounted.current = true
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (obThrottle.current) clearTimeout(obThrottle.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [connect])

  return { ticker, orderbook, connected }
}
