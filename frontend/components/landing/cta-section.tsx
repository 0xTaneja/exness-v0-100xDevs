"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0d1117]">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white animate-in fade-in slide-in-from-bottom-4 duration-500">
          Ready to Trade Smarter?
        </h2>
        <p className="mt-6 text-lg text-gray-400 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-500 delay-100">
          Join the next generation of crypto traders. No KYC required, connect
          your wallet and start trading in seconds.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 animate-in fade-in slide-in-from-bottom-8 duration-500 delay-200">
          <Link href="/trade">
            <Button
              size="lg"
              className="bg-[#f0b90b] text-black hover:bg-[#d4a50b] font-semibold text-base px-10 h-14 gap-2"
            >
              Launch Terminal
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <Button
            size="lg"
            variant="outline"
            className="border-gray-700 text-white hover:bg-white/5 font-medium text-base px-10 h-14 bg-transparent"
          >
            Join Discord
          </Button>
        </div>
        <p className="mt-8 text-sm text-gray-600 animate-in fade-in duration-500 delay-300">
          No registration required. Connect wallet to start.
        </p>
      </div>
    </section>
  );
}
