"use client"

import { Header } from "@/components/trading/header"
import { TradingPairHeader } from "@/components/trading/trading-pair-header"
import { ChartSection } from "@/components/trading/chart-section"
import { OrderBook } from "@/components/trading/order-book"
import { TradingPanel } from "@/components/trading/trading-panel"
import { PositionsPanel } from "@/components/trading/positions-panel"

export default function TradingTerminal() {
  return (
    <div className="h-screen flex flex-col bg-[#0b0e11] overflow-hidden">
      <Header />
      <div className="px-3 py-1.5 border-b border-[#2b2f36]">
        <TradingPairHeader />
      </div>
      <div className="flex gap-px flex-1 min-h-0 p-1">
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 min-h-0">
            <ChartSection />
          </div>
          <PositionsPanel />
        </div>
        <div className="flex gap-px h-full">
          <OrderBook />
          <TradingPanel />
        </div>
      </div>
    </div>
  )
}
