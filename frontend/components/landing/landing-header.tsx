"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled ? "bg-[#161a1e]/95 backdrop-blur-sm border-b border-[#2b2f36] shadow-lg" : "bg-transparent"
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#f0b90b] rounded flex items-center justify-center">
              <span className="text-black font-bold text-sm">X</span>
            </div>
            <span className="font-bold text-lg text-white">XTERMINAL</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</Link>
            <Link href="#trading" className="text-sm text-gray-400 hover:text-white transition-colors">Trading</Link>
            <Link href="#testimonials" className="text-sm text-gray-400 hover:text-white transition-colors">Testimonials</Link>
            <Link href="/trade" className="text-sm text-gray-400 hover:text-white transition-colors">Terminal</Link>
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/auth"><Button variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/5">Log In</Button></Link>
            <Link href="/auth"><Button className="bg-[#f0b90b] text-black hover:bg-[#d4a50b] font-medium">Start Trading</Button></Link>
          </div>
          <button className="md:hidden p-2" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
          </button>
        </div>
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[#2b2f36]">
            <nav className="flex flex-col gap-4">
              <Link href="#features" className="text-sm text-gray-400 hover:text-white">Features</Link>
              <Link href="#trading" className="text-sm text-gray-400 hover:text-white">Trading</Link>
              <Link href="/trade" className="text-sm text-gray-400 hover:text-white">Terminal</Link>
              <div className="flex flex-col gap-2 pt-4 border-t border-[#2b2f36]">
                <Link href="/auth"><Button className="w-full bg-[#f0b90b] text-black hover:bg-[#d4a50b]">Start Trading</Button></Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
