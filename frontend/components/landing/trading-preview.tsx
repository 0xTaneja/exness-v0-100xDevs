"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const orderBookData = {
  asks: [
    { price: 91.66, size: 0.14, total: 8852.48 },
    { price: 91.04, size: 1029.98, total: 8852.34 },
    { price: 91.91, size: 1138.56, total: 7822.36 },
    { price: 91.87, size: 10.98, total: 6683.8 },
    { price: 91.6, size: 1147.8, total: 6672.82 },
  ],
  bids: [
    { price: 91.35, size: 1089.96, total: 113644 },
    { price: 91.25, size: 3.73, total: 4648 },
    { price: 91.1, size: 42.75, total: 42.75 },
    { price: 90.95, size: 30.21, total: 32.88 },
    { price: 90.9, size: 45.01, total: 12.76 },
  ],
};

const positions = [
  {
    coin: "ETH",
    leverage: "20x",
    size: "0.3000 ETH",
    value: "$614.55",
    entry: "$2,048.6",
    pnl: "-$4.23 (-12.1%)",
    pnlColor: "text-red-400",
  },
  {
    coin: "SOL",
    leverage: "10x",
    size: "2.4 ETH",
    value: "$849.12",
    entry: "$89.12",
    pnl: "+$0.43 (+1.2%)",
    pnlColor: "text-green-400",
  },
  {
    coin: "AVAX",
    leverage: "5x",
    size: "25.82 AVAX",
    value: "$1,230.67",
    entry: "$32.10",
    pnl: "+$15.03 (-0.1%)",
    pnlColor: "text-green-400",
  },
];

