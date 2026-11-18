import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ShieldCheck,
  Wallet,
  Headphones,
  Truck,
  PiggyBank,
  CreditCard,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { Product } from '../types';
import { DISPLAY_PHONE, buildWhatsAppUrl, formatNaira } from '../lib/format';
import { HorizontalProductSlider } from '../components/HorizontalProductSlider';
import { INITIAL_PRODUCTS } from '../data/catalog';
import { fetchProducts } from '../lib/api';

const HERO_SLIDES = [
  {
    image: '/src/assets/images/prod_qled_tv_1794993277815.jpg',
    label: '4K QLED & Smart TVs',
    slug: 'samsung-65-q60d-4k-qled-smart-tv',
  },
  {
    image: '/src/assets/images/prod_refrigerator_1794993277897.jpg',
    label: 'Inverter Refrigerators',
    slug: 'haier-thermocool-518l-side-by-side-refrigerator',
  },
  {
    image: '/src/assets/images/prod_air_conditioner_1794993279009.jpg',
    label: 'Split Inverter Air Conditioners',
    slug: 'hisense-1-5hp-inverter-split-ac',
  },
  {
    image: '/src/assets/images/prod_washing_machine_1794993278894.jpg',
    label: 'Front-Load Washing Machines',
    slug: 'lg-9kg-front-load-washing-machine',
  },
  {
    image: '/src/assets/images/prod_generator_1794993279565.jpg',
    label: 'Copper-Coil Power Generators',
    slug: 'sumec-firman-6-5kva-key-start-generator',
  },
  {
    image: '/src/assets/images/prod_kitchen_appliances_1794993281365.jpg',
    label: 'Digital Kitchen Appliances',
    slug: 'kenwood-30l-microwave-air-fryer-bundle',
  },
  {
    image: '/src/assets/images/prod_sound_system_1794993279759.jpg',
    label: 'Dolby Atmos Sound Systems',
    slug: 'jbl-bar-500-dolby-atmos-soundbar',
  },
  {
    image: '/src/assets/images/prod_chest_freezer_1794993279013.jpg',
    label: '100-Hour Deep Freezers',
    slug: 'haier-thermocool-420l-chest-deep-freezer',
  },
];

