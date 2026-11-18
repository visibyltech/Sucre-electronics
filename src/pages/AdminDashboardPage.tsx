import React, { useEffect, useState } from 'react';
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Upload,
  Eye,
  EyeOff,
  ExternalLink,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { Category, Order, PaymentReceipt, Product, SaveToBuyPlan } from '../types';
import { formatBnplStatus, formatDate, formatNaira, formatOrderStatus } from '../lib/format';
import { BackBar } from '../components/Layout';
import { fetchCategories, fetchProducts, safeFetchJson } from '../lib/api';

export function AdminDashboardPage() {
  const { user, token, loginWithToken, logout, showToast } = useStore();
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [authError, setAuthError] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  const [tab, setTab] = useState<'receipts' | 'orders' | 'products' | 'plans' | 'categories' | 'messages'>('receipts');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [plans, setPlans] = useState<SaveToBuyPlan[]>([]);
  const [messages, setMessages] = useState<any[]>([]);

  // Product editor modal/panel state
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [productImagesText, setProductImagesText] = useState('');
  const [specsText, setSpecsText] = useState('');
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // New Category state
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  const isAdmin = user?.role === 'admin';

  const loadAdminData = async () => {
    if (!token || !isAdmin) return;
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [ov, pr, ca, or, rc, pl, ms] = await Promise.all([
        safeFetchJson('/api/admin/overview', { headers }),
        fetchProducts(),
        fetchCategories(),
        safeFetchJson('/api/admin/orders', { headers }),
        safeFetchJson('/api/admin/receipts', { headers }),
        safeFetchJson('/api/admin/save-to-buy', { headers }),
        safeFetchJson('/api/admin/messages', { headers }),
      ]);
      if (!ov) {
        showToast('Live backend API is unavailable in static preview.', 'error');
        return;
      }
      setCounts(ov.data?.counts || {});
      setProducts(pr || []);
      setCategories(ca || []);
      setOrders(or?.data?.orders || []);
      setReceipts(rc?.data?.receipts || []);
      setPlans(pl?.data?.plans || []);
      setMessages(ms?.data?.messages || []);
    } catch {
      showToast('Failed to load admin records.', 'error');
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [token, isAdmin]);

  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setSigningIn(true);
    try {
      const res = await safeFetchJson('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });
      if (!res) {
        setAuthError(
          'Store administration requires the live Node.js + SQLite backend server (`npm run start`). Static deployments serve the storefront only.'
        );
        return;
      }
      if (!res.ok) {
        setAuthError(res.data?.error || 'Invalid credentials.');
        return;
      }
      if (res.data?.user?.role !== 'admin') {
        setAuthError('This account does not have administrator privileges.');
        return;
      }
      loginWithToken(res.data.token, res.data.user);
      showToast('Signed in to SUCRE ELECTRONICS Admin Dashboard.');
    } catch {
      setAuthError('Network error while signing in.');
    } finally {
      setSigningIn(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <BackBar label="Back" fallbackTo="/" />
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-2.5 text-zinc-950">
            <Shield className="w-6 h-6 text-[#B88D00]" />
            <h1 className="font-display text-2xl font-bold">Store Administrator Sign In</h1>
          </div>
          <p className="text-sm text-zinc-600">
            Restricted access for authorized SUCRE ELECTRONICS administrators only.
          </p>

          {user && user.role !== 'admin' && (
            <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
              <p>You are currently signed in as a customer ({user.email}).</p>
              <button
                type="button"
                onClick={logout}
                className="font-semibold underline cursor-pointer"
              >
                Sign out to switch to an administrator account
              </button>
            </div>
          )}

          {authError && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
              {authError}
            </div>
          )}

          <form onSubmit={handleAdminSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Administrator Email
              </label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@sucre..."
                className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full h-11 pl-3.5 pr-11 rounded-lg border border-zinc-300 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-zinc-500 cursor-pointer"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={signingIn}
              className="w-full py-3.5 rounded-xl bg-[#09090B] text-white font-semibold text-sm hover:bg-zinc-800 cursor-pointer"
            >
              {signingIn ? 'Verifying...' : 'Access Admin Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const openNewProduct = () => {
    setEditingProduct({
      name: '',
      categoryId: categories[0]?.id || 1,
      brand: '',
      price: 0,
      discountPrice: null,
      stock: 5,
      description: '',
      isFeatured: false,
      isBestSeller: false,
      isNewArrival: true,
      isSpecialDeal: false,
      bnplEligible: true,
    });
    setProductImagesText('');
    setSpecsText('Warranty: 1 Year Official Warranty');
  };

  const openEditProduct = (p: Product) => {
    setEditingProduct({ ...p });
    setProductImagesText((p.images || []).join('\n'));
    setSpecsText(
      Object.entries(p.specifications || {})
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n')
    );
  };

  const handleUploadProductPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !token) return;
    setUploadingPhotos(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('images', f));
      const res = await fetch('/api/admin/products/upload-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Upload failed.', 'error');
        return;
      }
      const existing = productImagesText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      setProductImagesText([...existing, ...(data.urls || [])].join('\n'));
      showToast(`Uploaded ${data.urls.length} product photo(s).`);
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !token) return;
    const images = productImagesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const specifications: Record<string, string> = {};
    specsText.split('\n').forEach((line) => {
      const idx = line.indexOf(':');
      if (idx > 0) {
        specifications[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
      }
    });

    const isUpdate = Boolean(editingProduct.id);
    const url = isUpdate ? `/api/admin/products/${editingProduct.id}` : '/api/admin/products';
    const res = await fetch(url, {
      method: isUpdate ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...editingProduct,
        images,
        specifications,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Failed to save product.', 'error');
      return;
    }
    showToast(isUpdate ? 'Product updated.' : 'Product created.');
    setEditingProduct(null);
    loadAdminData();
  };

  const handleDeleteProduct = async (id: number) => {
    if (!token) return;
    const res = await fetch(`/api/admin/products/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Could not delete product.', 'error');
      return;
    }
    showToast('Product deleted.');
    loadAdminData();
  };

  const handleReceiptDecision = async (id: number, decision: 'confirmed' | 'rejected') => {
    if (!token) return;
    const adminNote =
      decision === 'rejected' ? 'Transfer could not be matched. Please verify and re-upload.' : 'Verified by SUCRE ELECTRONICS.';
    const res = await fetch(`/api/admin/receipts/${id}/review`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ decision, adminNote }),
    });
    if (res.ok) {
      showToast(`Receipt ${decision}.`);
      loadAdminData();
    }
  };

  const handleOrderStatusChange = async (id: number, orderStatus: string) => {
    if (!token) return;
    const res = await fetch(`/api/admin/orders/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ orderStatus }),
    });
    if (res.ok) {
      showToast('Order status updated.');
      loadAdminData();
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newCatName.trim()) return;
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: newCatName, description: newCatDesc }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Could not add category.', 'error');
      return;
    }
    setNewCatName('');
    setNewCatDesc('');
    showToast('Category added.');
    loadAdminData();
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      <BackBar label="Back" fallbackTo="/" />

      <div className="bg-[#09090B] text-white rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#F5C518]">Protected Store Administration</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold mt-1">
            SUCRE ELECTRONICS Management Console
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">Signed in as {user.email}</p>
        </div>
        <button
          type="button"
          onClick={openNewProduct}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#F5C518] text-zinc-950 font-bold text-xs hover:bg-[#E0B00B] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Product</span>
        </button>
      </div>

      {/* Live Database Overview Counts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Products', val: counts.totalProducts ?? 0 },
          { label: 'Total Orders', val: counts.totalOrders ?? 0 },
          { label: 'Pending Receipts', val: counts.pendingReceipts ?? 0 },
          { label: 'Active Save to Buy', val: counts.activePlans ?? 0 },
          { label: 'BNPL Orders', val: counts.bnplOrders ?? 0 },
          { label: 'Unread Inquiries', val: counts.unreadMessages ?? 0 },
        ].map((stat) => (
          <div key={stat.label} className="p-4 rounded-xl border border-zinc-200 bg-white">
            <p className="text-xs text-zinc-500">{stat.label}</p>
            <p className="font-mono text-2xl font-bold text-zinc-950 mt-1 tabular-nums">
              {stat.val}
            </p>
          </div>
        ))}
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: 'receipts', label: `Receipts (${receipts.length})` },
          { id: 'orders', label: `Orders & BNPL (${orders.length})` },
          { id: 'plans', label: `Save to Buy (${plans.length})` },
          { id: 'products', label: `Products (${products.length})` },
          { id: 'categories', label: `Categories (${categories.length})` },
          { id: 'messages', label: `Inquiries (${messages.length})` },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id as any)}
            className={`px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
              tab === t.id
                ? 'bg-[#09090B] text-[#F5C518]'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* RECEIPTS TAB */}
      {tab === 'receipts' && (
        <div className="space-y-3">
          {receipts.length === 0 ? (
            <p className="text-sm text-zinc-500 py-8 text-center">No payment receipts uploaded yet.</p>
          ) : (
            receipts.map((r) => (
              <div key={r.id} className="bg-white border border-zinc-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-zinc-950">{r.receipt_ref}</span>
                    <span className="text-zinc-400">·</span>
                    <span className="font-mono text-xs font-semibold text-[#B88D00]">
                      Ref: {r.order_or_plan_ref}
                    </span>
                    <span className="text-zinc-400">·</span>
                    <span
                      className={`text-xs font-bold ${
                        r.status === 'confirmed'
                          ? 'text-emerald-700'
                          : r.status === 'rejected'
                          ? 'text-red-600'
                          : 'text-amber-700'
                      }`}
                    >
                      {r.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-zinc-950">
                    {formatNaira(r.amount_claimed)} via {r.bank_name} · Sender: {r.sender_name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Customer: {r.customer_name} ({r.customer_email}) · Transfer Date: {r.transfer_date}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={r.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-300 text-xs font-semibold text-zinc-900 hover:bg-zinc-50"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Inspect Receipt</span>
                  </a>

                  {r.status === 'pending_review' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleReceiptDecision(r.id, 'confirmed')}
                        className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirm Payment</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReceiptDecision(r.id, 'rejected')}
                        className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ORDERS & BNPL TAB */}
      {tab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <p className="text-sm text-zinc-500 py-8 text-center">No orders placed yet.</p>
          ) : (
            orders.map((o) => (
              <div key={o.id} className="bg-white border border-zinc-200 rounded-xl p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-bold text-zinc-950">
                      {o.order_ref} · {o.payment_method === 'bnpl' ? 'Credibly BNPL' : 'Pay Now Transfer'}
                    </p>
                    <p className="text-xs text-zinc-600 mt-0.5">
                      {o.customer_name} · {o.customer_phone} · {o.customer_email}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {o.delivery_method === 'pickup' ? 'Warri Showroom Pickup' : o.delivery_address}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-mono text-base font-bold tabular-nums">{formatNaira(o.total_amount)}</p>
                      <p className="text-xs text-zinc-500">
                        Paid: <span className="font-mono">{formatNaira(o.amount_paid)}</span>
                      </p>
                    </div>
                    <select
                      value={o.order_status}
                      onChange={(e) => handleOrderStatusChange(o.id, e.target.value)}
                      className="h-10 px-3 rounded-lg border border-zinc-300 text-xs font-semibold bg-white"
                    >
                      {[
                        'pending_payment',
                        'payment_submitted',
                        'confirmed',
                        'processing',
                        'ready_for_pickup',
                        'out_for_delivery',
                        'delivered',
                        'cancelled',
                      ].map((st) => (
                        <option key={st} value={st}>
                          {formatOrderStatus(st)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {o.payment_method === 'bnpl' && (
                  <p className="text-xs text-zinc-700 bg-zinc-50 px-3 py-2 rounded-lg">
                    BNPL Provider: Credibly · Status: <strong>{formatBnplStatus(o.bnpl_status)}</strong>
                  </p>
                )}

                <div className="text-xs text-zinc-600 border-t border-zinc-100 pt-2">
                  Items: {o.items.map((i) => `${i.name} (×${i.quantity})`).join(', ')}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* SAVE TO BUY TAB */}
      {tab === 'plans' && (
        <div className="space-y-4">
          {plans.length === 0 ? (
            <p className="text-sm text-zinc-500 py-8 text-center">No Save to Buy plans created yet.</p>
          ) : (
            plans.map((p) => (
              <div key={p.id} className="bg-white border border-zinc-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-xs font-bold text-[#B88D00]">{p.plan_ref}</p>
                  <h3 className="font-display text-base font-bold text-zinc-950">{p.product_name}</h3>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    {p.customer_name} · {p.customer_phone} · {p.customer_email}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {p.duration_months} mo ({p.frequency}) · Status: <strong>{p.status}</strong> ·
                    Release: <strong>{p.release_authorized ? 'Authorized' : 'Locked Until Full Payment'}</strong>
                  </p>
                </div>
                <div className="text-left sm:text-right font-mono text-sm space-y-1 tabular-nums">
                  <p>Total: <strong>{formatNaira(p.total_price)}</strong></p>
                  <p className="text-emerald-700">Paid: <strong>{formatNaira(p.amount_paid)}</strong></p>
                  <p className="text-red-700">Balance: <strong>{formatNaira(p.outstanding_balance)}</strong></p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* PRODUCTS TAB */}
      {tab === 'products' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => (
              <div key={p.id} className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-col justify-between gap-3">
                <div className="flex gap-3">
                  {p.images[0] && (
                    <img src={p.images[0]} alt={p.name} className="w-20 h-16 rounded-lg object-cover bg-zinc-100 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs text-zinc-500">{p.brand} · {p.categoryName}</p>
                    <h3 className="font-display text-sm font-bold text-zinc-950 line-clamp-2">{p.name}</h3>
                    <p className="font-mono text-sm font-semibold mt-1 tabular-nums">
                      {formatNaira(p.effectivePrice)}{' '}
                      <span className="text-xs text-zinc-500 font-sans">· Stock: {p.stock}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => openEditProduct(p)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-300 text-xs font-semibold hover:bg-zinc-50 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(p.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CATEGORIES TAB */}
      {tab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form onSubmit={handleAddCategory} className="lg:col-span-4 bg-white border border-zinc-200 rounded-xl p-5 space-y-4 h-fit">
            <h2 className="font-display text-lg font-bold">Add Category</h2>
            <input
              type="text"
              required
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Category name"
              className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 text-sm"
            />
            <textarea
              rows={2}
              value={newCatDesc}
              onChange={(e) => setNewCatDesc(e.target.value)}
              placeholder="Short description"
              className="w-full p-3.5 rounded-lg border border-zinc-300 text-sm"
            />
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-[#09090B] text-white text-xs font-semibold cursor-pointer"
            >
              Create Category
            </button>
          </form>

          <div className="lg:col-span-8 space-y-2.5">
            {categories.map((c) => (
              <div key={c.id} className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-display font-bold text-zinc-950">{c.name}</p>
                  <p className="text-xs text-zinc-500">{c.description}</p>
                </div>
                <span className="font-mono text-xs font-semibold text-zinc-700 tabular-nums">
                  {c.product_count ?? 0} products
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MESSAGES TAB */}
      {tab === 'messages' && (
        <div className="space-y-3">
          {messages.length === 0 ? (
            <p className="text-sm text-zinc-500 py-8 text-center">No customer inquiries yet.</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="bg-white border border-zinc-200 rounded-xl p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-display font-bold text-zinc-950">{m.subject}</p>
                  <span className="text-xs text-zinc-500">{formatDate(m.created_at)}</span>
                </div>
                <p className="text-sm text-zinc-700">{m.message}</p>
                <p className="text-xs text-zinc-500">
                  From: {m.name} · {m.email} · {m.phone}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {/* PRODUCT ADD/EDIT MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <h2 className="font-display text-xl font-bold text-zinc-950">
                {editingProduct.id ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="p-2 rounded-lg hover:bg-zinc-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-zinc-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Category *</label>
                  <select
                    value={editingProduct.categoryId || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, categoryId: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-lg border border-zinc-300 text-sm bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Brand *</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.brand || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-zinc-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Regular Price (₦) *</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.price ?? 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-lg border border-zinc-300 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Discount Price (₦, optional)</label>
                  <input
                    type="number"
                    value={editingProduct.discountPrice ?? ''}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        discountPrice: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full h-10 px-3 rounded-lg border border-zinc-300 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Stock Quantity *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editingProduct.stock ?? 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-lg border border-zinc-300 text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Description *</label>
                <textarea
                  rows={3}
                  required
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full p-3 rounded-lg border border-zinc-300 text-sm"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-zinc-700">
                    Product Photos (one URL per line or upload multiple files)
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B88D00] cursor-pointer hover:underline">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingPhotos ? 'Uploading...' : 'Upload Photos'}</span>
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleUploadProductPhotos}
                      className="hidden"
                    />
                  </label>
                </div>
                <textarea
                  rows={2}
                  value={productImagesText}
                  onChange={(e) => setProductImagesText(e.target.value)}
                  placeholder="/uploads/products/..."
                  className="w-full p-3 rounded-lg border border-zinc-300 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Specifications (Key: Value per line)
                </label>
                <textarea
                  rows={3}
                  value={specsText}
                  onChange={(e) => setSpecsText(e.target.value)}
                  className="w-full p-3 rounded-lg border border-zinc-300 text-xs font-mono"
                />
              </div>

              <div className="flex flex-wrap gap-4 text-xs font-medium text-zinc-800">
                {[
                  { key: 'isFeatured', label: 'Featured' },
                  { key: 'isBestSeller', label: 'Best Seller' },
                  { key: 'isNewArrival', label: 'New Arrival' },
                  { key: 'isSpecialDeal', label: 'Special Deal' },
                  { key: 'bnplEligible', label: 'BNPL Eligible' },
                ].map((flag) => (
                  <label key={flag.key} className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean((editingProduct as any)[flag.key])}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, [flag.key]: e.target.checked })
                      }
                    />
                    <span>{flag.label}</span>
                  </label>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2.5 rounded-lg border border-zinc-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-[#09090B] text-white text-xs font-semibold cursor-pointer"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
