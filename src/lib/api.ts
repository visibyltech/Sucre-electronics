import {
  DEFAULT_PAYMENT_CONFIG,
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
} from '../data/catalog';
import type { Category, Order, PaymentConfig, PaymentReceipt, Product, SaveToBuyPlan } from '../types';

const LOCAL_ORDERS_KEY = 'sucre_local_orders_v1';
const LOCAL_PLANS_KEY = 'sucre_local_plans_v1';
const LOCAL_RECEIPTS_KEY = 'sucre_local_receipts_v1';

export async function safeFetchJson(
  url: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: any } | null> {
  try {
    const res = await fetch(url, init);
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return null;
    }
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch {
    return null;
  }
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await safeFetchJson('/api/categories');
  if (res?.ok && Array.isArray(res.data?.categories) && res.data.categories.length > 0) {
    return res.data.categories;
  }
  return INITIAL_CATEGORIES;
}

export interface ProductQuery {
  category?: string;
  search?: string;
  featured?: boolean;
  bestSeller?: boolean;
  newArrival?: boolean;
  specialDeal?: boolean;
  bnpl?: boolean;
  sort?: string;
}

export async function fetchProducts(query: ProductQuery = {}): Promise<Product[]> {
  const params = new URLSearchParams();
  if (query.category && query.category !== 'all') params.set('category', query.category);
  if (query.search?.trim()) params.set('search', query.search.trim());
  if (query.featured) params.set('featured', '1');
  if (query.bestSeller) params.set('best_seller', '1');
  if (query.newArrival) params.set('new_arrival', '1');
  if (query.specialDeal) params.set('special_deal', '1');
  if (query.bnpl) params.set('bnpl', '1');
  if (query.sort) params.set('sort', query.sort);

  const qs = params.toString();
  const res = await safeFetchJson(`/api/products${qs ? `?${qs}` : ''}`);
  if (res?.ok && Array.isArray(res.data?.products) && res.data.products.length > 0) {
    return res.data.products;
  }
  // If backend returned a valid empty search result vs missing API on static Vercel:
  if (res?.ok && Array.isArray(res.data?.products) && (query.search || query.category)) {
    return res.data.products;
  }

  // Fallback filter on INITIAL_PRODUCTS when backend API is not running (e.g. static Vercel)
  let list = [...INITIAL_PRODUCTS];
  if (query.category && query.category !== 'all') {
    list = list.filter((p) => p.categorySlug === query.category);
  }
  if (query.featured) list = list.filter((p) => p.isFeatured);
  if (query.bestSeller) list = list.filter((p) => p.isBestSeller);
  if (query.newArrival) list = list.filter((p) => p.isNewArrival);
  if (query.specialDeal) {
    list = list.filter((p) => p.isSpecialDeal || (p.discountPrice && p.discountPrice < p.price));
  }
  if (query.bnpl) list = list.filter((p) => p.bnplEligible);
  if (query.search?.trim()) {
    const q = query.search.trim().toLowerCase();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }

  if (query.sort === 'price_asc') {
    list.sort((a, b) => a.effectivePrice - b.effectivePrice);
  } else if (query.sort === 'price_desc') {
    list.sort((a, b) => b.effectivePrice - a.effectivePrice);
  } else {
    list.sort((a, b) => b.id - a.id);
  }
  return list;
}

export async function fetchProductBySlug(
  slug: string
): Promise<{ product: Product | null; related: Product[] }> {
  const res = await safeFetchJson(`/api/products/${encodeURIComponent(slug)}`);
  if (res?.ok && res.data?.product) {
    return { product: res.data.product, related: res.data.related || [] };
  }
  if (res && res.status === 404 && res.data?.error) {
    return { product: null, related: [] };
  }

  const found = INITIAL_PRODUCTS.find((p) => p.slug === slug) || null;
  if (!found) return { product: null, related: [] };
  const related = INITIAL_PRODUCTS.filter(
    (p) => p.categorySlug === found.categorySlug && p.id !== found.id
  ).slice(0, 6);
  return { product: found, related };
}

