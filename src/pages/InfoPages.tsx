import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  CheckCircle2,
  Building2,
  Copy,
  Check,
  ChevronDown,
  Truck,
  Store,
} from 'lucide-react';
import {
  BUSINESS_EMAIL,
  BUSINESS_LOCATION,
  DISPLAY_PHONE,
  HERO_SHOWROOM_URL,
  buildWhatsAppUrl,
} from '../lib/format';
import { BackBar } from '../components/Layout';
import { useStore } from '../context/StoreContext';
import { submitContactResilient } from '../lib/api';

export function ContactPage() {
  const { showToast } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setError('Please complete all required fields.');
      return;
    }
    setSending(true);
    try {
      const result = await submitContactResilient({ name, email, phone, subject, message });
      if (!result.ok) {
        setError(result.error || 'Could not send message.');
        return;
      }
      setSent(true);
      showToast('Message sent to SUCRE ELECTRONICS.');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      <BackBar label="Back" fallbackTo="/" />

      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-zinc-950">
          Contact SUCRE ELECTRONICS
        </h1>
        <p className="mt-2 text-sm sm:text-base text-zinc-600 max-w-2xl">
          Reach our Warri, Delta State showroom for product availability, bulk orders, Save to Buy
          assistance, or delivery coordination.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#09090B] text-white rounded-2xl p-6 space-y-5">
            <h2 className="font-display text-xl font-bold text-[#F5C518]">Business Details</h2>
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#F5C518] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Showroom Location</p>
                  <p className="text-zinc-300">{BUSINESS_LOCATION}</p>
                </div>
              </div>

              <a
                href={`tel:${DISPLAY_PHONE}`}
                className="flex items-start gap-3 hover:text-[#F5C518] transition-colors"
              >
                <Phone className="w-5 h-5 text-[#F5C518] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Phone Call</p>
                  <p className="font-mono text-zinc-300">{DISPLAY_PHONE}</p>
                </div>
              </a>

              <a
                href={`mailto:${BUSINESS_EMAIL}`}
                className="flex items-start gap-3 hover:text-[#F5C518] transition-colors"
              >
                <Mail className="w-5 h-5 text-[#F5C518] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Email Support</p>
                  <p className="text-zinc-300">{BUSINESS_EMAIL}</p>
                </div>
              </a>
            </div>

            <a
              href={buildWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#25D366] text-zinc-950 font-bold text-sm hover:bg-[#20BD5A] transition-colors"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>Chat on WhatsApp ({DISPLAY_PHONE})</span>
            </a>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8">
          {sent ? (
            <div className="py-8 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-700 mx-auto" />
              <h2 className="font-display text-xl font-bold text-zinc-950">Inquiry Received</h2>
              <p className="text-sm text-zinc-600">
                Thank you for messaging SUCRE ELECTRONICS. Our team will contact you shortly.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setName('');
                  setEmail('');
                  setPhone('');
                  setSubject('');
                  setMessage('');
                }}
                className="px-5 py-2.5 rounded-lg bg-[#09090B] text-white text-xs font-semibold cursor-pointer"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="font-display text-xl font-bold text-zinc-950">Send Us a Message</h2>
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Phone / WhatsApp</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Subject *</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Product enquiry, bulk quote, or support"
                    className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Message *</label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-3.5 rounded-lg border border-zinc-300 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={sending}
                className="px-6 py-3.5 rounded-lg bg-[#09090B] text-white font-semibold text-sm hover:bg-zinc-800 cursor-pointer"
              >
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      <BackBar label="Back" fallbackTo="/" />
      <h1 className="font-display text-3xl sm:text-4xl font-bold text-zinc-950">
        About SUCRE ELECTRONICS
      </h1>
      <div className="aspect-[16/7] rounded-2xl overflow-hidden bg-zinc-900">
        <img src={HERO_SHOWROOM_URL} alt="SUCRE ELECTRONICS Showroom" className="w-full h-full object-cover" />
      </div>
      <div className="space-y-4 text-base text-zinc-700 leading-relaxed">
        <p>
          Headquartered in Warri, Delta State, Nigeria, <strong>SUCRE ELECTRONICS</strong> supplies
          authentic home appliances, televisions, cooling systems, power generators, and mobile
          electronics to families, offices, and hospitality businesses.
        </p>
        <p>
          Every appliance we stock—from Samsung and LG 4K televisions to Haier Thermocool deep
          freezers and Sumec Firman copper-coil generators—is sourced directly through official
          distributors with verifiable manufacturer warranties.
        </p>
        <p>
          We designed our online store around real Nigerian household cashflows: pay outright via
          bank transfer, lock in a product with a 30% deposit on Save to Buy, or apply for Credibly
          Buy Now Pay Later financing.
        </p>
      </div>
      <div className="flex flex-wrap gap-3 pt-2">
        <Link to="/shop" className="px-5 py-3 rounded-lg bg-[#09090B] text-white text-sm font-semibold">
          Explore Storefront
        </Link>
        <Link to="/contact" className="px-5 py-3 rounded-lg border border-zinc-300 text-sm font-semibold">
          Contact Warri Showroom
        </Link>
      </div>
    </div>
  );
}

