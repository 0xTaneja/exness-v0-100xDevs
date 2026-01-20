"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

const tickers = [
  { symbol: "BTC", change: "+4.25%", price: "$42,805.25", positive: true },
  { symbol: "ETH", change: "+1.72%", price: "$2,546.41", positive: true },
  { symbol: "BNB", change: "-2.18%", price: "$295.90", positive: false },
  { symbol: "SOL", change: "+11.09%", price: "$90.9", positive: true },
  { symbol: "XRP", change: "+0.46%", price: "$0.5718", positive: true },
  { symbol: "AVAX", change: "+15.78%", price: "$35.42", positive: true },
  { symbol: "DOT", change: "-2.18%", price: "$7.59", positive: false },
  { symbol: "TRX", change: "+10.76%", price: "$0.10665", positive: true },
  { symbol: "MATIC", change: "-1.05%", price: "$0.8609", positive: false },
]

export function TickerBar() {
  return (
    <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-50 border-b border-gray-200 text-xs">
      <button className="p-1 hover:bg-gray-200 rounded">
        <ChevronLeft className="w-3 h-3" />
      </button>
      <div className="flex items-center gap-4 overflow-x-auto">
        {tickers.map((ticker) => (
          <div key={ticker.symbol} className="flex items-center gap-1 whitespace-nowrap">
            <span className="font-medium">{ticker.symbol}</span>
            <span className={ticker.positive ? "text-green-600" : "text-red-600"}>
              {ticker.change}
            </span>
            <span className="text-gray-600">{ticker.price}</span>
          </div>
        ))}
      </div>
      <button className="p-1 hover:bg-gray-200 rounded ml-auto">
        <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  )
}