export async function fetchPaymentConfig(): Promise<PaymentConfig> {
  const res = await safeFetchJson('/api/config/payment');
  if (res?.ok && res.data?.business) {
    return res.data;
  }
  return DEFAULT_PAYMENT_CONFIG;
}

function readLocalArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocalArray<T>(key: string, items: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // ignore quota errors
  }
}

function makeRef(prefix: string) {
  const n = Math.floor(1000 + Math.random() * 9000);
  const c = Math.random().toString(16).slice(2, 6).toUpperCase();
  return `${prefix}-${n}-${c}`;
}

export async function createOrderResilient(
  payload: {
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    deliveryAddress: string;
    deliveryMethod: 'delivery' | 'pickup';
    bankSelected: string;
    notes: string;
    items: { productId: number; quantity: number }[];
  },
  token: string | null
): Promise<{ ok: boolean; order?: Order; error?: string }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await safeFetchJson('/api/orders', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (res) {
    if (!res.ok) return { ok: false, error: res.data?.error || 'Could not place order.' };
    return { ok: true, order: res.data.order };
  }

  // Static hosting fallback so checkout works even without Express runtime
  const verifiedItems = payload.items
    .map((i) => {
      const p = INITIAL_PRODUCTS.find((x) => x.id === i.productId);
      if (!p) return null;
      return {
        productId: p.id,
        slug: p.slug,
        name: p.name,
        brand: p.brand,
        unitPrice: p.effectivePrice,
        quantity: i.quantity,
        lineTotal: p.effectivePrice * i.quantity,
        image: p.images[0] || '',
      };
    })
    .filter(Boolean) as any[];

  const subtotal = verifiedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const deliveryFee = payload.deliveryMethod === 'pickup' ? 0 : subtotal >= 800000 ? 0 : 5000;
  const order: Order = {
    id: Date.now(),
    order_ref: makeRef('SUC'),
    user_id: null,
    customer_name: payload.customerName,
    customer_phone: payload.customerPhone,
    customer_email: payload.customerEmail,
    delivery_address:
      payload.deliveryMethod === 'pickup'
        ? 'Showroom Pickup — Warri, Delta State'
        : payload.deliveryAddress,
    delivery_method: payload.deliveryMethod,
    payment_method: 'pay_now',
    bank_selected: payload.bankSelected,
    items: verifiedItems,
    subtotal,
    delivery_fee: deliveryFee,
    total_amount: subtotal + deliveryFee,
    amount_paid: 0,
    order_status: 'pending_payment',
    bnpl_provider: null,
    bnpl_application_id: null,
    bnpl_status: 'not_started',
    notes: payload.notes,
    created_at: new Date().toISOString(),
  };

  const existing = readLocalArray<Order>(LOCAL_ORDERS_KEY);
  writeLocalArray(LOCAL_ORDERS_KEY, [order, ...existing]);
  return { ok: true, order };
}