export function PaymentInfoPage() {
  const { paymentConfig, showToast } = useStore();
  const [copied, setCopied] = useState<string | null>(null);
  const banks = paymentConfig?.bankAccounts || [
    { id: 'union', bankName: 'Union Bank', accountName: 'SUCRE ELECTRONICS', accountNumber: '0180490612' },
    { id: 'zenith', bankName: 'Zenith Bank', accountName: 'SUCRE ELECTRONICS', accountNumber: '1016639318' },
  ];

  const copy = async (num: string, name: string) => {
    await navigator.clipboard.writeText(num);
    setCopied(name);
    showToast(`${name} account number copied.`);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      <BackBar label="Back" fallbackTo="/" />
      <h1 className="font-display text-3xl sm:text-4xl font-bold text-zinc-950">
        Payment Information & Official Bank Accounts
      </h1>
      <p className="text-sm sm:text-base text-zinc-600">
        All bank transfers for Pay Now orders and Save to Buy deposits must be sent exclusively to
        the verified SUCRE ELECTRONICS corporate accounts below.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {banks.map((b) => (
          <div key={b.id} className="p-6 rounded-2xl border border-zinc-200 bg-zinc-50 space-y-3">
            <div className="flex items-center gap-2 font-display text-lg font-bold text-zinc-950">
              <Building2 className="w-5 h-5 text-[#B88D00]" />
              <span>{b.bankName}</span>
            </div>
            <p className="text-sm text-zinc-600">
              Account Name: <strong className="text-zinc-950">{b.accountName}</strong>
            </p>
            <div className="flex items-center justify-between pt-1">
              <span className="font-mono text-2xl font-bold text-zinc-950 tabular-nums">
                {b.accountNumber}
              </span>
              <button
                type="button"
                onClick={() => copy(b.accountNumber, b.bankName)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#F5C518] text-zinc-950 text-xs font-bold cursor-pointer"
              >
                {copied === b.bankName ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied === b.bankName ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 rounded-xl border border-zinc-200 bg-white space-y-2">
          <h2 className="font-display font-bold text-zinc-950">1. Buy Now — Pay Now</h2>
          <p className="text-sm text-zinc-600">
            Transfer the full order total, upload your receipt on checkout or the confirmation page,
            and receive dispatch once confirmed.
          </p>
        </div>
        <div className="p-5 rounded-xl border border-zinc-200 bg-white space-y-2">
          <h2 className="font-display font-bold text-zinc-950">2. Save to Buy (30% Min)</h2>
          <p className="text-sm text-zinc-600">
            Reserve any product with at least 30% deposit and complete the balance in weekly or
            monthly installments before release.
          </p>
        </div>
        <div className="p-5 rounded-xl border border-zinc-200 bg-white space-y-2">
          <h2 className="font-display font-bold text-zinc-950">3. Credibly BNPL</h2>
          <p className="text-sm text-zinc-600">
            Apply for appliance financing directly through Credibly on eligible electronics.
          </p>
        </div>
      </div>

      <Link
        to="/payment-confirmation"
        className="inline-block px-6 py-3 rounded-lg bg-[#09090B] text-white text-sm font-semibold"
      >
        Upload a Payment Receipt
      </Link>
    </div>
  );
}

export function DeliveryInfoPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      <BackBar label="Back" fallbackTo="/" />
      <h1 className="font-display text-3xl sm:text-4xl font-bold text-zinc-950">
        Delivery & Showroom Pickup Information
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="p-6 rounded-2xl border border-zinc-200 bg-zinc-50 space-y-2">
          <Truck className="w-6 h-6 text-[#B88D00]" />
          <h2 className="font-display text-lg font-bold text-zinc-950">Warri & Delta Delivery</h2>
          <p className="text-sm text-zinc-600 leading-relaxed">
            Flat ₦5,000 delivery within Warri and environs, or free delivery on orders from
            ₦800,000 and above. Heavy appliances are tested on delivery.
          </p>
        </div>
        <div className="p-6 rounded-2xl border border-zinc-200 bg-zinc-50 space-y-2">
          <Store className="w-6 h-6 text-[#B88D00]" />
          <h2 className="font-display text-lg font-bold text-zinc-950">Warri Showroom Pickup</h2>
          <p className="text-sm text-zinc-600 leading-relaxed">
            Free pickup in Warri, Delta State after payment confirmation. Bring your Order
            Reference or Save to Buy Plan Reference.
          </p>
        </div>
      </div>
    </div>
  );
}

export function FaqPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const faqs = [
    {
      q: 'How does Save to Buy — Pay Small Small work?',
      a: 'Choose your product, commit a minimum 30% initial deposit, and select weekly or monthly installments over 2 to 6 months. Upload each transfer receipt as you pay. Once 100% of the balance is confirmed, your item is released for delivery or Warri pickup.',
    },
    {
      q: 'Which bank accounts belong to SUCRE ELECTRONICS?',
      a: 'We operate Union Bank (0180490612, SUCRE ELECTRONICS) and Zenith Bank (1016639318, SUCRE ELECTRONICS). Always confirm the account name before transferring.',
    },
    {
      q: 'When will my product be released on Save to Buy?',
      a: 'Products are reserved immediately after your initial deposit is confirmed and released for delivery or pickup only after the full product price has been paid and verified.',
    },
    {
      q: 'How do I apply for Buy Now Pay Later (Credibly)?',
      a: 'Open any eligible product or visit the Buy Now Pay Later page, enter your details, and proceed to the Credibly financing flow. Approvals are decided directly by Credibly.',
    },
    {
      q: 'Do products come with warranties?',
      a: 'Yes. All appliances are brand new and covered by manufacturer warranties ranging from 1 to 10 years depending on the brand and compressor class.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      <BackBar label="Back" fallbackTo="/" />
      <h1 className="font-display text-3xl sm:text-4xl font-bold text-zinc-950">
        Frequently Asked Questions
      </h1>
      <div className="divide-y divide-zinc-200 border border-zinc-200 rounded-2xl overflow-hidden bg-white">
        {faqs.map((f, i) => (
          <div key={i} className="p-5">
            <button
              type="button"
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              className="w-full flex items-center justify-between gap-4 text-left font-display font-bold text-zinc-950 cursor-pointer"
            >
              <span>{f.q}</span>
              <ChevronDown className={`w-5 h-5 shrink-0 transition-transform ${openIdx === i ? 'rotate-180' : ''}`} />
            </button>
            {openIdx === i && <p className="mt-3 text-sm text-zinc-600 leading-relaxed">{f.a}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
      <BackBar label="Back" fallbackTo="/" />
      <h1 className="font-display text-3xl font-bold text-zinc-950">Privacy Policy</h1>
      <div className="space-y-4 text-sm text-zinc-700 leading-relaxed">
        <p>
          SUCRE ELECTRONICS collects only the customer information necessary to process orders,
          manage Save to Buy installment plans, verify bank transfer receipts, and deliver
          appliances across Warri and Delta State.
        </p>
        <p>
          Uploaded transfer receipts are stored securely and accessed solely by authorized store
          administrators for payment verification. We never sell or share customer phone numbers,
          addresses, or email records with unauthorized third parties.
        </p>
        <p>
          For privacy requests, email <a href={`mailto:${BUSINESS_EMAIL}`} className="underline">{BUSINESS_EMAIL}</a> or call {DISPLAY_PHONE}.
        </p>
      </div>
    </div>
  );
}

export function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
      <BackBar label="Back" fallbackTo="/" />
      <h1 className="font-display text-3xl font-bold text-zinc-950">Terms & Conditions</h1>
      <div className="space-y-4 text-sm text-zinc-700 leading-relaxed">
        <p>
          1. <strong>Orders & Bank Transfers:</strong> Pay Now orders are confirmed upon
          verification of bank transfer funds into our Union Bank or Zenith Bank corporate account.
        </p>
        <p>
          2. <strong>Save to Buy — Pay Small Small:</strong> Minimum 30% initial deposit is
          required to reserve a product. Products remain in SUCRE ELECTRONICS custody and are
          released for delivery or showroom pickup strictly after 100% full payment confirmation.
        </p>
        <p>
          3. <strong>Credibly BNPL:</strong> Financing eligibility and credit decisions are
          governed exclusively by Credibly’s financing terms.
        </p>
        <p>
          4. <strong>Warranty & Inspection:</strong> Customers are encouraged to inspect appliances
          at delivery or showroom pickup. Manufacturer warranty terms apply to all factory-sealed items.
        </p>
      </div>
    </div>
  );
}
