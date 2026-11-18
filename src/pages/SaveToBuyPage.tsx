import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PiggyBank, CheckCircle2, Lock, Copy, Check, Search, Upload } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { Product, SaveToBuyPlan } from '../types';
import { formatDate, formatNaira } from '../lib/format';
import { BackBar } from '../components/Layout';
import { ReceiptUploadForm } from '../components/ReceiptUploadForm';
import {
  createSaveToBuyResilient,
  fetchProducts,
  getLocalSavedPlans,
  lookupRefResilient,
} from '../lib/api';

export function SaveToBuyPage() {
  const [searchParams] = useSearchParams();
  const initialProductSlug = searchParams.get('product') || '';
  const { user, token, paymentConfig, showToast } = useStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedSlug, setSelectedSlug] = useState(initialProductSlug);
  const [depositPercent, setDepositPercent] = useState(30);
  const [durationMonths, setDurationMonths] = useState(3);
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>('monthly');

  const [customerName, setCustomerName] = useState(user?.fullName || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [deliveryAddress, setDeliveryAddress] = useState(user?.address || '');

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [activePlan, setActivePlan] = useState<SaveToBuyPlan | null>(null);
  const [myPlans, setMyPlans] = useState<SaveToBuyPlan[]>([]);
  const [lookupRef, setLookupRef] = useState('');
  const [uploadingForPlan, setUploadingForPlan] = useState<SaveToBuyPlan | null>(null);
  const [copiedBank, setCopiedBank] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts().then((list) => {
      const inStock = list.filter((p) => p.stock > 0);
      setProducts(inStock);
      if (!selectedSlug && inStock.length > 0) {
        setSelectedSlug(inStock[0].slug);
      }
    });
  }, []);

  useEffect(() => {
    if (initialProductSlug) setSelectedSlug(initialProductSlug);
  }, [initialProductSlug]);

  const loadMyPlans = async () => {
    if (token) {
      try {
        const res = await fetch('/api/my/save-to-buy', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const ct = res.headers.get('content-type') || '';
        if (res.ok && ct.includes('application/json')) {
          const data = await res.json();
          setMyPlans(data.plans || []);
          return;
        }
      } catch {
        // fall through to local plans
      }
    }
    setMyPlans(getLocalSavedPlans());
  };

  useEffect(() => {
    loadMyPlans();
  }, [token]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.slug === selectedSlug) || products[0] || null,
    [products, selectedSlug]
  );

  const calc = useMemo(() => {
    if (!selectedProduct) return null;
    const total = selectedProduct.effectivePrice;
    const initialDeposit = Math.ceil((total * depositPercent) / 100);
    const remaining = total - initialDeposit;
    const count = frequency === 'weekly' ? durationMonths * 4 : durationMonths;
    const perInstallment = Math.ceil(remaining / count);
    return { total, initialDeposit, remaining, count, perInstallment };
  }, [selectedProduct, depositPercent, durationMonths, frequency]);

  const banks = paymentConfig?.bankAccounts || [
    { id: 'union', bankName: 'Union Bank', accountName: 'SUCRE ELECTRONICS', accountNumber: '0180490612' },
    { id: 'zenith', bankName: 'Zenith Bank', accountName: 'SUCRE ELECTRONICS', accountNumber: '1016639318' },
  ];

  const handleCopy = async (acct: string, bankName: string) => {
    try {
      await navigator.clipboard.writeText(acct);
      setCopiedBank(bankName);
      showToast(`${bankName} account number copied.`);
      setTimeout(() => setCopiedBank(null), 2000);
    } catch {
      showToast(`Account number: ${acct}`, 'info');
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedProduct) return;
    if (!customerName.trim() || !customerPhone.trim() || !customerEmail.trim()) {
      setError('Full name, phone number, and email are required.');
      return;
    }

    setCreating(true);
    try {
      const result = await createSaveToBuyResilient(
        {
          productId: selectedProduct.id,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim(),
          deliveryAddress: deliveryAddress.trim(),
          initialDepositPercent: depositPercent,
          durationMonths,
          frequency,
        },
        token
      );
      if (!result.ok || !result.plan) {
        setError(result.error || 'Could not create Save to Buy plan.');
        return;
      }

      setActivePlan(result.plan);
      setUploadingForPlan(result.plan);
      showToast(`Save to Buy Plan ${result.plan.plan_ref} created!`);
      loadMyPlans();
    } catch {
      setError('Network error while creating Save to Buy plan.');
    } finally {
      setCreating(false);
    }
  };

  const handleLookupPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupRef.trim()) return;
    const found = await lookupRefResilient(lookupRef);
    if (!found || !found.plan_ref) {
      showToast('Plan reference not found.', 'error');
      return;
    }
    setActivePlan(found);
    setUploadingForPlan(null);
  };

  const renderPlanCard = (plan: SaveToBuyPlan) => {
    const pct = plan.total_price > 0 ? Math.min(100, Math.round((plan.amount_paid / plan.total_price) * 100)) : 0;
    const isCompleted = plan.outstanding_balance <= 0 && plan.release_authorized === 1;
    return (
      <div key={plan.id} className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
          <div>
            <p className="font-mono text-xs font-semibold text-[#B88D00]">{plan.plan_ref}</p>
            <h3 className="font-display text-xl font-bold text-zinc-950 mt-0.5">{plan.product_name}</h3>
            <p className="text-xs text-zinc-500 mt-1">
              {plan.duration_months} months · {plan.frequency} installments · Started {formatDate(plan.created_at)}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs text-zinc-500">Release Status</p>
            <p className={`text-sm font-bold ${isCompleted ? 'text-emerald-700' : 'text-zinc-900'}`}>
              {isCompleted ? 'Paid in Full — Release Authorized' : 'Reserved — Release After 100% Payment'}
            </p>
          </div>
        </div>

        {/* Payment Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-zinc-700">Payment Progress ({pct}%)</span>
            <span className="font-mono font-semibold text-zinc-950 tabular-nums">
              {formatNaira(plan.amount_paid)} / {formatNaira(plan.total_price)}
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-zinc-100 overflow-hidden">
            <div
              className="h-full bg-[#F5C518] transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-3 pt-2 text-xs sm:text-sm">
            <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200">
              <p className="text-zinc-500">Amount Paid</p>
              <p className="font-mono font-bold text-emerald-700 tabular-nums mt-0.5">
                {formatNaira(plan.amount_paid)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200">
              <p className="text-zinc-500">Outstanding</p>
              <p className="font-mono font-bold text-zinc-950 tabular-nums mt-0.5">
                {formatNaira(plan.outstanding_balance)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200">
              <p className="text-zinc-500">Initial Deposit ({plan.initial_deposit_percent}%)</p>
              <p className="font-mono font-bold text-zinc-950 tabular-nums mt-0.5">
                {formatNaira(plan.initial_deposit_amount)}
              </p>
            </div>
          </div>
        </div>

        {/* Installment Schedule */}
        <div>
          <h4 className="text-xs font-semibold text-zinc-600 mb-2">Installment Schedule</h4>
          <div className="border border-zinc-200 rounded-xl overflow-hidden divide-y divide-zinc-200 max-h-60 overflow-y-auto">
            {plan.schedule.map((step) => (
              <div key={step.step} className="flex items-center justify-between px-4 py-2.5 text-xs sm:text-sm bg-white">
                <div>
                  <span className="font-semibold text-zinc-950">{step.label}</span>
                  <span className="text-zinc-500 ml-2">Due {step.dueDate}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-semibold tabular-nums">{formatNaira(step.amount)}</span>
                  <span className={step.paid ? 'text-emerald-700 font-semibold' : 'text-zinc-500'}>
                    {step.paid ? 'Paid' : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {!isCompleted && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setUploadingForPlan(uploadingForPlan?.id === plan.id ? null : plan)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#09090B] text-white text-xs font-semibold hover:bg-zinc-800 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-[#F5C518]" />
              <span>
                {uploadingForPlan?.id === plan.id
                  ? 'Hide Receipt Upload'
                  : 'Upload Deposit / Installment Receipt'}
              </span>
            </button>
          </div>
        )}

        {uploadingForPlan?.id === plan.id && (
          <div className="pt-4 border-t border-zinc-200 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {banks.map((b) => (
                <div key={b.id} className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-zinc-950">{b.bankName} · {b.accountName}</p>
                    <p className="font-mono text-sm font-bold text-zinc-900 tabular-nums">{b.accountNumber}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(b.accountNumber, b.bankName)}
                    className="px-2.5 py-1.5 rounded bg-[#F5C518] text-zinc-950 text-xs font-semibold cursor-pointer"
                  >
                    {copiedBank === b.bankName ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
            <ReceiptUploadForm
              defaultReference={plan.plan_ref}
              defaultAmount={plan.amount_paid === 0 ? plan.initial_deposit_amount : plan.installment_amount}
              defaultName={plan.customer_name}
              defaultEmail={plan.customer_email}
              onSuccess={() => {
                loadMyPlans();
              }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-12">
      <div>
        <BackBar label="Back" fallbackTo="/" />
        <div className="bg-[#09090B] text-white rounded-2xl p-6 sm:p-10">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#F5C518] mb-2">
            <PiggyBank className="w-4 h-4" />
            <span>PAY SMALL SMALL — SAVE TO BUY</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white">
            Reserve Your Electronics & Pay Gradually
          </h1>
          <p className="mt-2 text-sm sm:text-base text-zinc-300 max-w-2xl leading-relaxed">
            Start any appliance purchase with a minimum 30% initial deposit, choose weekly or
            monthly installments over 2 to 6 months, and upload your transfer receipts as you pay.
            Products are released for delivery or Warri pickup once full payment is confirmed.
          </p>
        </div>
      </div>

      {/* PLAN CREATOR + LIVE CALCULATOR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <form onSubmit={handleCreatePlan} className="lg:col-span-7 bg-white border border-zinc-200 rounded-2xl p-6 space-y-5">
          <h2 className="font-display text-xl font-bold text-zinc-950">
            Configure Your Save to Buy Plan
          </h2>

          {error && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Select Product *
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Initial Deposit (Min 30%)
              </label>
              <select
                value={depositPercent}
                onChange={(e) => setDepositPercent(Number(e.target.value))}
                className="w-full h-11 px-3 rounded-lg border border-zinc-300 bg-white text-sm"
              >
                <option value={30}>30% Minimum</option>
                <option value={40}>40% Deposit</option>
                <option value={50}>50% Deposit</option>
                <option value={60}>60% Deposit</option>
                <option value={70}>70% Deposit</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Payment Duration
              </label>
              <select
                value={durationMonths}
                onChange={(e) => setDurationMonths(Number(e.target.value))}
                className="w-full h-11 px-3 rounded-lg border border-zinc-300 bg-white text-sm"
              >
                <option value={2}>2 Months</option>
                <option value={3}>3 Months</option>
                <option value={4}>4 Months</option>
                <option value={6}>6 Months</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as 'weekly' | 'monthly')}
                className="w-full h-11 px-3 rounded-lg border border-zinc-300 bg-white text-sm"
              >
                <option value="monthly">Monthly Installments</option>
                <option value="weekly">Weekly Installments</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-100">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Full Name *</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Your full name"
                className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Phone / WhatsApp *</label>
              <input
                type="tel"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="080..."
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
                placeholder="you@example.com"
                className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Delivery Address</label>
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Warri / Delta State address or Pickup"
                className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 text-sm"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-700 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-[#B88D00] shrink-0 mt-0.5" />
            <span>
              Product Release Policy: Your selected item is reserved after your 30%+ initial deposit
              receipt is confirmed and is released for delivery or Warri pickup strictly after 100%
              of the total price is paid.
            </span>
          </div>

          <button
            type="submit"
            disabled={creating || !selectedProduct}
            className="w-full py-3.5 min-h-[48px] rounded-xl bg-[#F5C518] text-zinc-950 font-bold text-sm hover:bg-[#E0B00B] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {creating ? 'Creating Save to Buy Plan...' : 'Commit & Start Save to Buy Plan'}
          </button>
        </form>

        {/* TRANSPARENT INSTALLMENT BREAKDOWN */}
        <aside className="lg:col-span-5 bg-zinc-50 border border-zinc-200 rounded-2xl p-6 space-y-5 lg:sticky lg:top-24">
          <h2 className="font-display text-lg font-bold text-zinc-950">
            Transparent Payment Breakdown
          </h2>

          {selectedProduct && calc && (
            <>
              <div className="flex items-center gap-3.5 pb-4 border-b border-zinc-200">
                {selectedProduct.images[0] && (
                  <img
                    src={selectedProduct.images[0]}
                    alt={selectedProduct.name}
                    className="w-20 h-16 rounded-lg object-cover bg-white border border-zinc-200 shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-xs text-zinc-500">{selectedProduct.brand}</p>
                  <p className="font-display text-sm font-bold text-zinc-950 line-clamp-2">
                    {selectedProduct.name}
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-600">Total Product Price</span>
                  <span className="font-mono font-bold text-zinc-950 tabular-nums">
                    {formatNaira(calc.total)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Required Initial Deposit ({depositPercent}%)</span>
                  <span className="font-mono font-bold text-[#B88D00] tabular-nums">
                    {formatNaira(calc.initialDeposit)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Remaining Balance</span>
                  <span className="font-mono font-semibold text-zinc-950 tabular-nums">
                    {formatNaira(calc.remaining)}
                  </span>
                </div>
                <div className="flex justify-between pt-3 border-t border-zinc-200">
                  <span className="text-zinc-700 font-medium">
                    {calc.count} {frequency === 'weekly' ? 'Weekly' : 'Monthly'} Installments
                  </span>
                  <span className="font-mono text-lg font-bold text-zinc-950 tabular-nums">
                    {formatNaira(calc.perInstallment)} / {frequency === 'weekly' ? 'wk' : 'mo'}
                  </span>
                </div>
              </div>

              <div className="text-xs text-zinc-500 space-y-1.5 pt-2">
                <p className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>Zero interest or hidden service fees</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>Pay faster anytime to unlock early delivery</span>
                </p>
              </div>
            </>
          )}
        </aside>
      </div>

      {/* ACTIVE / TRACKED SAVE TO BUY PLANS */}
      <section className="space-y-6 pt-4 border-t border-zinc-200">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-zinc-950">
              Track Save to Buy Progress
            </h2>
            <p className="text-sm text-zinc-600 mt-1">
              Look up any Save to Buy Plan reference or view plans linked to your signed-in account.
            </p>
          </div>

          <form onSubmit={handleLookupPlan} className="flex gap-2 w-full md:w-auto">
            <input
              type="text"
              value={lookupRef}
              onChange={(e) => setLookupRef(e.target.value)}
              placeholder="Enter Plan Ref (STB-...)"
              className="flex-1 md:w-64 h-10 px-3.5 rounded-lg border border-zinc-300 font-mono text-sm uppercase"
            />
            <button
              type="submit"
              className="px-4 h-10 rounded-lg bg-[#09090B] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-[#F5C518]" />
              <span>Lookup</span>
            </button>
          </form>
        </div>

        {activePlan && renderPlanCard(activePlan)}

        {myPlans.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-display text-lg font-bold text-zinc-950">Your Account Plans</h3>
            {myPlans
              .filter((p) => p.id !== activePlan?.id)
              .map((plan) => renderPlanCard(plan))}
          </div>
        )}
      </section>
    </div>
  );
}
