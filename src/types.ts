export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  display_order: number;
  product_count?: number;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  brand: string;
  price: number;
  discountPrice: number | null;
  effectivePrice: number;
  stock: number;
  availability: string;
  description: string;
  specifications: Record<string, string>;
  images: string[];
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isSpecialDeal: boolean;
  bnplEligible: boolean;
  createdAt: string;
}

export interface CartItem {
  productId: number;
  slug: string;
  name: string;
  brand: string;
  unitPrice: number;
  originalPrice: number;
  image: string;
  quantity: number;
  stock: number;
}

export interface User {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  role: 'customer' | 'admin';
  createdAt?: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
}

export interface PaymentConfig {
  business: {
    name: string;
    location: string;
    phone: string;
    whatsapp: string;
    email: string;
  };
  bankAccounts: BankAccount[];
  deliveryRates: {
    warriPickup: number;
    warriDelivery: number;
    deltaStateDelivery: number;
    freeDeliveryThreshold: number;
  };
  credibly: {
    provider: string;
    configured: boolean;
  };
  cloudinaryConfigured: boolean;
}

export interface OrderItem {
  productId: number;
  slug: string;
  name: string;
  brand: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  image: string;
}

export interface PaymentReceipt {
  id: number;
  receipt_ref: string;
  order_id: number | null;
  plan_id: number | null;
  order_or_plan_ref: string;
  customer_name: string;
  customer_email: string;
  bank_name: string;
  amount_claimed: number;
  sender_name: string;
  transfer_date: string;
  notes: string;
  file_url: string;
  file_name: string;
  mime_type: string;
  status: 'pending_review' | 'confirmed' | 'rejected';
  admin_note: string;
  created_at: string;
  reviewed_at: string | null;
}

export interface Order {
  id: number;
  order_ref: string;
  user_id: number | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  delivery_address: string;
  delivery_method: 'delivery' | 'pickup';
  payment_method: 'pay_now' | 'save_to_buy' | 'bnpl';
  bank_selected: string | null;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  amount_paid: number;
  order_status: string;
  bnpl_provider: string | null;
  bnpl_application_id: string | null;
  bnpl_status: string | null;
  notes: string;
  created_at: string;
  receipts?: PaymentReceipt[];
}

export interface InstallmentStep {
  step: number;
  label: string;
  dueDate: string;
  amount: number;
  paid: boolean;
}

export interface SaveToBuyPlan {
  id: number;
  plan_ref: string;
  user_id: number | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  delivery_address: string;
  product_id: number;
  product_name: string;
  product_image: string;
  total_price: number;
  initial_deposit_percent: number;
  initial_deposit_amount: number;
  duration_months: number;
  frequency: 'weekly' | 'monthly';
  installment_count: number;
  installment_amount: number;
  amount_paid: number;
  outstanding_balance: number;
  status: 'awaiting_deposit' | 'active' | 'completed' | 'cancelled';
  schedule: InstallmentStep[];
  release_authorized: number;
  created_at: string;
  receipts?: PaymentReceipt[];
}