export function TradingPreview() {
  const [currentPrice, setCurrentPrice] = useState(90.93);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPrice((prev) => prev + (Math.random() - 0.5) * 0.1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      id="trading"
      className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0d1117]"
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white animate-in fade-in slide-in-from-bottom-4 duration-500">
            Powerful Trading Interface
          </h2>
          <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-500 delay-100">
            Everything you need in one seamless experience
          </p>
        </div>

        <div className="bg-[#161a1e] rounded-xl border border-[#2b2f36] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-700 delay-200">
          {/* Mini Terminal Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2b2f36] bg-[#1e222d]">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-[#f0b90b] rounded flex items-center justify-center">
                  <span className="text-black font-bold text-xs">X</span>
                </div>
                <span className="font-bold text-sm text-white">XTERMINAL</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-1 bg-[#f0b90b]/20 text-[#f0b90b] rounded font-medium">
                  SOL-USD
                </span>
                <span className="text-green-400">GAINER</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span>
                Mark:{" "}
                <span className="font-mono text-white">{currentPrice.toFixed(2)}</span>
              </span>
              <span>
                24H:{" "}
                <span className="text-red-400">-9.54%</span>
              </span>
              <span>
                Vol: <span className="font-mono text-white">$43.9M</span>
              </span>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-0">
            {/* Order Book */}
            <div className="border-r border-[#2b2f36] p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-gray-300">
                  Order Book
                </span>
                <span className="text-xs text-gray-600">Trade History</span>
              </div>
              <div className="space-y-1 text-xs font-mono">
                <div className="grid grid-cols-3 text-gray-500 mb-2">
                  <span>Price</span>
                  <span className="text-right">Size</span>
                  <span className="text-right">Total</span>
                </div>
                {orderBookData.asks.map((order, i) => (
                  <div
                    key={`ask-${i}`}
                    className="grid grid-cols-3 text-red-400 relative"
                  >
                    <div
                      className="absolute inset-0 bg-red-500/10"
                      style={{ width: `${(order.size / 1200) * 100}%` }}
                    />
                    <span className="relative">{order.price.toFixed(2)}</span>
                    <span className="relative text-right">
                      {order.size.toFixed(2)}
                    </span>
                    <span className="relative text-right text-gray-500">
                      {order.total.toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="py-2 text-center text-lg font-bold text-white bg-[#f0b90b]/10 rounded">
                  {currentPrice.toFixed(2)}
                </div>
                {orderBookData.bids.map((order, i) => (
                  <div
                    key={`bid-${i}`}
                    className="grid grid-cols-3 text-green-400 relative"
                  >
                    <div
                      className="absolute inset-0 bg-green-500/10"
                      style={{ width: `${(order.size / 1200) * 100}%` }}
                    />
                    <span className="relative">{order.price.toFixed(2)}</span>
                    <span className="relative text-right">
                      {order.size.toFixed(2)}
                    </span>
                    <span className="relative text-right text-gray-500">
                      {order.total.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Trading Panel */}
            <div className="border-r border-[#2b2f36] p-4">
              <div className="flex gap-2 mb-4">
                <button className="flex-1 py-2 bg-green-500 text-white text-sm font-medium rounded hover:bg-green-600 transition-colors">
                  BUY / LONG
                </button>
                <button className="flex-1 py-2 bg-[#1e222d] text-gray-400 text-sm font-medium rounded hover:bg-[#2b2f36] transition-colors">
                  SELL / SHORT
                </button>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Available to Trade</span>
                  <span className="font-mono text-white">8936</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Current Position</span>
                  <span className="font-mono text-white">0.0000 ETH</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Size</span>
                  <span className="font-mono font-bold text-white">304 SOL</span>
                </div>
                <div className="h-2 bg-[#2b2f36] rounded-full overflow-hidden">
                  <div className="h-full w-[43%] bg-green-500 rounded-full" />
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Order Value</span>
                  <span className="font-mono text-white">$28,771.50</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Margin Required</span>
                  <span className="font-mono text-white">$1,436.72</span>
                </div>
                <button className="w-full py-3 bg-[#f0b90b] text-black font-semibold rounded hover:bg-[#d4a50b] transition-colors mt-4">
                  PLACE ORDER
                </button>
              </div>
            </div>

            {/* Account Info */}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-[#f0b90b] rounded-full flex items-center justify-center">
                  <span className="text-black text-xs font-bold">$</span>
                </div>
                <span className="font-medium text-sm text-white">ACCOUNT</span>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Balance</span>
                  <span className="font-mono font-bold text-white">$14,987.12</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Unrealized PNL</span>
                  <span className="font-mono text-red-400">-$264.80</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Account Equity</span>
                  <span className="font-mono text-white">$14,487.12</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Cross Margin Ratio</span>
                  <span className="font-mono text-green-400">14.00%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Maintenance Margin</span>
                  <span className="font-mono text-white">$301.40</span>
                </div>
                <div className="pt-4 space-y-2">
                  <button className="w-full py-2 bg-[#f0b90b] text-black text-sm font-medium rounded hover:bg-[#d4a50b] transition-colors">
                    WITHDRAW
                  </button>
                  <button className="w-full py-2 bg-[#1e222d] text-gray-300 text-sm font-medium rounded hover:bg-[#2b2f36] transition-colors border border-[#2b2f36]">
                    DEPOSIT
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Positions */}
          <div className="border-t border-[#2b2f36] p-4">
            <div className="flex items-center gap-4 mb-3 text-xs">
              <span className="font-medium text-[#f0b90b]">Positions (3)</span>
              <span className="text-gray-600">Open Orders</span>
              <span className="text-gray-600">Trade History</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 border-b border-[#2b2f36]">
                    <th className="text-left py-2 font-medium">COIN</th>
                    <th className="text-left py-2 font-medium">SIZE</th>
                    <th className="text-left py-2 font-medium">VALUE</th>
                    <th className="text-left py-2 font-medium">ENTRY PRICE</th>
                    <th className="text-left py-2 font-medium">PNL (ROE %)</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((pos, i) => (
                    <tr key={i} className="border-b border-[#2b2f36]/50">
                      <td className="py-2 font-medium text-white">
                        {pos.coin}{" "}
                        <span className="text-gray-500">{pos.leverage}</span>
                      </td>
                      <td className="py-2 font-mono text-gray-300">{pos.size}</td>
                      <td className="py-2 font-mono text-gray-300">{pos.value}</td>
                      <td className="py-2 font-mono text-gray-300">{pos.entry}</td>
                      <td className={`py-2 font-mono ${pos.pnlColor}`}>
                        {pos.pnl}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="text-center mt-10">
          <Link href="/trade">
            <Button
              size="lg"
              className="bg-[#f0b90b] text-black hover:bg-[#d4a50b] font-semibold gap-2"
            >
              Open Full Terminal
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
