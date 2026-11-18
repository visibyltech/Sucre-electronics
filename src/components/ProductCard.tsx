import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Zap, PiggyBank, Cpu } from 'lucide-react';
import type { Product } from '../types';
import { formatNaira } from '../lib/format';
import { useStore } from '../context/StoreContext';

interface ProductCardProps {
  product: Product;
  compact?: boolean;
}

export function ProductCard({ product, compact = false }: ProductCardProps) {
  const { addToCart } = useStore();
  const navigate = useNavigate();
  const [imgFailed, setImgFailed] = useState(false);

  const hasDiscount = Boolean(product.discountPrice && product.discountPrice < product.price);
  const outOfStock = product.stock <= 0;

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    addToCart(product, 1);
    navigate('/checkout');
  };

  const handlePaySmallSmall = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    navigate(`/save-to-buy?product=${encodeURIComponent(product.slug)}`);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    addToCart(product, 1);
  };

  return (
    <article
      className={`group flex flex-col justify-between bg-white border border-zinc-200/90 rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-zinc-300 ${
        compact ? 'w-[268px] sm:w-[292px] shrink-0 snap-start' : 'w-full'
      }`}
    >
      <Link to={`/product/${product.slug}`} className="block focus:outline-none">
        <div className="relative aspect-[4/3] w-full bg-zinc-100 overflow-hidden">
          {!imgFailed && product.images[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              referrerPolicy="no-referrer"
              loading="lazy"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 text-zinc-500 p-4 text-center">
              <Cpu className="w-8 h-8 mb-2 text-zinc-400" />
              <span className="text-xs font-medium text-zinc-600 line-clamp-2">{product.name}</span>
            </div>
          )}
        </div>

        <div className="p-4 pb-2">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1.5 truncate">
            <span className="font-medium text-zinc-700">{product.brand}</span>
            <span aria-hidden="true">·</span>
            <span className={outOfStock ? 'text-red-600 font-medium' : 'text-emerald-700 font-medium'}>
              {product.availability}
            </span>
          </div>

          <h3 className="font-display text-[15px] font-semibold text-zinc-950 leading-snug line-clamp-2 min-h-[2.6rem] group-hover:text-zinc-700 transition-colors">
            {product.name}
          </h3>

          <div className="mt-2.5 flex items-baseline gap-2 flex-wrap">
            <span className="font-mono text-base font-semibold text-zinc-950 tabular-nums">
              {formatNaira(product.effectivePrice)}
            </span>
            {hasDiscount && (
              <span className="font-mono text-xs text-zinc-400 line-through tabular-nums">
                {formatNaira(product.price)}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-zinc-500 tabular-nums">
            30% deposit: {formatNaira(Math.ceil(product.effectivePrice * 0.3))}
          </p>
        </div>
      </Link>

      <div className="p-4 pt-2 flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={outOfStock}
            onClick={handleAddToCart}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[40px] text-xs font-semibold rounded-lg border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 active:scale-[0.99] transition-all disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
            <span>Add to Cart</span>
          </button>

          <button
            type="button"
            disabled={outOfStock}
            onClick={handleBuyNow}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[40px] text-xs font-semibold rounded-lg bg-[#09090B] text-white hover:bg-zinc-800 active:scale-[0.99] transition-all disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-[#F5C518] shrink-0" />
            <span>Buy Now</span>
          </button>
        </div>

        <button
          type="button"
          disabled={outOfStock}
          onClick={handlePaySmallSmall}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[38px] text-xs font-semibold rounded-lg bg-[#F5C518] text-zinc-950 hover:bg-[#E0B00B] active:scale-[0.99] transition-all disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
        >
          <PiggyBank className="w-3.5 h-3.5 shrink-0" />
          <span>Pay Small Small</span>
        </button>
      </div>
    </article>
  );
}
