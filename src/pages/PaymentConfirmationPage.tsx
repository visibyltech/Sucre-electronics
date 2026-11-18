import React, { useState } from 'react';
import { Building2, Copy, Check, Search } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatNaira, formatOrderStatus } from '../lib/format';
import { BackBar } from '../components/Layout';
import { ReceiptUploadForm } from '../components/ReceiptUploadForm';

export function PaymentConfirmationPage() {
  const { paymentConfig, showToast } = useStore();
  const [lookupRef, setLookupRef] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupError, setLookupError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const banks = paymentConfig?.bankAccounts || [
    { id: 'union', bankName: 'Union Bank', accountName: 'SUCRE ELECTRONICS', accountNumber: '0180490612' },
    { id: 'zenith', bankName: 'Zenith Bank', accountName: 'SUCRE ELECTRONICS', accountNumber: '1016639318' },
  ];

  const handleCopy = async (acct: string, name: string) => {
    try {
      await navigator.clipboard.writeText(acct);
      setCopied(name);
      showToast(`${name} account number copied.`);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      showToast(`Account number: ${acct}`, 'info');
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError('');
    setLookupResult(null);
    const ref = lookupRef.trim().toUpperCase();
    if (!ref) return;

    try {
      const endpoint = ref.startsWith('STB-')
        ? `/api/save-to-buy/lookup/${encodeURIComponent(ref)}`
        : `/api/orders/lookup/${encodeURIComponent(ref)}`;
      const res = await fetch(endpoint);
      const data = await res.json();
      if (!res.ok) {
        setLookupError(data.error || 'Reference not found.');
        return;
      }
      setLookupResult(data.order || data.plan);
    } catch {
      setLookupError('Unable to verify reference right now.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      <BackBar label="Back" fallbackTo="/" />

      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-zinc-950">
          Payment Confirmation & Receipt Upload
        </h1>
        <p className="mt-2 text-sm sm:text-base text-zinc-600 max-w-2xl">
          Transferred to SUCRE ELECTRONICS for an order or Save to Buy installment? Upload your
          proof of payment below so our accounts team can verify and confirm.
        </p>
      </div>

      {/* Bank Accounts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {banks.map((bank) => (
          <div
            key={bank.id}
            className="p-5 rounded-xl border border-zinc-200 bg-zinc-50 flex items-center justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2 text-zinc-950 font-display font-bold text-lg">
                <Building2 className="w-5 h-5 text-[#B88D00]" />
                <span>{bank.bankName}</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">{bank.accountName}</p>
              <p className="font-mono text-xl font-bold text-zinc-950 mt-1 tabular-nums">
                {bank.accountNumber}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(bank.accountNumber, bank.bankName)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-[#09090B] text-white text-xs font-semibold hover:bg-zinc-800 cursor-pointer"
            >
              {copied === bank.bankName ? <Check className="w-3.5 h-3.5 text-[#F5C518]" /> : <Copy className="w-3.5 h-3.5 text-[#F5C518]" />}
              <span>{copied === bank.bankName ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        ))}
      </div>

      {/* Optional Reference Lookup */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4">
        <h2 className="font-display text-lg font-bold text-zinc-950">
          Check Order or Plan Status (Optional)
        </h2>
        <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={lookupRef}
            onChange={(e) => setLookupRef(e.target.value)}
            placeholder="Enter Order Ref (SUC-...) or Save to Buy Ref (STB-...)"
            className="flex-1 h-11 px-4 rounded-lg border border-zinc-300 font-mono text-sm uppercase focus:outline-none focus:border-zinc-950"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 px-5 h-11 rounded-lg bg-[#F5C518] text-zinc-950 font-semibold text-sm hover:bg-[#E0B00B] cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>Check Reference</span>
          </button>
        </form>

        {lookupError && <p className="text-sm text-red-600">{lookupError}</p>}

        {lookupResult && (
          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-sm space-y-1.5">
            <p className="font-semibold text-zinc-950">
              Reference: <span className="font-mono">{lookupResult.order_ref || lookupResult.plan_ref}</span>
            </p>
            <p className="text-zinc-600">Customer: {lookupResult.customer_name}</p>
            <p className="text-zinc-600">
              Total Amount: <span className="font-mono font-semibold">{formatNaira(lookupResult.total_amount || lookupResult.total_price)}</span>
              {' · '}
              Paid: <span className="font-mono font-semibold">{formatNaira(lookupResult.amount_paid)}</span>
            </p>
            <p className="text-zinc-800 font-medium">
              Status: {lookupResult.order_status ? formatOrderStatus(lookupResult.order_status) : lookupResult.status}
            </p>
          </div>
        )}
      </div>

      {/* Receipt Upload Form */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 space-y-4">
        <h2 className="font-display text-xl font-bold text-zinc-950">Submit Proof of Payment</h2>
        <ReceiptUploadForm
          defaultReference={lookupResult?.order_ref || lookupResult?.plan_ref || ''}
          defaultAmount={lookupResult?.total_amount || lookupResult?.initial_deposit_amount}
        />
      </div>
    </div>
  );
}