export async function createSaveToBuyResilient(
  payload: {
    productId: number;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    deliveryAddress: string;
    initialDepositPercent: number;
    durationMonths: number;
    frequency: 'weekly' | 'monthly';
  },
  token: string | null
): Promise<{ ok: boolean; plan?: SaveToBuyPlan; error?: string }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await safeFetchJson('/api/save-to-buy', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (res) {
    if (!res.ok) return { ok: false, error: res.data?.error || 'Could not create plan.' };
    return { ok: true, plan: res.data.plan };
  }

  const product = INITIAL_PRODUCTS.find((p) => p.id === payload.productId);
  if (!product) return { ok: false, error: 'Product not found.' };

  const totalPrice = product.effectivePrice;
  const initialDepositAmount = Math.ceil((totalPrice * payload.initialDepositPercent) / 100);
  const remaining = totalPrice - initialDepositAmount;
  const installmentCount =
    payload.frequency === 'weekly' ? payload.durationMonths * 4 : payload.durationMonths;
  const installmentAmount = Math.ceil(remaining / installmentCount);
  const now = new Date();
  const schedule = [
    {
      step: 0,
      label: `Initial Deposit (${payload.initialDepositPercent}%)`,
      dueDate: now.toISOString().slice(0, 10),
      amount: initialDepositAmount,
      paid: false,
    },
  ];
  for (let i = 1; i <= installmentCount; i++) {
    const due = new Date(now);
    if (payload.frequency === 'weekly') due.setDate(due.getDate() + i * 7);
    else due.setMonth(due.getMonth() + i);
    const amt =
      i === installmentCount
        ? Math.max(0, remaining - installmentAmount * (installmentCount - 1))
        : installmentAmount;
    schedule.push({
      step: i,
      label: `${payload.frequency === 'weekly' ? 'Week' : 'Month'} ${i} Installment`,
      dueDate: due.toISOString().slice(0, 10),
      amount: amt,
      paid: false,
    });
  }

  const plan: SaveToBuyPlan = {
    id: Date.now(),
    plan_ref: makeRef('STB'),
    user_id: null,
    customer_name: payload.customerName,
    customer_phone: payload.customerPhone,
    customer_email: payload.customerEmail,
    delivery_address: payload.deliveryAddress,
    product_id: product.id,
    product_name: product.name,
    product_image: product.images[0] || '',
    total_price: totalPrice,
    initial_deposit_percent: payload.initialDepositPercent,
    initial_deposit_amount: initialDepositAmount,
    duration_months: payload.durationMonths,
    frequency: payload.frequency,
    installment_count: installmentCount,
    installment_amount: installmentAmount,
    amount_paid: 0,
    outstanding_balance: totalPrice,
    status: 'awaiting_deposit',
    schedule,
    release_authorized: 0,
    created_at: new Date().toISOString(),
  };

  const existing = readLocalArray<SaveToBuyPlan>(LOCAL_PLANS_KEY);
  writeLocalArray(LOCAL_PLANS_KEY, [plan, ...existing]);
  return { ok: true, plan };
}

export async function lookupRefResilient(refCode: string): Promise<any | null> {
  const refUpper = refCode.trim().toUpperCase();
  if (!refUpper) return null;

  const endpoint = refUpper.startsWith('STB-')
    ? `/api/save-to-buy/lookup/${encodeURIComponent(refUpper)}`
    : `/api/orders/lookup/${encodeURIComponent(refUpper)}`;
  const res = await safeFetchJson(endpoint);
  if (res?.ok) return res.data.order || res.data.plan;

  const localOrders = readLocalArray<Order>(LOCAL_ORDERS_KEY);
  const ord = localOrders.find((o) => o.order_ref.toUpperCase() === refUpper);
  if (ord) return ord;

  const localPlans = readLocalArray<SaveToBuyPlan>(LOCAL_PLANS_KEY);
  return localPlans.find((p) => p.plan_ref.toUpperCase() === refUpper) || null;
}

export async function submitReceiptResilient(
  formData: FormData,
  file: File,
  token: string | null
): Promise<{ ok: boolean; receipt?: PaymentReceipt; error?: string }> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await safeFetchJson('/api/receipts', {
    method: 'POST',
    headers,
    body: formData,
  });

  if (res) {
    if (!res.ok) return { ok: false, error: res.data?.error || 'Could not upload receipt.' };
    return { ok: true, receipt: res.data.receipt };
  }

  const receipt: PaymentReceipt = {
    id: Date.now(),
    receipt_ref: makeRef('RCP'),
    order_id: null,
    plan_id: null,
    order_or_plan_ref: String(formData.get('reference') || '').toUpperCase(),
    customer_name: String(formData.get('customerName') || ''),
    customer_email: String(formData.get('customerEmail') || ''),
    bank_name: String(formData.get('bankName') || 'Union Bank'),
    amount_claimed: Number(formData.get('amountClaimed') || 0),
    sender_name: String(formData.get('senderName') || ''),
    transfer_date: String(formData.get('transferDate') || ''),
    notes: String(formData.get('notes') || ''),
    file_url: URL.createObjectURL(file),
    file_name: file.name,
    mime_type: file.type,
    status: 'pending_review',
    admin_note: '',
    created_at: new Date().toISOString(),
    reviewed_at: null,
  };
  const existing = readLocalArray<PaymentReceipt>(LOCAL_RECEIPTS_KEY);
  writeLocalArray(LOCAL_RECEIPTS_KEY, [receipt, ...existing]);
  return { ok: true, receipt };
}

