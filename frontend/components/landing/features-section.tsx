"use client";

import {
  BarChart3,
  Shield,
  Zap,
  Globe,
  Wallet,
  LineChart,
} from "lucide-react";

const features = [
  {
    icon: BarChart3,
    title: "Advanced Charting",
    description:
      "Professional TradingView charts with 100+ indicators, multiple timeframes, and drawing tools for technical analysis.",
  },
  {
    icon: Zap,
    title: "Lightning Execution",
    description:
      "Sub-millisecond order execution with our high-performance matching engine. No slippage, no requotes.",
  },
  {
    icon: Shield,
    title: "Risk Management",
    description:
      "Built-in take profit, stop loss, and trailing stops. Position sizing tools and liquidation warnings.",
  },
  {
    icon: Globe,
    title: "Deep Liquidity",
    description:
      "Access deep order books with tight spreads across 100+ perpetual pairs with up to 100x leverage.",
  },
  {
    icon: Wallet,
    title: "Multi-Collateral",
    description:
      "Trade with ETH, BTC, USDC, or any supported asset as collateral. Cross-margin and isolated modes available.",
  },
  {
    icon: LineChart,
    title: "Portfolio Analytics",
    description:
      "Real-time PnL tracking, funding rate analysis, and comprehensive trade history with export options.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white animate-in fade-in slide-in-from-bottom-4 duration-500">
            Built for Professional Traders
          </h2>
          <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-500 delay-100">
            Every feature designed to give you an edge in the market
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group p-6 bg-[#161a1e] border border-[#2b2f36] rounded-lg hover:border-[#f0b90b]/30 hover:shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-bottom-8 duration-500"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-12 h-12 bg-[#f0b90b]/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#f0b90b]/20 transition-colors">
                <feature.icon className="w-6 h-6 text-[#f0b90b]" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
