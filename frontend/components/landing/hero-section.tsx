"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp } from "lucide-react";

export function HeroSection() {
  const chartRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = chartRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;
    let offset = 0;
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 10; i++) {
        ctx.beginPath();
        ctx.moveTo(0, (height / 10) * i);
        ctx.lineTo(width, (height / 10) * i);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 2;
      const points: { x: number; y: number }[] = [];
      for (let i = 0; i <= width; i += 4) {
        const y = height / 2 + Math.sin((i + offset) * 0.02) * 40 + Math.sin((i + offset) * 0.01) * 20 + Math.cos((i + offset) * 0.03) * 15;
        points.push({ x: i, y });
        if (i === 0) ctx.moveTo(i, y); else ctx.lineTo(i, y);
      }
      ctx.stroke();
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "rgba(34, 197, 94, 0.2)");
      gradient.addColorStop(1, "rgba(34, 197, 94, 0)");
      ctx.beginPath();
      ctx.moveTo(0, height);
      points.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.lineTo(width, height);
      ctx.fillStyle = gradient;
      ctx.fill();
      offset += 1;
      requestAnimationFrame(animate);
    };
    animate();
  }, []);

  return (
    <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <canvas ref={chartRef} width={1200} height={400} className="absolute bottom-0 left-0 right-0 w-full opacity-30" />
      </div>
      <div className="relative max-w-7xl mx-auto">
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-full mb-8">
            <span className="w-2 h-2 bg-[#22c55e] rounded-full animate-pulse" />
            <span className="text-sm text-gray-400">Now supporting 100+ trading pairs with up to 100x leverage</span>
            <ArrowRight className="w-4 h-4 text-gray-500" />
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white max-w-4xl leading-tight">Professional Crypto Trading Terminal</h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-400 max-w-2xl">Trade perpetuals with advanced charting, deep liquidity, and institutional-grade execution. Built for traders who demand the best.</p>
          <div className="flex flex-col sm:flex-row items-center gap-4 mt-10">
            <Link href="/auth">
              <Button size="lg" className="bg-[#f0b90b] text-black hover:bg-[#d4a50b] font-semibold text-base px-8 h-12 gap-2">Launch Terminal <ArrowRight className="w-4 h-4" /></Button>
            </Link>
            <Button size="lg" variant="outline" className="border-gray-700 text-white hover:bg-white/5 font-medium text-base px-8 h-12 bg-transparent">View Documentation</Button>
          </div>
          <div className="flex items-center gap-8 mt-12">
            <div className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-[#22c55e]" /><span className="text-sm text-gray-400">$2.5B+ Daily Volume</span></div>
            <div className="w-px h-4 bg-gray-700" />
            <span className="text-sm text-gray-400">150K+ Traders</span>
            <div className="w-px h-4 bg-gray-700" />
            <span className="text-sm text-gray-400">0.01% Taker Fee</span>
          </div>
        </div>
      </div>
    </section>
  );
}
