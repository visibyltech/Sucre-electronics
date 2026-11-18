export const LOGO_URL = '/assets/aistudio/IMG-20261118-WA0004_6c43fbfc.jpg';
export const HERO_SHOWROOM_URL = '/src/assets/images/hero_sucre_showroom_1794993276664.jpg';

export const WHATSAPP_NUMBER = '2348160935332';
export const DISPLAY_PHONE = '08160935332';
export const BUSINESS_EMAIL = 'sucre4888@gmail.com';
export const BUSINESS_LOCATION = 'Warri, Delta State, Nigeria';

export function formatNaira(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(safe);
}

export function buildWhatsAppUrl(message?: string): string {
  const text =
    message ||
    'Hello SUCRE ELECTRONICS, I would like to make an enquiry about your products.';
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

export function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatOrderStatus(status: string): string {
  const map: Record<string, string> = {
    pending_payment: 'Awaiting Bank Transfer',
    payment_submitted: 'Receipt Submitted (Verifying)',
    confirmed: 'Payment Confirmed',
    processing: 'Preparing Order',
    ready_for_pickup: 'Ready for Warri Pickup',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };
  return map[status] || status.replace(/_/g, ' ');
}

export function formatBnplStatus(status: string | null): string {
  if (!status) return 'Not Started';
  const map: Record<string, string> = {
    not_started: 'Not Started',
    pending_configuration: 'Awaiting Credibly Activation',
    submitted: 'Submitted to Credibly',
    pending_review: 'Under Credibly Review',
    approved: 'Credibly Approved',
    declined: 'Credibly Declined',
  };
  return map[status] || status.replace(/_/g, ' ');
}
