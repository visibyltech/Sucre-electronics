import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  ShoppingBag,
  User as UserIcon,
  Menu,
  X,
  ArrowLeft,
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  Shield,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import {
  BUSINESS_EMAIL,
  BUSINESS_LOCATION,
  DISPLAY_PHONE,
  LOGO_URL,
  buildWhatsAppUrl,
} from '../lib/format';

export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

export function BackBar({ label = 'Back', fallbackTo = '/shop' }: { label?: string; fallbackTo?: string }) {
  const navigate = useNavigate();
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallbackTo);
    }
  };
  return (
    <div className="mb-5">
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700 hover:text-zinc-950 transition-colors py-1.5 px-2 -ml-2 rounded-lg hover:bg-zinc-100 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{label}</span>
      </button>
    </div>
  );
}

export function Header() {
  const { cartCount, user, categories } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileSearchOpen(false);
  }, [location.pathname, location.search]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchTerm.trim();
    if (!q) {
      navigate('/shop');
      return;
    }
    navigate(`/search?q=${encodeURIComponent(q)}`);
    setMobileSearchOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#09090B] text-white border-b border-zinc-800">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 lg:gap-8">
        {/* Left: Official SUCRE ELECTRONICS Brand Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            aria-label="Open navigation menu"
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden w-10 h-10 -ml-2 flex items-center justify-center rounded-lg text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/" className="flex items-center shrink-0 focus:outline-none">
            <img
              src={LOGO_URL}
              alt="SUCRE ELECTRONICS"
              className="h-9 sm:h-10 w-auto object-contain rounded"
            />
          </Link>
        </div>

        {/* Center: Desktop Navigation + Search */}
        <div className="hidden lg:flex items-center gap-6 flex-1 min-w-0 justify-center">
          <nav className="flex items-center gap-6 text-sm font-medium text-zinc-200 shrink-0">
            <Link to="/shop" className="hover:text-[#F5C518] transition-colors whitespace-nowrap">
              Shop
            </Link>
            <Link to="/save-to-buy" className="hover:text-[#F5C518] transition-colors whitespace-nowrap">
              Save to Buy
            </Link>
            <Link to="/bnpl" className="hover:text-[#F5C518] transition-colors whitespace-nowrap">
              Buy Now Pay Later
            </Link>
            <Link to="/payment-confirmation" className="hover:text-[#F5C518] transition-colors whitespace-nowrap">
              Upload Receipt
            </Link>
            <Link to="/contact" className="hover:text-[#F5C518] transition-colors whitespace-nowrap">
              Contact
            </Link>
          </nav>

          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm">
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search TVs, fridges, generators..."
              aria-label="Search products"
              className="w-full h-10 pl-4 pr-10 rounded-lg bg-[#141418] border border-zinc-700 text-sm text-white placeholder:text-zinc-400 focus:outline-none focus:border-[#F5C518] transition-colors"
            />
            <button
              type="submit"
              aria-label="Submit search"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-md text-zinc-300 hover:text-[#F5C518] cursor-pointer"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            aria-label="Toggle product search"
            onClick={() => setMobileSearchOpen((v) => !v)}
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-lg text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <Search className="w-5 h-5" />
          </button>

          {user?.role === 'admin' && (
            <Link
              to="/admin"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-zinc-800 text-[#F5C518] hover:bg-zinc-700 transition-colors whitespace-nowrap"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin</span>
            </Link>
          )}

          <Link
            to="/account"
            aria-label="Customer account"
            className="inline-flex items-center gap-2 px-2.5 sm:px-3 h-10 rounded-lg text-zinc-200 hover:bg-zinc-800 hover:text-[#F5C518] transition-colors whitespace-nowrap"
          >
            <UserIcon className="w-5 h-5 shrink-0" />
            <span className="hidden sm:inline text-sm font-medium max-w-[110px] truncate">
              {user ? user.fullName.split(' ')[0] : 'Account'}
            </span>
          </Link>

          <Link
            to="/cart"
            aria-label={`Shopping cart with ${cartCount} items`}
            className="relative inline-flex items-center gap-2 px-3 h-10 rounded-lg bg-[#F5C518] text-zinc-950 font-semibold text-sm hover:bg-[#E0B00B] transition-colors whitespace-nowrap"
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Cart</span>
            <span className="font-mono text-xs font-bold tabular-nums bg-zinc-950 text-[#F5C518] px-1.5 py-0.5 rounded">
              {cartCount}
            </span>
          </Link>
        </div>
      </div>

      {/* Mobile Expandable Search Bar */}
      {mobileSearchOpen && (
        <div className="lg:hidden border-t border-zinc-800 bg-[#141418] px-4 py-3">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="search"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search TVs, freezers, AC, generators..."
              className="w-full h-11 pl-4 pr-12 rounded-lg bg-[#09090B] border border-zinc-700 text-sm text-white placeholder:text-zinc-400 focus:outline-none focus:border-[#F5C518]"
            />
            <button
              type="submit"
              aria-label="Search"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-md bg-[#F5C518] text-zinc-950"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 w-[85%] max-w-sm bg-[#09090B] text-white h-full overflow-y-auto border-r border-zinc-800 flex flex-col">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <img src={LOGO_URL} alt="SUCRE ELECTRONICS" className="h-8 w-auto object-contain" />
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setMobileMenuOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-lg text-zinc-300 hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-6 flex-1">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-zinc-400 px-2 pb-1">Navigation</p>
                {[
                  { to: '/', label: 'Home' },
                  { to: '/shop', label: 'All Products' },
                  { to: '/save-to-buy', label: 'Save to Buy — Pay Small Small' },
                  { to: '/bnpl', label: 'Buy Now Pay Later (Credibly)' },
                  { to: '/payment-confirmation', label: 'Upload Payment Receipt' },
                  { to: '/cart', label: `Shopping Cart (${cartCount})` },
                  { to: '/account', label: user ? 'My Account & Orders' : 'Sign In / Register' },
                  { to: '/about', label: 'About Us' },
                  { to: '/contact', label: 'Contact Us' },
                ].map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="block px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-100 hover:bg-zinc-800 hover:text-[#F5C518] transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="block px-3 py-2.5 rounded-lg text-sm font-semibold text-[#F5C518] bg-zinc-900"
                  >
                    Admin Dashboard
                  </Link>
                )}
              </div>

              <div className="border-t border-zinc-800 pt-4">
                <p className="text-xs font-semibold text-zinc-400 px-2 pb-2">Categories</p>
                <div className="grid grid-cols-1 gap-1">
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      to={`/category/${cat.slug}`}
                      className="px-3 py-2 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-800 bg-[#141418] text-xs text-zinc-300 space-y-2">
              <p className="font-semibold text-white">Warri Showroom Support</p>
              <a href={`tel:${DISPLAY_PHONE}`} className="flex items-center gap-2 hover:text-[#F5C518]">
                <Phone className="w-3.5 h-3.5 text-[#F5C518]" />
                <span>{DISPLAY_PHONE}</span>
              </a>
              <a
                href={buildWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[#F5C518] font-medium"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Chat on WhatsApp</span>
              </a>
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="bg-[#09090B] text-zinc-300 border-t border-zinc-800 mt-16">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand Column */}
          <div className="space-y-4">
            <Link to="/" className="inline-block">
              <img
                src={LOGO_URL}
                alt="SUCRE ELECTRONICS"
                className="h-10 w-auto object-contain rounded"
              />
            </Link>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Trusted retail showroom for genuine home appliances, televisions, power generators,
              refrigerators, and smart devices in Delta State.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#F5C518] mt-0.5 shrink-0" />
                <span>{BUSINESS_LOCATION}</span>
              </div>
              <a
                href={`tel:${DISPLAY_PHONE}`}
                className="flex items-center gap-2.5 hover:text-[#F5C518] transition-colors"
              >
                <Phone className="w-4 h-4 text-[#F5C518] shrink-0" />
                <span className="font-mono">{DISPLAY_PHONE}</span>
              </a>
              <a
                href={`mailto:${BUSINESS_EMAIL}`}
                className="flex items-center gap-2.5 hover:text-[#F5C518] transition-colors"
              >
                <Mail className="w-4 h-4 text-[#F5C518] shrink-0" />
                <span>{BUSINESS_EMAIL}</span>
              </a>
            </div>
          </div>

          {/* Shop Links */}
          <div>
            <h3 className="font-display text-sm font-semibold text-white mb-4">Storefront</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/" className="hover:text-[#F5C518] transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/shop" className="hover:text-[#F5C518] transition-colors">
                  Shop
                </Link>
              </li>
              <li>
                <Link to="/shop" className="hover:text-[#F5C518] transition-colors">
                  All Products
                </Link>
              </li>
              <li>
                <Link to="/categories" className="hover:text-[#F5C518] transition-colors">
                  Categories
                </Link>
              </li>
              <li>
                <Link to="/cart" className="hover:text-[#F5C518] transition-colors">
                  Shopping Cart
                </Link>
              </li>
              <li>
                <Link to="/account" className="hover:text-[#F5C518] transition-colors">
                  My Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Payments & Financing */}
          <div>
            <h3 className="font-display text-sm font-semibold text-white mb-4">
              Flexible Ownership
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/save-to-buy" className="hover:text-[#F5C518] transition-colors">
                  Save to Buy
                </Link>
              </li>
              <li>
                <Link to="/bnpl" className="hover:text-[#F5C518] transition-colors">
                  Buy Now Pay Later
                </Link>
              </li>
              <li>
                <Link to="/payment-info" className="hover:text-[#F5C518] transition-colors">
                  Payment Information
                </Link>
              </li>
              <li>
                <Link to="/payment-confirmation" className="hover:text-[#F5C518] transition-colors">
                  Upload Transfer Receipt
                </Link>
              </li>
              <li>
                <Link to="/delivery" className="hover:text-[#F5C518] transition-colors">
                  Delivery Information
                </Link>
              </li>
            </ul>
          </div>

          {/* Company & Legal */}
          <div>
            <h3 className="font-display text-sm font-semibold text-white mb-4">Company & Help</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/about" className="hover:text-[#F5C518] transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-[#F5C518] transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-[#F5C518] transition-colors">
                  Frequently Asked Questions
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-[#F5C518] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-[#F5C518] transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <a
                  href={buildWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[#F5C518] font-medium hover:underline"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp Support</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} SUCRE ELECTRONICS · Warri, Delta State, Nigeria. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/payment-info" className="hover:text-zinc-300 transition-colors">
              Union Bank · Zenith Bank
            </Link>
            <span aria-hidden="true">·</span>
            <Link to="/admin" className="hover:text-zinc-300 transition-colors">
              Store Portal
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function FloatingWhatsApp() {
  return (
    <a
      href={buildWhatsAppUrl()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with SUCRE ELECTRONICS on WhatsApp"
      className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2.5 px-4 py-3 rounded-full bg-[#25D366] text-zinc-950 font-semibold text-sm shadow-xl hover:bg-[#20BD5A] transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518]"
    >
      <MessageCircle className="w-5 h-5 fill-current" />
      <span className="hidden sm:inline">WhatsApp Us</span>
    </a>
  );
}

export function ToastBanner() {
  const { toast, dismissToast } = useStore();
  if (!toast) return null;

  const isError = toast.tone === 'error';
  return (
    <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50">
      <div
        role="status"
        className={`flex items-start gap-3 p-4 rounded-xl shadow-2xl border ${
          isError
            ? 'bg-red-950 text-white border-red-800'
            : 'bg-[#09090B] text-white border-zinc-700'
        }`}
      >
        {isError ? (
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
        ) : (
          <CheckCircle2 className="w-5 h-5 text-[#F5C518] shrink-0 mt-0.5" />
        )}
        <p className="text-sm leading-snug flex-1">{toast.text}</p>
        <button
          type="button"
          onClick={dismissToast}
          aria-label="Dismiss message"
          className="text-zinc-400 hover:text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
