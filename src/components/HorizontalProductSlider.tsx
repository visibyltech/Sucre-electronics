import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import type { Product } from '../types';
import { ProductCard } from './ProductCard';

interface HorizontalProductSliderProps {
  title: string;
  subtitle?: string;
  products: Product[];
  viewAllLink: string;
  viewAllLabel?: string;
}

export function HorizontalProductSlider({
  title,
  subtitle,
  products,
  viewAllLink,
  viewAllLabel = 'View All',
}: HorizontalProductSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef({ startX: 0, scrollLeft: 0, moved: false });

  const scrollByAmount = (direction: 'left' | 'right') => {
    const el = trackRef.current;
    if (!el) return;
    const distance = Math.min(el.clientWidth * 0.8, 560);
    el.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const el = trackRef.current;
    if (!el) return;
    if ((e.target as HTMLElement).closest('button, a')) return;
    setIsDragging(true);
    dragState.current = {
      startX: e.pageX - el.offsetLeft,
      scrollLeft: el.scrollLeft,
      moved: false,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !trackRef.current) return;
    e.preventDefault();
    const x = e.pageX - trackRef.current.offsetLeft;
    const walk = (x - dragState.current.startX) * 1.25;
    if (Math.abs(walk) > 6) dragState.current.moved = true;
    trackRef.current.scrollLeft = dragState.current.scrollLeft - walk;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  if (products.length === 0) return null;

  return (
    <section className="py-5 sm:py-7 border-b border-zinc-100 last:border-b-0">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 mb-3.5">
          <div className="min-w-0">
            <h2 className="font-display text-lg sm:text-2xl font-bold tracking-tight text-zinc-950 truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs sm:text-sm text-zinc-500 truncate mt-0.5">{subtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:flex items-center gap-1.5 mr-1">
              <button
                type="button"
                aria-label={`Scroll ${title} left`}
                onClick={() => scrollByAmount('left')}
                className="w-8 h-8 rounded-lg border border-zinc-300 bg-white text-zinc-800 flex items-center justify-center hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label={`Scroll ${title} right`}
                onClick={() => scrollByAmount('right')}
                className="w-8 h-8 rounded-lg border border-zinc-300 bg-white text-zinc-800 flex items-center justify-center hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <Link
              to={viewAllLink}
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-zinc-950 hover:text-[#B88D00] transition-colors whitespace-nowrap"
            >
              <span>{viewAllLabel}</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Link>
          </div>
        </div>

        <div
          ref={trackRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className={`flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-smooth pb-1.5 select-none ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab md:cursor-default'
          }`}
        >
          {products.map((product) => (
            <ProductCard key={product.id} product={product} compact />
          ))}
        </div>
      </div>
    </section>
  );
}