export function HomePage() {
  const { categories } = useStore();
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [loading, setLoading] = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);

  useEffect(() => {
    fetchProducts()
      .then((list) => {
        if (list.length > 0) setProducts(list);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIdx((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const featuredProducts = products.filter((p) => p.isFeatured);
  const bestSellers = products.filter((p) => p.isBestSeller);
  const newArrivals = products.filter((p) => p.isNewArrival);
  const specialDeals = products.filter(
    (p) => p.isSpecialDeal || (p.discountPrice && p.discountPrice < p.price)
  );

  const currentSlide = HERO_SLIDES[slideIdx];
  const matchedSlideProduct = products.find((p) => p.slug === currentSlide.slug);

  return (
    <div className="bg-white">
      {/* 1. COMPACT FULL-WIDTH PRODUCT SLIDESHOW HERO */}
      <section className="relative bg-[#09090B] text-white overflow-hidden min-h-[250px] sm:h-[320px] lg:h-[370px] flex items-center">
        {/* Background Product Slideshow */}
        {HERO_SLIDES.map((slide, idx) => (
          <div
            key={slide.slug}
            aria-hidden={idx !== slideIdx}
            className={`absolute inset-0 transition-opacity duration-700 ease-out ${
              idx === slideIdx ? 'opacity-100 z-0' : 'opacity-0 pointer-events-none'
            }`}
          >
            <img
              src={slide.image}
              alt={slide.label}
              className="w-full h-full object-cover object-center scale-[1.01]"
            />
          </div>
        ))}

        {/* Contrast Scrim for Crisp Readability */}
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#09090B]/92 via-[#09090B]/65 to-[#09090B]/25" />
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#09090B]/80 via-transparent to-[#09090B]/30" />

        {/* Minimal Hero Content */}
        <div className="relative z-20 max-w-[1360px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-0 flex flex-col justify-center">
          <div className="max-w-xl">
            <p className="text-xs font-semibold text-[#F5C518] tracking-wide mb-1.5">
              Warri, Delta State · SUCRE ELECTRONICS
            </p>
            <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-white leading-[1.12]">
              {currentSlide.label}
            </h1>
            {matchedSlideProduct && (
              <p className="mt-1 text-xs sm:text-sm text-zinc-200 font-mono tabular-nums">
                From {formatNaira(matchedSlideProduct.effectivePrice)} ·{' '}
                <Link
                  to={`/product/${matchedSlideProduct.slug}`}
                  className="text-[#F5C518] font-sans font-semibold hover:underline"
                >
                  View item
                </Link>
              </p>
            )}

            <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
              <Link
                to="/shop"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[42px] rounded-lg bg-[#F5C518] text-zinc-950 font-bold text-xs sm:text-sm hover:bg-[#E0B00B] transition-colors whitespace-nowrap"
              >
                <span>Shop All Electronics</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/save-to-buy"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[42px] rounded-lg border border-white/30 bg-black/50 backdrop-blur-xs text-white font-semibold text-xs sm:text-sm hover:border-[#F5C518] hover:text-[#F5C518] transition-colors whitespace-nowrap"
              >
                <PiggyBank className="w-4 h-4 text-[#F5C518]" />
                <span>Save to Buy — 30% Deposit</span>
              </Link>
            </div>
          </div>

          {/* Slideshow Controls (Bottom Right) */}
          <div className="hidden sm:flex items-center gap-2 absolute bottom-4 right-6 lg:right-8 z-20">
            <button
              type="button"
              aria-label="Previous featured slide"
              onClick={() => setSlideIdx((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
              className="w-8 h-8 rounded-lg bg-black/60 border border-white/20 text-white flex items-center justify-center hover:border-[#F5C518] cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 px-2">
              {HERO_SLIDES.map((s, i) => (
                <button
                  key={s.slug}
                  type="button"
                  aria-label={`Show ${s.label}`}
                  onClick={() => setSlideIdx(i)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    i === slideIdx ? 'w-5 bg-[#F5C518]' : 'w-1.5 bg-white/40 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              aria-label="Next featured slide"
              onClick={() => setSlideIdx((prev) => (prev + 1) % HERO_SLIDES.length)}
              className="w-8 h-8 rounded-lg bg-black/60 border border-white/20 text-white flex items-center justify-center hover:border-[#F5C518] cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 2. COMPACT HORIZONTAL CATEGORY BAR (Moves Products Up Immediately) */}
      <section className="py-4 bg-zinc-50 border-b border-zinc-200">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <h2 className="font-display text-sm sm:text-base font-bold text-zinc-950">
              Shop by Category
            </h2>
            <Link
              to="/categories"
              className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-900 hover:text-[#B88D00] whitespace-nowrap"
            >
              <span>All Categories</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 snap-x snap-mandatory">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/category/${cat.slug}`}
                className="group w-[112px] sm:w-[128px] shrink-0 snap-start bg-white border border-zinc-200 rounded-lg overflow-hidden hover:border-zinc-950 transition-all"
              >
                <div className="h-[62px] sm:h-[70px] w-full bg-zinc-100 overflow-hidden">
                  {cat.image_url && (
                    <img
                      src={cat.image_url}
                      alt={cat.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                </div>
                <div className="px-2 py-1.5">
                  <h3 className="font-display text-[11px] sm:text-xs font-semibold text-zinc-950 truncate">
                    {cat.name}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 3. HORIZONTAL SWIPEABLE PRODUCT SECTIONS (Visible Right Away) */}
      {loading ? (
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex gap-3 overflow-hidden">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="w-[196px] sm:w-[224px] h-[270px] shrink-0 rounded-xl bg-zinc-100 animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <HorizontalProductSlider
            title="Featured Products"
            subtitle="Flagship 4K TVs, inverter cooling, and home essentials"
            products={featuredProducts}
            viewAllLink="/shop?filter=featured"
          />

          <HorizontalProductSlider
            title="Best Sellers"
            subtitle="Top-selling appliances across Warri & Delta State"
            products={bestSellers}
            viewAllLink="/shop?filter=best_seller"
          />

          <HorizontalProductSlider
            title="New Arrivals"
            subtitle="Latest arrivals now available in stock"
            products={newArrivals}
            viewAllLink="/shop?filter=new_arrival"
          />

          <HorizontalProductSlider
            title="Special Deals & Discounts"
            subtitle="Direct showroom savings on select models"
            products={specialDeals}
            viewAllLink="/shop?filter=special_deal"
          />
        </>
      )}

      {/* 4. SAVE TO BUY — PAY SMALL SMALL PROMOTION */}
      <section className="py-8 sm:py-10 bg-[#09090B] text-white">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 space-y-3">
              <p className="text-xs font-semibold text-[#F5C518] tracking-wide">
                Save to Buy — Pay Small Small
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white [text-wrap:balance]">
                Reserve Any Appliance Today with 30% Initial Deposit
              </h2>
              <p className="text-sm text-zinc-300 leading-relaxed max-w-2xl">
                Lock in current prices without paying everything at once. Choose weekly or monthly
                installments across 2 to 6 months and receive your item once fully settled.
              </p>
              <div className="pt-1 flex flex-wrap gap-3">
                <Link
                  to="/save-to-buy"
                  className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[42px] rounded-lg bg-[#F5C518] text-zinc-950 font-bold text-xs sm:text-sm hover:bg-[#E0B00B] transition-colors"
                >
                  <span>Start Save to Buy</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/payment-confirmation"
                  className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[42px] rounded-lg border border-zinc-700 text-white font-semibold text-xs sm:text-sm hover:border-[#F5C518] transition-colors"
                >
                  <span>Upload Receipt</span>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-[#141418] border border-zinc-800">
                <p className="font-mono text-xl font-bold text-[#F5C518] tabular-nums">30%</p>
                <p className="text-xs sm:text-sm font-semibold text-white mt-0.5">Minimum Deposit</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#141418] border border-zinc-800">
                <p className="font-mono text-xl font-bold text-[#F5C518] tabular-nums">2–6 mo</p>
                <p className="text-xs sm:text-sm font-semibold text-white mt-0.5">Weekly or Monthly</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#141418] border border-zinc-800">
                <p className="font-mono text-xl font-bold text-[#F5C518] tabular-nums">0%</p>
                <p className="text-xs sm:text-sm font-semibold text-white mt-0.5">Hidden Charges</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#141418] border border-zinc-800">
                <p className="font-mono text-xl font-bold text-[#F5C518] tabular-nums">100%</p>
                <p className="text-xs sm:text-sm font-semibold text-white mt-0.5">Paid Release</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. BUY NOW PAY LATER — CREDIBLY PROMOTION */}
      <section className="py-8 bg-zinc-50 border-y border-zinc-200">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-600">
                <CreditCard className="w-4 h-4 text-[#B88D00]" />
                <span>Buy Now Pay Later · Powered by Credibly</span>
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-zinc-950">
                Finance Eligible Electronics Through Credibly
              </h2>
              <p className="text-sm text-zinc-600">
                Apply for Credibly financing on eligible televisions, refrigerators, freezers,
                generators, and smartphones.
              </p>
            </div>
            <Link
              to="/bnpl"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] rounded-lg bg-[#09090B] text-white font-semibold text-sm hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0"
            >
              <span>Explore Credibly BNPL</span>
              <ArrowRight className="w-4 h-4 text-[#F5C518]" />
            </Link>
          </div>
        </div>
      </section>

      {/* 6. TRUST SECTION */}
      <section className="py-8 sm:py-10 bg-white">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl border border-zinc-200 bg-zinc-50/70 space-y-2">
              <ShieldCheck className="w-5 h-5 text-[#B88D00]" />
              <h3 className="font-display text-sm font-bold text-zinc-950">Secure Shopping</h3>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                Factory-sealed appliances with verifiable manufacturer warranties.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-zinc-200 bg-zinc-50/70 space-y-2">
              <Wallet className="w-5 h-5 text-[#B88D00]" />
              <h3 className="font-display text-sm font-bold text-zinc-950">Flexible Payments</h3>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                Union Bank & Zenith Bank transfer, Save to Buy, or Credibly BNPL.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-zinc-200 bg-zinc-50/70 space-y-2">
              <Truck className="w-5 h-5 text-[#B88D00]" />
              <h3 className="font-display text-sm font-bold text-zinc-950">
                Warri Delivery & Pickup
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                Same-day pickup in Warri or delivery across Delta State.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-zinc-200 bg-zinc-50/70 space-y-2">
              <Headphones className="w-5 h-5 text-[#B88D00]" />
              <h3 className="font-display text-sm font-bold text-zinc-950">Customer Support</h3>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                Call{' '}
                <a href={`tel:${DISPLAY_PHONE}`} className="font-mono font-semibold text-zinc-950 hover:underline">
                  {DISPLAY_PHONE}
                </a>{' '}
                or{' '}
                <a
                  href={buildWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-zinc-950 underline"
                >
                  WhatsApp us
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