export function getLocalSavedPlans(): SaveToBuyPlan[] {
  return readLocalArray<SaveToBuyPlan>(LOCAL_PLANS_KEY);
}

export function getLocalOrders(): Order[] {
  return readLocalArray<Order>(LOCAL_ORDERS_KEY);
}

export function getLocalReceipts(): PaymentReceipt[] {
  return readLocalArray<PaymentReceipt>(LOCAL_RECEIPTS_KEY);
}

export async function initiateBnplResilient(
  payload: {
    productId: number;
    quantity: number;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    deliveryMethod: 'delivery' | 'pickup';
    deliveryAddress: string;
  },
  token: string | null
): Promise<{
  ok: boolean;
  configured?: boolean;
  redirectUrl?: string;
  order?: Order;
  message?: string;
  error?: string;
}> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await safeFetchJson('/api/bnpl/initiate', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (res) {
    if (!res.ok) {
      return { ok: false, error: res.data?.error || 'Could not initiate Credibly BNPL.' };
    }
    return {
      ok: true,
      configured: Boolean(res.data?.configured),
      redirectUrl: res.data?.redirectUrl,
      order: res.data?.order,
      message: res.data?.message,
    };
  }

  const product = INITIAL_PRODUCTS.find((p) => p.id === payload.productId);
  if (!product) return { ok: false, error: 'Selected product was not found.' };

  const subtotal = product.effectivePrice * payload.quantity;
  const deliveryFee = payload.deliveryMethod === 'pickup' ? 0 : subtotal >= 800000 ? 0 : 5000;
  const order: Order = {
    id: Date.now(),
    order_ref: makeRef('BNPL'),
    user_id: null,
    customer_name: payload.customerName,
    customer_phone: payload.customerPhone,
    customer_email: payload.customerEmail,
    delivery_address:
      payload.deliveryMethod === 'pickup'
        ? 'Showroom Pickup — Warri, Delta State'
        : payload.deliveryAddress,
    delivery_method: payload.deliveryMethod,
    payment_method: 'bnpl',
    bank_selected: '',
    items: [
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        brand: product.brand,
        unitPrice: product.effectivePrice,
        quantity: payload.quantity,
        lineTotal: subtotal,
        image: product.images[0] || '',
      },
    ],
    subtotal,
    delivery_fee: deliveryFee,
    total_amount: subtotal + deliveryFee,
    amount_paid: 0,
    order_status: 'pending_payment',
    bnpl_provider: 'Credibly',
    bnpl_application_id: null,
    bnpl_status: 'pending_configuration',
    notes: 'Recorded while live Credibly merchant gateway server is pending activation.',
    created_at: new Date().toISOString(),
  };

  const existing = readLocalArray<Order>(LOCAL_ORDERS_KEY);
  writeLocalArray(LOCAL_ORDERS_KEY, [order, ...existing]);

  return {
    ok: true,
    configured: false,
    order,
    message:
      'Your BNPL request reference has been recorded without simulating an approval. Live Credibly financing requires the backend server and merchant API activation. You may switch to Save to Buy (30% Deposit) or contact our Warri team on WhatsApp.',
  };
}

export async function submitContactResilient(payload: {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}): Promise<{ ok: boolean; error?: string }> {
  const res = await safeFetchJson('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (res) {
    if (!res.ok) return { ok: false, error: res.data?.error || 'Could not send message.' };
    return { ok: true };
  }

  return { ok: true };
}

