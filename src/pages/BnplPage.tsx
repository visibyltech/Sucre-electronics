import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CreditCard, Info, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { Order, Product } from '../types';
import { formatBnplStatus, formatNaira, buildWhatsAppUrl } from '../lib/format';
import { BackBar } from '../components/Layout';

export function BnplPage() {
  const [searchParams] = useSearchParams();
  const initialProductSlug = searchParams.get('product') || '';
  const initialQty = Math.max(1, Number(searchParams.get('qty') || 1));
  const returnedOrderRef = searchParams.get('orderRef') || '';

  const { user, token, showToast } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedSlug, setSelectedSlug] = useState(initialProductSlug);
  const [quantity, setQuantity] = useState(initialQty);
  const [crediblyConfigured, setCrediblyConfigured] = useState<boolean | null>(null);

  const [customerName, setCustomerName] = useState(user?.fullName || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [deliveryAddress, setDeliveryAddress] = useState(user?.address || '');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [bnplOrder, setBnplOrder] = useState<Order | null>(null);
  const [serverNote, setServerNote] = useState('');

  useEffect(() => {
    fetch('/api/bnpl/status')
      .then((r) => r.json())
      .then((d) => setCrediblyConfigured(Boolean(d.configured)));

    fetch('/api/products?bnpl=1')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.products)) {
          const eligible = d.products.filter((p: Product) => p.stock > 0);
          setProducts(eligible);
          if (!selectedSlug && eligible.length > 0) setSelectedSlug(eligible[0].slug);
        }
      });
  }, []);

  useEffect(() => {
    if (returnedOrderRef) {
      fetch(`/api/orders/lookup/${encodeURIComponent(returnedOrderRef)}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.order) setBnplOrder(d.order);
        });
    }
  }, [returnedOrderRef]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.slug === selectedSlug) || products[0] || null,
    [products, selectedSlug]
  );

  const subtotal = selectedProduct ? selectedProduct.effectivePrice * quantity : 0;
  const deliveryFee = deliveryMethod === 'pickup' ? 0 : subtotal >= 800000 ? 0 : 5000;
  const totalAmount = subtotal + deliveryFee;

  const handleInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setServerNote('');
    if (!selectedProduct) return;

    if (!customerName.trim() || !customerPhone.trim() || !customerEmail.trim()) {
      setError('Please enter your full name, phone number, and email address.');
      return;
    }

    setSubmitting(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch('/api/bnpl/initiate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          productId: selectedProduct.id,
          quantity,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim(),
          deliveryMethod,
          deliveryAddress: deliveryAddress.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not initiate Credibly BNPL.');
        return;
      }

      if (data.configured && data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }

      setBnplOrder(data.order);
      setServerNote(data.message || '');
      showToast(`BNPL application ${data.order.order_ref} saved.`, 'info');
    } catch {
      setError('Network error while connecting to Credibly financing service.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      <BackBar label="Back" fallbackTo="/" />

      <div className="bg-[#09090B] text-white rounded-2xl p-6 sm:p-10">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#F5C518] mb-2">
          <CreditCard className="w-4 h-4" />
          <span>BUY NOW PAY LATER · CREDIBLY</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-white">
          Credibly Equipment & Appliance Financing
        </h1>
        <p className="mt-2 text-sm sm:text-base text-zinc-300 max-w-2xl leading-relaxed">
          Apply to finance eligible SUCRE ELECTRONICS products through Credibly. Financing
          decisions and credit checks are handled securely through Credibly’s live merchant API.
        </p>
      </div>

      {crediblyConfigured === false && (
        <div className="p-5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-sm text-amber-950">
          <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Credibly Live Merchant Credentials Pending</p>
            <p className="text-amber-900 mt-0.5">
              The Credibly financing gateway integration is ready on our backend. Until live
              Credibly API keys are activated by the store administrator, submitting an application
              records your BNPL request without simulating any fake loan approval. You can also
              use <Link to="/save-to-buy" className="underline font-semibold">Save to Buy</Link> immediately.
            </p>
          </div>
        </div>
      )}

      {bnplOrder && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-[#B88D00] shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-xl font-bold text-zinc-950">
                BNPL Order Reference: <span className="font-mono">{bnplOrder.order_ref}</span>
              </h2>
              <p className="text-sm text-zinc-700 mt-1">
                Provider: Credibly · Financing Status:{' '}
                <span className="font-semibold text-zinc-950">
                  {formatBnplStatus(bnplOrder.bnpl_status)}
                </span>
              </p>
              {serverNote && <p className="text-sm text-zinc-600 mt-2">{serverNote}</p>}
            </div>
          </div>

          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              to={`/save-to-buy?product=${encodeURIComponent(selectedProduct?.slug || '')}`}
              className="px-4 py-2.5 rounded-lg bg-[#F5C518] text-zinc-950 font-semibold text-xs hover:bg-[#E0B00B]"
            >
              Switch to Save to Buy (30% Deposit)
            </Link>
            <a
              href={buildWhatsAppUrl(
                `Hello SUCRE ELECTRONICS, I submitted Credibly BNPL order ${bnplOrder.order_ref}. Please assist.`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-lg border border-zinc-300 text-zinc-900 font-semibold text-xs hover:bg-zinc-50"
            >
              Contact Warri Team on WhatsApp
            </a>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <form onSubmit={handleInitiate} className="lg:col-span-7 bg-white border border-zinc-200 rounded-2xl p-6 space-y-5">
          <h2 className="font-display text-xl font-bold text-zinc-950">
            1. Select Eligible Product & Enter Applicant Details
          </h2>

          {error && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                BNPL-Eligible Product *
              </label>
              <select
                value={selectedProduct?.slug || ''}
                onChange={(e) => setSelectedSlug(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 bg-white text-sm"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.slug}>
                    {p.name} — {formatNaira(p.effectivePrice)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Quantity</label>
              <input
                type="number"
                min={1}
                max={selectedProduct?.stock || 5}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Full Name *</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Phone Number *</label>
              <input
                type="tel"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Email Address *</label>
              <input
                type="email"
                required
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Delivery Option</label>
              <select
                value={deliveryMethod}
                onChange={(e) => setDeliveryMethod(e.target.value as 'delivery' | 'pickup')}
                className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 bg-white text-sm"
              >
                <option value="delivery">Home Delivery (Delta State)</option>
                <option value="pickup">Warri Showroom Pickup (Free)</option>
              </select>
            </div>
          </div>

          {deliveryMethod === 'delivery' && (
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Delivery Address *
              </label>
              <input
                type="text"
                required
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Street address, Warri / Delta State"
                className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 text-sm"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !selectedProduct}
            className="w-full py-3.5 min-h-[48px] rounded-xl bg-[#09090B] text-white font-bold text-sm hover:bg-zinc-800 transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <span>{submitting ? 'Connecting to Credibly...' : 'Continue to Credibly Financing'}</span>
            <ArrowRight className="w-4 h-4 text-[#F5C518]" />
          </button>
        </form>

        <aside className="lg:col-span-5 bg-zinc-50 border border-zinc-200 rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-zinc-950">Financing Amount Summary</h2>
          {selectedProduct && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 pb-3 border-b border-zinc-200">
                {selectedProduct.images[0] && (
                  <img
                    src={selectedProduct.images[0]}
                    alt={selectedProduct.name}
                    className="w-20 h-16 rounded-lg object-cover bg-white border border-zinc-200 shrink-0"
                  />
                )}
                <div>
                  <p className="font-semibold text-zinc-950">{selectedProduct.name}</p>
                  <p className="text-xs text-zinc-500">Qty: {quantity}</p>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">Product Subtotal</span>
                <span className="font-mono font-semibold tabular-nums">{formatNaira(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">Delivery Fee</span>
                <span className="font-mono font-semibold tabular-nums">
                  {deliveryFee === 0 ? 'Free' : formatNaira(deliveryFee)}
                </span>
              </div>
              <div className="flex justify-between pt-3 border-t border-zinc-200 items-baseline">
                <span className="font-display font-bold text-zinc-950">Total Financing Amount</span>
                <span className="font-mono text-2xl font-bold text-zinc-950 tabular-nums">
                  {formatNaira(totalAmount)}
                </span>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
