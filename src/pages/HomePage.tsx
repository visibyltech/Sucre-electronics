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
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { Product } from '../types';
import { DISPLAY_PHONE, buildWhatsAppUrl } from '../lib/format';
import { HorizontalProductSlider } from '../components/HorizontalProductSlider';
import tvSlide from '../assets/images/prod_qled_tv_1794993277815.jpg';
import fridgeSlide from '../assets/images/prod_refrigerator_1794993277897.jpg';
import freezerSlide from '../assets/images/prod_chest_freezer_1794993279013.jpg';
import acSlide from '../assets/images/prod_air_conditioner_1794993279009.jpg';
import generatorSlide from '../assets/images/prod_generator_1794993279565.jpg';
import washerSlide from '../assets/images/prod_washing_machine_1794993278894.jpg';
import soundSlide from '../assets/images/prod_sound_system_1794993279759.jpg';
import kitchenSlide from '../assets/images/prod_kitchen_appliances_1794993281365.jpg';

const heroSlides = [
  { image: tvSlide, label: 'Premium televisions' },
  { image: fridgeSlide, label: 'Modern refrigerators' },
  { image: freezerSlide, label: 'Chest freezers' },
  { image: acSlide, label: 'Air conditioners' },
  { image: generatorSlide, label: 'Generators' },
  { image: washerSlide, label: 'Washing machines' },
  { image: soundSlide, label: 'Sound systems' },
  { image: kitchenSlide, label: 'Kitchen appliances' },
];

