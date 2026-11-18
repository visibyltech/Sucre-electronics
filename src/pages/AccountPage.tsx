import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, LogOut, Package, PiggyBank, Receipt, User as UserIcon, Shield } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { Order, PaymentReceipt, SaveToBuyPlan } from '../types';
import { formatBnplStatus, formatDate, formatNaira, formatOrderStatus } from '../lib/format';
import { BackBar } from '../components/Layout';

export function AccountPage() {
  const { user, token, authLoading, loginWithToken, logout, refreshUser, showToast } = useStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [tab, setTab] = useState<'orders' | 'plans' | 'receipts' | 'profile'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [plans, setPlans] = useState<SaveToBuyPlan[]>([]);
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);

  // Profile edit state
  const [profName, setProfName] = useState('');
  const [profPhone, setProfPhone] = useState('');
  const [profAddress, setProfAddress] = useState('');

  useEffect(() => {
    if (!user) return;
    setProfName(user.fullName);
    setProfPhone(user.phone);
    setProfAddress(user.address);
  }, [user]);

  useEffect(() => {
    if (!token || !user) return;
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch('/api/my/orders', { headers }).then((r) => r.json()),
      fetch('/api/my/save-to-buy', { headers }).then((r) => r.json()),
      fetch('/api/my/receipts', { headers }).then((r) => r.json()),
    ])
      .then(([o, p, r]) => {
        setOrders(o.orders || []);
        setPlans(p.plans || []);
        setReceipts(r.receipts || []);
      })
      .catch(() => {});
  }, [token, user]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload =
        mode === 'login'
          ? { email, password }
          : { fullName, email, phone, address, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Authentication failed.');
        return;
      }
      loginWithToken(data.token, data.user);
      showToast(mode === 'login' ? `Welcome back, ${data.user.fullName}.` : 'Account created successfully!');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fullName: profName, phone: profPhone, address: profAddress }),
    });
    if (res.ok) {
      await refreshUser();
      showToast('Profile updated.');
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-sm text-zinc-500">
        Loading account...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <BackBar label="Back" fallbackTo="/" />

        <div className="bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 space-y-6">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-zinc-950">
              {mode === 'login' ? 'Sign In to Your Account' : 'Create a Customer Account'}
            </h1>
            <p className="text-sm text-zinc-600 mt-1">
              Track your orders, Save to Buy payment progress, and uploaded transfer receipts.
            </p>
          </div>

          <div className="grid grid-cols-2 p-1 bg-zinc-100 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                mode === 'login' ? 'bg-white text-zinc-950 shadow-xs' : 'text-zinc-600'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                mode === 'register' ? 'bg-white text-zinc-950 shadow-xs' : 'text-zinc-600'
              }`}
            >
              Sign Up
            </button>
          </div>

          {error && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                    Phone / WhatsApp Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="080..."
                    className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                    Delivery Address (Optional)
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Warri / Delta State"
                    className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 text-sm"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full h-11 pl-3.5 pr-11 rounded-lg border border-zinc-300 text-sm"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-zinc-900 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 min-h-[48px] rounded-xl bg-[#09090B] text-white font-semibold text-sm hover:bg-zinc-800 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {submitting
                ? 'Please wait...'
                : mode === 'login'
                ? 'Sign In'
                : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      <BackBar label="Back" fallbackTo="/" />

      <div className="bg-[#09090B] text-white rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#F5C518]">Customer Account</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold mt-1">{user.fullName}</h1>
          <p className="text-sm text-zinc-300 mt-0.5">{user.email} · {user.phone}</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {user.role === 'admin' && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#F5C518] text-zinc-950 font-bold text-xs hover:bg-[#E0B00B]"
            >
              <Shield className="w-4 h-4" />
              <span>Open Admin Dashboard</span>
            </Link>
          )}
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-zinc-700 text-zinc-200 text-xs font-semibold hover:bg-zinc-800 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: 'orders', label: `Order History (${orders.length})`, icon: Package },
          { id: 'plans', label: `Save to Buy Plans (${plans.length})`, icon: PiggyBank },
          { id: 'receipts', label: `Receipt Submissions (${receipts.length})`, icon: Receipt },
          { id: 'profile', label: 'Profile Settings', icon: UserIcon },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id as any)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                tab === item.id
                  ? 'bg-[#09090B] text-[#F5C518]'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {tab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="p-8 rounded-2xl bg-zinc-50 border border-zinc-200 text-center space-y-3">
              <p className="text-sm text-zinc-600">You have not placed any orders yet.</p>
              <Link to="/shop" className="inline-block px-5 py-2.5 rounded-lg bg-[#09090B] text-white text-xs font-semibold">
                Start Shopping
              </Link>
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="bg-white border border-zinc-200 rounded-2xl p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                  <div>
                    <p className="font-mono text-sm font-bold text-zinc-950">{order.order_ref}</p>
                    <p className="text-xs text-zinc-500">
                      Placed {formatDate(order.created_at)} · Payment:{' '}
                      {order.payment_method === 'bnpl' ? 'Credibly BNPL' : 'Bank Transfer'}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-mono text-base font-bold text-zinc-950 tabular-nums">
                      {formatNaira(order.total_amount)}
                    </p>
                    <p className="text-xs font-semibold text-[#B88D00]">
                      {order.payment_method === 'bnpl'
                        ? formatBnplStatus(order.bnpl_status)
                        : formatOrderStatus(order.order_status)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span className="text-zinc-700">
                        {item.name} × {item.quantity}
                      </span>
                      <span className="font-mono font-medium tabular-nums">
                        {formatNaira(item.lineTotal)}
                      </span>
                    </div>
                  ))}
                </div>

                {order.payment_method === 'pay_now' && order.order_status === 'pending_payment' && (
                  <div className="pt-2">
                    <Link
                      to="/payment-confirmation"
                      className="inline-block px-4 py-2 rounded-lg bg-[#F5C518] text-zinc-950 text-xs font-bold"
                    >
                      Upload Transfer Receipt
                    </Link>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'plans' && (
        <div className="space-y-4">
          {plans.length === 0 ? (
            <div className="p-8 rounded-2xl bg-zinc-50 border border-zinc-200 text-center space-y-3">
              <p className="text-sm text-zinc-600">You have no Save to Buy plans yet.</p>
              <Link to="/save-to-buy" className="inline-block px-5 py-2.5 rounded-lg bg-[#F5C518] text-zinc-950 text-xs font-bold">
                Start a Save to Buy Plan
              </Link>
            </div>
          ) : (
            plans.map((plan) => {
              const pct = Math.min(100, Math.round((plan.amount_paid / plan.total_price) * 100));
              return (
                <div key={plan.id} className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs font-semibold text-[#B88D00]">{plan.plan_ref}</p>
                      <h3 className="font-display text-lg font-bold text-zinc-950">{plan.product_name}</h3>
                    </div>
                    <p className="font-mono text-sm font-bold tabular-nums">
                      Paid {formatNaira(plan.amount_paid)} / {formatNaira(plan.total_price)} ({pct}%)
                    </p>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-zinc-100 overflow-hidden">
                    <div className="h-full bg-[#F5C518]" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-600">
                    <span>
                      Outstanding: <strong className="font-mono">{formatNaira(plan.outstanding_balance)}</strong>
                    </span>
                    <Link
                      to="/save-to-buy"
                      className="font-semibold text-zinc-950 underline hover:no-underline"
                    >
                      Manage Plan & Upload Installment →
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === 'receipts' && (
        <div className="space-y-3">
          {receipts.length === 0 ? (
            <div className="p-8 rounded-2xl bg-zinc-50 border border-zinc-200 text-center text-sm text-zinc-600">
              No payment receipts submitted yet.
            </div>
          ) : (
            receipts.map((r) => (
              <div key={r.id} className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs font-bold text-zinc-950">
                    {r.receipt_ref} · Ref: {r.order_or_plan_ref}
                  </p>
                  <p className="text-sm text-zinc-700 mt-0.5">
                    {r.bank_name} · {formatNaira(r.amount_claimed)} · Sent by {r.sender_name}
                  </p>
                  {r.admin_note && (
                    <p className="text-xs text-zinc-500 mt-1">Review note: {r.admin_note}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-semibold ${
                      r.status === 'confirmed'
                        ? 'text-emerald-700'
                        : r.status === 'rejected'
                        ? 'text-red-600'
                        : 'text-amber-700'
                    }`}
                  >
                    {r.status === 'confirmed'
                      ? 'Confirmed'
                      : r.status === 'rejected'
                      ? 'Rejected'
                      : 'Pending Review'}
                  </span>
                  <a
                    href={r.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-zinc-950 underline"
                  >
                    View File
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'profile' && (
        <form onSubmit={handleProfileSave} className="max-w-xl bg-white border border-zinc-200 rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-zinc-950">Update Profile Details</h2>
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Full Name</label>
            <input
              type="text"
              required
              value={profName}
              onChange={(e) => setProfName(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Phone Number</label>
            <input
              type="tel"
              required
              value={profPhone}
              onChange={(e) => setProfPhone(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Delivery Address</label>
            <textarea
              rows={2}
              value={profAddress}
              onChange={(e) => setProfAddress(e.target.value)}
              className="w-full p-3.5 rounded-lg border border-zinc-300 text-sm"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 rounded-lg bg-[#09090B] text-white text-sm font-semibold hover:bg-zinc-800 cursor-pointer"
          >
            Save Profile
          </button>
        </form>
      )}
    </div>
  );
}
