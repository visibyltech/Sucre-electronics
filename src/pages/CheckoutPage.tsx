import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Check, Building2, ShoppingBag, Truck, Store } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatNaira, formatOrderStatus } from '../lib/format';
import { BackBar } from '../components/Layout';
import { ReceiptUploadForm } from '../components/ReceiptUploadForm';
import type { Order } from '../types';

export function CheckoutPage() {
  const { cart, cartSubtotal, clearCart, user, token, paymentConfig, showToast } = useStore();

  const [customerName, setCustomerName] = useState(user?.fullName || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [deliveryAddress, setDeliveryAddress] = useState(user?.address || '');
  const [bankSelected, setBankSelected] = useState<'Union Bank' | 'Zenith Bank'>('Union Bank');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [copiedBank, setCopiedBank] = useState<string | null>(null);

  const banks = paymentConfig?.bankAccounts || [
    { id: 'union', bankName: 'Union Bank', accountName: 'SUCRE ELECTRONICS', accountNumber: '0180490612' },
    { id: 'zenith', bankName: 'Zenith Bank', accountName: 'SUCRE ELECTRONICS', accountNumber: '1016639318' },
  ];

  const deliveryFee = deliveryMethod === 'pickup' ? 0 : cartSubtotal >= 800000 ? 0 : 5000;
  const totalAmount = cartSubtotal + deliveryFee;

  const copyAccountNumber = async (acct: string, bankName: string) => {
    try {
      await navigator.clipboard.writeText(acct);
      setCopiedBank(bankName);
      showToast(`${bankName} account number (${acct}) copied.`);
      setTimeout(() => setCopiedBank(null), 2500);
    } catch {
      showToast(`Account number: ${acct}`, 'info');
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!customerName.trim() || !customerPhone.trim() || !customerEmail.trim()) {
      setError('Please enter your full name, phone number, and email address.');
      return;
    }
    if (deliveryMethod === 'delivery' && !deliveryAddress.trim()) {
      setError('Please enter your delivery address in Warri / Delta State.');
      return;
    }
    if (cart.length === 0) {
      setError('Your shopping cart is empty.');
      return;
    }

    setSubmitting(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim(),
          deliveryAddress: deliveryAddress.trim(),
          deliveryMethod,
          bankSelected,
          notes: notes.trim(),
          items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not place order.');
        return;
      }

      setCreatedOrder(data.order);
      clearCart();
      showToast(`Order ${data.order.order_ref} created. Please complete your bank transfer.`);
    } catch {
      setError('Network error while creating your order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (createdOrder) {
    const chosenBank = banks.find((b) => b.bankName === (createdOrder.bank_selected || bankSelected)) || banks[0];
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        <div className="bg-[#09090B] text-white rounded-2xl p-6 sm:p-8 space-y-4">
          <p className="text-xs font-semibold text-[#F5C518]">Order Created — Awaiting Bank Transfer</p>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold">
                Order Reference:{' '}
                <span className="font-mono text-[#F5C518]">{createdOrder.order_ref}</span>
              </h1>
              <p className="text-sm text-zinc-300 mt-1">
                Status: {formatOrderStatus(createdOrder.order_status)}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs text-zinc-400">Exact Amount to Transfer</p>
              <p className="font-mono text-2xl sm:text-3xl font-bold text-[#F5C518] tabular-nums">
                {formatNaira(createdOrder.total_amount)}
              </p>
            </div>
          </div>
        </div>

        {/* Bank Transfer Accounts */}
        <div className="space-y-4">
          <h2 className="font-display text-xl font-bold text-zinc-950">
            Step 1: Transfer {formatNaira(createdOrder.total_amount)} to SUCRE ELECTRONICS
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {banks.map((bank) => {
              const isPreferred = bank.bankName === chosenBank.bankName;
              return (
                <div
                  key={bank.id}
                  className={`p-5 rounded-xl border bg-white space-y-3 ${
                    isPreferred ? 'border-[#09090B] ring-1 ring-[#09090B]' : 'border-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-[#B88D00]" />
                      <span className="font-display text-lg font-bold text-zinc-950">
                        {bank.bankName}
                      </span>
                    </div>
                    {isPreferred && (
                      <span className="text-xs font-semibold text-zinc-700">Selected</span>
                    )}
                  </div>

                  <div className="text-sm space-y-1">
                    <p className="text-zinc-500">
                      Account Name:{' '}
                      <span className="font-semibold text-zinc-950">{bank.accountName}</span>
                    </p>
                    <div className="flex items-center justify-between gap-3 pt-1">
                      <div>
                        <p className="text-xs text-zinc-500">Account Number</p>
                        <p className="font-mono text-2xl font-bold text-zinc-950 tracking-wider tabular-nums">
                          {bank.accountNumber}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyAccountNumber(bank.accountNumber, bank.bankName)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#F5C518] text-zinc-950 font-semibold text-xs hover:bg-[#E0B00B] transition-colors cursor-pointer"
                      >
                        {copiedBank === bank.bankName ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Receipt Upload */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="font-display text-xl font-bold text-zinc-950">
            Step 2: Upload Your Bank Transfer Receipt
          </h2>
          <p className="text-sm text-zinc-600">
            Upload your transfer screenshot or PDF receipt below. Our team will verify your transfer
            and confirm dispatch or Warri showroom pickup.
          </p>
          <ReceiptUploadForm
            defaultReference={createdOrder.order_ref}
            defaultBank={createdOrder.bank_selected || 'Union Bank'}
            defaultAmount={createdOrder.total_amount}
            defaultName={createdOrder.customer_name}
            defaultEmail={createdOrder.customer_email}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <Link
            to="/account"
            className="text-sm font-semibold text-zinc-950 underline hover:no-underline"
          >
            View Order History in My Account →
          </Link>
          <Link
            to="/shop"
            className="px-5 py-2.5 rounded-lg border border-zinc-300 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14 text-center space-y-4">
        <ShoppingBag className="w-10 h-10 text-zinc-400 mx-auto" />
        <h1 className="font-display text-2xl font-bold text-zinc-950">No items in checkout</h1>
        <p className="text-sm text-zinc-600">Add a product to your cart before checking out.</p>
        <Link
          to="/shop"
          className="inline-block px-6 py-3 rounded-lg bg-[#09090B] text-white text-sm font-semibold"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <BackBar label="Back" fallbackTo="/cart" />

      <h1 className="font-display text-2xl sm:text-4xl font-bold text-zinc-950 mb-2">
        Checkout — Buy Now & Pay by Bank Transfer
      </h1>
      <p className="text-sm text-zinc-600 mb-8">
        Complete your delivery details and transfer directly to SUCRE ELECTRONICS.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <form onSubmit={handleSubmitOrder} className="lg:col-span-7 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Customer Information */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-zinc-950">Customer Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Chinedu Okafor"
                  className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:border-zinc-950"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Phone / WhatsApp Number *
                </label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. 08031234567"
                  className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:border-zinc-950"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:border-zinc-950"
                />
              </div>
            </div>
          </div>

          {/* Delivery or Pickup */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-zinc-950">
              Delivery or Showroom Pickup
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDeliveryMethod('delivery')}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  deliveryMethod === 'delivery'
                    ? 'border-[#09090B] bg-zinc-50 ring-1 ring-[#09090B]'
                    : 'border-zinc-200 hover:border-zinc-400'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-sm text-zinc-950">
                  <Truck className="w-4 h-4 text-[#B88D00]" />
                  <span>Home Delivery (Warri / Delta)</span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  {cartSubtotal >= 800000 ? 'Free delivery applied' : '₦5,000 flat Warri delivery fee'}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryMethod('pickup')}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  deliveryMethod === 'pickup'
                    ? 'border-[#09090B] bg-zinc-50 ring-1 ring-[#09090B]'
                    : 'border-zinc-200 hover:border-zinc-400'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-sm text-zinc-950">
                  <Store className="w-4 h-4 text-[#B88D00]" />
                  <span>Warri Showroom Pickup</span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">Free pickup in Warri, Delta State</p>
              </button>
            </div>

            {deliveryMethod === 'delivery' && (
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Delivery Address *
                </label>
                <textarea
                  rows={2}
                  required
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="House number, street, landmark, Warri / Delta State"
                  className="w-full p-3.5 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:border-zinc-950"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Order Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Preferred delivery time or installation inquiry"
                className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:border-zinc-950"
              />
            </div>
          </div>

          {/* Bank Selection Preview */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-zinc-950">
              Select Bank Account for Payment
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {banks.map((bank) => (
                <div
                  key={bank.id}
                  onClick={() => setBankSelected(bank.bankName as 'Union Bank' | 'Zenith Bank')}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    bankSelected === bank.bankName
                      ? 'border-[#09090B] bg-zinc-50 ring-1 ring-[#09090B]'
                      : 'border-zinc-200 hover:border-zinc-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold text-zinc-950">{bank.bankName}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyAccountNumber(bank.accountNumber, bank.bankName);
                      }}
                      className="text-xs font-semibold text-zinc-800 underline hover:no-underline cursor-pointer"
                    >
                      {copiedBank === bank.bankName ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">{bank.accountName}</p>
                  <p className="font-mono text-base font-bold text-zinc-950 mt-1 tabular-nums">
                    {bank.accountNumber}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 min-h-[52px] rounded-xl bg-[#09090B] text-white font-bold text-sm hover:bg-zinc-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {submitting
              ? 'Creating Order...'
              : `Place Order & View Transfer Instructions (${formatNaira(totalAmount)})`}
          </button>
        </form>

        {/* Order Summary Sidebar */}
        <aside className="lg:col-span-5 bg-zinc-50 border border-zinc-200 rounded-2xl p-6 space-y-5 lg:sticky lg:top-24">
          <h2 className="font-display text-lg font-bold text-zinc-950">Order Summary</h2>
          <div className="divide-y divide-zinc-200">
            {cart.map((item) => (
              <div key={item.productId} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-950 truncate">{item.name}</p>
                  <p className="text-xs text-zinc-500 tabular-nums">
                    Qty: {item.quantity} × {formatNaira(item.unitPrice)}
                  </p>
                </div>
                <span className="font-mono text-sm font-semibold text-zinc-950 shrink-0 tabular-nums">
                  {formatNaira(item.unitPrice * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-zinc-200 pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-600">Subtotal</span>
              <span className="font-mono font-semibold tabular-nums">{formatNaira(cartSubtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-600">Delivery Fee</span>
              <span className="font-mono font-semibold tabular-nums">
                {deliveryFee === 0 ? 'Free' : formatNaira(deliveryFee)}
              </span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-zinc-200">
              <span className="font-display text-base font-bold text-zinc-950">Total Payment</span>
              <span className="font-mono text-2xl font-bold text-zinc-950 tabular-nums">
                {formatNaira(totalAmount)}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