function HeroProductSlideshow() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setActive((current) => (current + 1) % heroSlides.length), 4000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <div className="relative w-full h-[220px] sm:h-[300px] lg:h-[390px] rounded-xl overflow-hidden bg-[#151515]">
      {heroSlides.map((slide, index) => (
        <img key={slide.label} src={slide.image} alt={slide.label} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${index === active ? 'opacity-100' : 'opacity-0'}`} loading={index === 0 ? 'eager' : 'lazy'} />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10 pointer-events-none" />
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
        <span className="text-white text-xs sm:text-sm font-semibold drop-shadow-md">{heroSlides[active].label}</span>
        <div className="flex gap-1.5">{heroSlides.map((slide, index) => <button key={slide.label} type="button" aria-label={`Show ${slide.label}`} onClick={() => setActive(index)} className={`h-2 rounded-full transition-all ${index === active ? 'w-5 bg-[#F5C518]' : 'w-2 bg-white/70'}`} />)}</div>
      </div>
    </div>
  );
}

export function HomePage() {
  const { categories } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.products)) setProducts(d.products);
      })
      .finally(() => setLoading(false));
  }, []);

  const featuredProducts = products.filter((p) => p.isFeatured);
  const bestSellers = products.filter((p) => p.isBestSeller);
  const newArrivals = products.filter((p) => p.isNewArrival);
  const specialDeals = products.filter((p) => p.isSpecialDeal || (p.discountPrice && p.discountPrice < p.price));

  return (
    <div className="bg-white">
      {/* 1. COMPACT HERO: actions then product slideshow */}
      <section className="bg-[#09090B] text-white overflow-hidden">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-5 sm:pt-7 sm:pb-7">
          <p className="text-[11px] sm:text-xs font-medium text-[#F5C518] tracking-wide mb-2">Warri, Delta State · Genuine Electronics Showroom</p>
          <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white leading-tight mb-3">Electronics for Every Home</h1>
          <div className="flex flex-row items-center gap-2 mb-4">
            <Link to="/shop" className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-lg bg-[#F5C518] text-zinc-950 font-bold text-xs sm:text-sm hover:bg-[#E0B00B] transition-colors whitespace-nowrap"><span>Shop Electronics</span><ArrowRight className="w-3.5 h-3.5" /></Link>
            <Link to="/save-to-buy" className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-lg border border-zinc-700 bg-[#141418] text-white font-semibold text-xs sm:text-sm hover:border-[#F5C518] hover:text-[#F5C518] transition-colors whitespace-nowrap"><PiggyBank className="w-3.5 h-3.5 text-[#F5C518]" /><span>Pay Small Small</span></Link>
          </div>
          <HeroProductSlideshow />
        </div>
      </section>

      {/* 2. PRODUCT CATEGORIES (Horizontal Swipe on Mobile + Clean Grid on Desktop) */}
      <section className="py-5 sm:py-6 bg-zinc-50 border-b border-zinc-200">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4 mb-3">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-zinc-950">
                Shop by Category
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                Explore all 11 electronics and home appliance departments
              </p>
            </div>
            <Link
              to="/categories"
              className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-950 hover:text-[#B88D00] whitespace-nowrap"
            >
              <span>All Categories</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="flex lg:grid lg:grid-cols-6 gap-3.5 overflow-x-auto no-scrollbar pb-2 lg:pb-0 snap-x snap-mandatory">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/category/${cat.slug}`}
                className="group w-[126px] lg:w-auto shrink-0 snap-start bg-white border border-zinc-200 rounded-xl overflow-hidden hover:border-zinc-950 hover:shadow-md transition-all"
              >
                <div className="aspect-[4/3] w-full bg-zinc-100 overflow-hidden">
                  {cat.image_url && (
                    <img
                      src={cat.image_url}
                      alt={cat.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-display text-sm font-semibold text-zinc-950 truncate">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5 tabular-nums">
                    {cat.product_count ?? 0} {(cat.product_count ?? 0) === 1 ? 'item' : 'items'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 3. HORIZONTAL SWIPEABLE PRODUCT SECTIONS */}
      {loading ? (
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-80 rounded-xl bg-zinc-100 animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <HorizontalProductSlider
            title="Featured Products"
            subtitle="Showroom flagship televisions, inverter cooling systems, and home essentials"
            products={featuredProducts}
            viewAllLink="/shop?filter=featured"
          />

          <HorizontalProductSlider
            title="Best Sellers"
            subtitle="Most requested appliances across Warri and Delta State households"
            products={bestSellers}
            viewAllLink="/shop?filter=best_seller"
          />

          {/* SAVE TO BUY — PAY SMALL SMALL PROMOTION */}
          <section className="py-10 sm:py-12 bg-[#09090B] text-white">
            <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7 space-y-4">
                  <p className="text-xs font-semibold text-[#F5C518] tracking-wide">
                    Save to Buy — Pay Small Small
                  </p>
                  <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-white [text-wrap:balance]">
                    Reserve Any Appliance Today with 30% Initial Deposit
                  </h2>
                  <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-2xl">
                    Lock in current prices without paying everything at once. Pick your product,
                    choose weekly or monthly installments across 2 to 6 months, track every payment
                    online, and collect or receive delivery once your balance reaches zero.
                  </p>
                  <div className="pt-2 flex flex-wrap gap-3">
                    <Link
                      to="/save-to-buy"
                      className="inline-flex items-center gap-2 px-5 py-3 min-h-[44px] rounded-lg bg-[#F5C518] text-zinc-950 font-bold text-sm hover:bg-[#E0B00B] transition-colors"
                    >
                      <span>Start a Save to Buy Plan</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                      to="/payment-confirmation"
                      className="inline-flex items-center gap-2 px-5 py-3 min-h-[44px] rounded-lg border border-zinc-700 text-white font-semibold text-sm hover:border-[#F5C518] transition-colors"
                    >
                      <span>Upload Installment Receipt</span>
                    </Link>
                  </div>
                </div>

                <div className="lg:col-span-5 grid grid-cols-2 gap-3.5">
                  <div className="p-4 rounded-xl bg-[#141418] border border-zinc-800">
                    <p className="font-mono text-2xl font-bold text-[#F5C518] tabular-nums">30%</p>
                    <p className="text-sm font-semibold text-white mt-1">Minimum Deposit</p>
                    <p className="text-xs text-zinc-400 mt-1">Reserves stock & price immediately</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#141418] border border-zinc-800">
                    <p className="font-mono text-2xl font-bold text-[#F5C518] tabular-nums">2–6 mo</p>
                    <p className="text-sm font-semibold text-white mt-1">Flexible Duration</p>
                    <p className="text-xs text-zinc-400 mt-1">Weekly or monthly schedule</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#141418] border border-zinc-800">
                    <p className="font-mono text-2xl font-bold text-[#F5C518] tabular-nums">0%</p>
                    <p className="text-sm font-semibold text-white mt-1">Hidden Charges</p>
                    <p className="text-xs text-zinc-400 mt-1">Transparent breakdown upfront</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#141418] border border-zinc-800">
                    <p className="font-mono text-2xl font-bold text-[#F5C518] tabular-nums">100%</p>
                    <p className="text-sm font-semibold text-white mt-1">Paid Release</p>
                    <p className="text-xs text-zinc-400 mt-1">Delivered upon full settlement</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <HorizontalProductSlider
            title="New Arrivals"
            subtitle="Latest 4K displays, energy-saving inverter units, and smart gadgets in stock"
            products={newArrivals}
            viewAllLink="/shop?filter=new_arrival"
          />

          <HorizontalProductSlider
            title="Special Deals & Discounts"
            subtitle="Direct showroom price reductions on select appliances while stock lasts"
            products={specialDeals}
            viewAllLink="/shop?filter=special_deal"
          />
        </>
      )}

      {/* BUY NOW PAY LATER — CREDIBLY PROMOTION */}
      <section className="py-10 sm:py-12 bg-zinc-50 border-y border-zinc-200">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 sm:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-600">
                <CreditCard className="w-4 h-4 text-[#B88D00]" />
                <span>Buy Now Pay Later · Powered by Credibly</span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-zinc-950 [text-wrap:balance]">
                Take Home Eligible Appliances Now and Pay Later via Credibly
              </h2>
              <p className="text-sm sm:text-base text-zinc-600 leading-relaxed">
                Select any BNPL-eligible television, refrigerator, freezer, generator, or
                smartphone and apply directly through Credibly’s financing workflow.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <Link
                to="/bnpl"
                className="inline-flex items-center gap-2 px-6 py-3.5 min-h-[48px] rounded-lg bg-[#09090B] text-white font-semibold text-sm hover:bg-zinc-800 transition-colors whitespace-nowrap"
              >
                <span>Explore Credibly BNPL</span>
                <ArrowRight className="w-4 h-4 text-[#F5C518]" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST SECTION */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950">
              Why Customers Across Delta State Choose SUCRE ELECTRONICS
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-6 rounded-xl border border-zinc-200 bg-zinc-50/70 space-y-2.5">
              <ShieldCheck className="w-6 h-6 text-[#B88D00]" />
              <h3 className="font-display text-base font-bold text-zinc-950">
                Genuine Factory Warranties
              </h3>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Every unit is brand-new, factory-sealed, and verified with official manufacturer
                warranty coverage before dispatch.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-zinc-200 bg-zinc-50/70 space-y-2.5">
              <Wallet className="w-6 h-6 text-[#B88D00]" />
              <h3 className="font-display text-base font-bold text-zinc-950">
                3 Flexible Payment Paths
              </h3>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Pay immediately via Union Bank or Zenith Bank, build towards ownership with Save to
                Buy, or apply via Credibly BNPL.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-zinc-200 bg-zinc-50/70 space-y-2.5">
              <Truck className="w-6 h-6 text-[#B88D00]" />
              <h3 className="font-display text-base font-bold text-zinc-950">
                Warri Delivery & Pickup
              </h3>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Same-day showroom pickup in Warri, reliable home delivery across Delta State, and
                free delivery on orders from ₦800,000.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-zinc-200 bg-zinc-50/70 space-y-2.5">
              <Headphones className="w-6 h-6 text-[#B88D00]" />
              <h3 className="font-display text-base font-bold text-zinc-950">
                Direct Showroom Support
              </h3>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Speak directly with our Warri team on{' '}
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
                  WhatsApp
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
