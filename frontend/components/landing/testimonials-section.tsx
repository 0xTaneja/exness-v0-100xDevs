"use client";

import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Alex Chen",
    role: "Professional Trader",
    content:
      "XTerminal's execution speed is unmatched. I've tried every major DEX and CEX - nothing comes close to the responsiveness and depth of liquidity here.",
    rating: 5,
  },
  {
    name: "Sarah Mitchell",
    role: "Crypto Fund Manager",
    content:
      "The risk management tools are exactly what our fund needed. Cross-margin, position tracking, and the clean interface make managing multiple positions effortless.",
    rating: 5,
  },
  {
    name: "Marcus Wei",
    role: "Day Trader",
    content:
      "Finally, a terminal that doesn't crash during volatility. Been trading SOL and ETH perps here for 6 months - the uptime and fills are consistently excellent.",
    rating: 5,
  },
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white animate-in fade-in slide-in-from-bottom-4 duration-500">
            Trusted by Traders Worldwide
          </h2>
          <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-500 delay-100">
            Join thousands of traders who have made XTerminal their home
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.name}
              className="p-6 bg-[#161a1e] border border-[#2b2f36] rounded-lg hover:border-[#2b2f36]/80 hover:shadow-lg transition-shadow animate-in fade-in slide-in-from-bottom-8 duration-500"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-[#f0b90b] text-[#f0b90b]"
                  />
                ))}
              </div>
              <p className="text-gray-300 mb-6 leading-relaxed">
                &ldquo;{testimonial.content}&rdquo;
              </p>
              <div>
                <div className="font-semibold text-white">
                  {testimonial.name}
                </div>
                <div className="text-sm text-gray-500">
                  {testimonial.role}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
