import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ShoppingBag,
  Zap,
  PiggyBank,
  CreditCard,
  Minus,
  Plus,
  Check,
  MessageCircle,
  Cpu,
} from 'lucide-react';
import type { Product } from '../types';
import { formatNaira, buildWhatsAppUrl } from '../lib/format';
import { useStore } from '../context/StoreContext';
import { BackBar } from '../components/Layout';
import { HorizontalProductSlider } from '../components/HorizontalProductSlider';
import { fetchProductBySlug } from '../lib/api';

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addToCart } = useStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    setActiveImgIdx(0);
    setQuantity(1);

    fetchProductBySlug(slug)
      .then(({ product: found, related: rel }) => {
        if (!found) {
          setNotFound(true);
          return;
        }
        setProduct(found);
        setRelated(rel);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-6 aspect-[4/3] rounded-2xl bg-zinc-100 animate-pulse" />
          <div className="lg:col-span-6 space-y-4">
            <div className="h-8 w-3/4 bg-zinc-100 rounded animate-pulse" />
            <div className="h-10 w-1/3 bg-zinc-100 rounded animate-pulse" />
            <div className="h-32 w-full bg-zinc-100 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-zinc-950">Product Not Found</h1>
        <p className="text-sm text-zinc-600">
          This product may have been removed or updated by our store team.
        </p>
        <Link
          to="/shop"
          className="inline-block px-5 py-2.5 rounded-lg bg-[#09090B] text-white text-sm font-semibold"
        >
          Return to Shop
        </Link>
      </div>
    );
  }

  const outOfStock = product.stock <= 0;
  const hasDiscount = Boolean(product.discountPrice && product.discountPrice < product.price);
  const activeImage = product.images[activeImgIdx] || product.images[0] || '';
  const specsEntries = Object.entries(product.specifications || {});

  const handleBuyNow = () => {
    if (outOfStock) return;
    addToCart(product, quantity);
    navigate('/checkout');
  };

  return (
    <div className="bg-white">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <BackBar label="Back" fallbackTo="/shop" />

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-xs text-zinc-500 mb-6 flex items-center gap-2 flex-wrap">
          <Link to="/" className="hover:text-zinc-950">Home</Link>
          <span>/</span>
          <Link to={`/category/${product.categorySlug}`} className="hover:text-zinc-950">
            {product.categoryName}
          </Link>
          <span>/</span>
          <span className="text-zinc-900 font-medium truncate">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* LEFT: Gallery */}
          <div className="lg:col-span-6 space-y-4 lg:sticky lg:top-24">
            <div className="aspect-[4/3] w-full rounded-2xl border border-zinc-200 bg-zinc-50 overflow-hidden flex items-center justify-center">
              {activeImage ? (
                <img
                  src={activeImage}
                  alt={product.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center text-zinc-400">
                  <Cpu className="w-12 h-12 mb-2" />
                  <span className="text-sm">{product.name}</span>
                </div>
              )}
            </div>

            {product.images.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImgIdx(idx)}
                    aria-label={`View product image ${idx + 1}`}
                    className={`w-20 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                      activeImgIdx === idx
                        ? 'border-[#F5C518] ring-2 ring-[#F5C518]/30'
                        : 'border-zinc-200 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`${product.name} view ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Contiguous Purchase Module */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                <span className="font-semibold text-zinc-800">{product.brand}</span>
                <span aria-hidden="true">·</span>
                <Link to={`/category/${product.categorySlug}`} className="hover:underline">
                  {product.categoryName}
                </Link>
                <span aria-hidden="true">·</span>
                <span className={outOfStock ? 'text-red-600 font-semibold' : 'text-emerald-700 font-semibold'}>
                  {product.availability}
                </span>
              </div>

              <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-zinc-950 leading-tight">
                {product.name}
              </h1>

              <div className="mt-4 flex items-baseline gap-3 flex-wrap">
                <span className="font-mono text-3xl font-bold text-zinc-950 tabular-nums">
                  {formatNaira(product.effectivePrice)}
                </span>
                {hasDiscount && (
                  <>
                    <span className="font-mono text-lg text-zinc-400 line-through tabular-nums">
                      {formatNaira(product.price)}
                    </span>
                    <span className="text-xs font-semibold text-emerald-700">
                      Save {formatNaira(product.price - product.effectivePrice)}
                    </span>
                  </>
                )}
              </div>
            </div>

            <p className="text-sm sm:text-base text-zinc-700 leading-relaxed">
              {product.description}
            </p>

            {/* Quantity & Primary Actions */}
            <div className="p-5 rounded-2xl border border-zinc-200 bg-zinc-50 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-900">Quantity</span>
                <div className="inline-flex items-center border border-zinc-300 rounded-lg bg-white">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    disabled={quantity <= 1 || outOfStock}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-10 h-10 flex items-center justify-center text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-mono text-sm font-semibold tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    disabled={quantity >= product.stock || outOfStock}
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    className="w-10 h-10 flex items-center justify-center text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={outOfStock}
                  onClick={() => addToCart(product, quantity)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3.5 min-h-[48px] rounded-lg border border-zinc-300 bg-white text-zinc-950 font-semibold text-sm hover:bg-zinc-100 transition-colors disabled:opacity-45 cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Add to Cart</span>
                </button>

                <button
                  type="button"
                  disabled={outOfStock}
                  onClick={handleBuyNow}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3.5 min-h-[48px] rounded-lg bg-[#09090B] text-white font-semibold text-sm hover:bg-zinc-800 transition-colors disabled:opacity-45 cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-[#F5C518]" />
                  <span>Buy Now — Pay Now</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={outOfStock}
                  onClick={() => navigate(`/save-to-buy?product=${encodeURIComponent(product.slug)}`)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 min-h-[46px] rounded-lg bg-[#F5C518] text-zinc-950 font-bold text-sm hover:bg-[#E0B00B] transition-colors disabled:opacity-45 cursor-pointer"
                >
                  <PiggyBank className="w-4 h-4" />
                  <span>Pay Small Small (30% Deposit)</span>
                </button>

                {product.bnplEligible ? (
                  <button
                    type="button"
                    disabled={outOfStock}
                    onClick={() =>
                      navigate(`/bnpl?product=${encodeURIComponent(product.slug)}&qty=${quantity}`)
                    }
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 min-h-[46px] rounded-lg border border-zinc-950 bg-white text-zinc-950 font-semibold text-sm hover:bg-zinc-950 hover:text-white transition-colors disabled:opacity-45 cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Buy Now Pay Later (Credibly)</span>
                  </button>
                ) : (
                  <a
                    href={buildWhatsAppUrl(
                      `Hello SUCRE ELECTRONICS, I want to enquire about ${product.name} (${formatNaira(
                        product.effectivePrice
                      )}).`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 min-h-[46px] rounded-lg border border-emerald-700 text-emerald-800 font-semibold text-sm hover:bg-emerald-50 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Ask on WhatsApp</span>
                  </a>
                )}
              </div>

              <div className="pt-2 border-t border-zinc-200 space-y-1.5 text-xs text-zinc-600">
                <p className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>Direct bank transfer to Union Bank or Zenith Bank</span>
                </p>
                <p className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>Same-day showroom pickup in Warri or delivery across Delta State</span>
                </p>
              </div>
            </div>

            {/* Specifications Table */}
            {specsEntries.length > 0 && (
              <div>
                <h2 className="font-display text-lg font-bold text-zinc-950 mb-3">
                  Technical Specifications
                </h2>
                <div className="border border-zinc-200 rounded-xl overflow-hidden divide-y divide-zinc-200">
                  {specsEntries.map(([key, value]) => (
                    <div
                      key={key}
                      className="grid grid-cols-12 px-4 py-3 text-sm bg-white odd:bg-zinc-50/60"
                    >
                      <span className="col-span-5 font-medium text-zinc-600">{key}</span>
                      <span className="col-span-7 font-medium text-zinc-950">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <HorizontalProductSlider
          title="Related Products"
          subtitle={`More options in ${product.categoryName}`}
          products={related}
          viewAllLink={`/category/${product.categorySlug}`}
        />
      )}
    </div>
  );
}
