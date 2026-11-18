import React, { useState } from 'react';
import { Upload, CheckCircle2, FileText, AlertCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatNaira } from '../lib/format';
import type { PaymentReceipt } from '../types';
import { submitReceiptResilient } from '../lib/api';

interface ReceiptUploadFormProps {
  defaultReference?: string;
  defaultBank?: string;
  defaultAmount?: number;
  defaultName?: string;
  defaultEmail?: string;
  onSuccess?: (receipt: PaymentReceipt) => void;
}

export function ReceiptUploadForm({
  defaultReference = '',
  defaultBank = 'Union Bank',
  defaultAmount,
  defaultName = '',
  defaultEmail = '',
  onSuccess,
}: ReceiptUploadFormProps) {
  const { token, user, showToast } = useStore();
  const [reference, setReference] = useState(defaultReference);
  const [bankName, setBankName] = useState(defaultBank);
  const [amountClaimed, setAmountClaimed] = useState(defaultAmount ? String(defaultAmount) : '');
  const [senderName, setSenderName] = useState(defaultName || user?.fullName || '');
  const [customerEmail, setCustomerEmail] = useState(defaultEmail || user?.email || '');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedReceipt, setSubmittedReceipt] = useState<PaymentReceipt | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(selected.type)) {
      setError('Please select a JPG, PNG, WebP image or PDF document.');
      return;
    }
    if (selected.size > 5 * 1024 * 1024) {
      setError('Receipt file must be 5MB or smaller.');
      return;
    }
    setError('');
    setFile(selected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!reference.trim() || !senderName.trim() || !amountClaimed || !file) {
      setError('Please provide the reference code, sender name, amount, and receipt file.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('reference', reference.trim().toUpperCase());
      formData.append('bankName', bankName);
      formData.append('amountClaimed', amountClaimed);
      formData.append('senderName', senderName.trim());
      formData.append('customerName', senderName.trim());
      formData.append('customerEmail', customerEmail.trim());
      formData.append('transferDate', transferDate);
      formData.append('notes', notes.trim());
      formData.append('receipt', file);

      const result = await submitReceiptResilient(formData, file, token);
      if (!result.ok || !result.receipt) {
        setError(result.error || 'Could not upload receipt.');
        return;
      }

      setSubmittedReceipt(result.receipt);
      showToast('Payment receipt uploaded and received for verification.');
      onSuccess?.(result.receipt);
    } catch {
      setError('Network error while uploading receipt. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedReceipt) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 space-y-3">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-display text-lg font-bold text-emerald-950">
              Payment Receipt Received
            </h4>
            <p className="text-sm text-emerald-800 mt-1">
              Receipt <span className="font-mono font-semibold">{submittedReceipt.receipt_ref}</span>{' '}
              for <span className="font-mono font-semibold">{submittedReceipt.order_or_plan_ref}</span>{' '}
              ({formatNaira(submittedReceipt.amount_claimed)}) has been submitted to our Warri
              accounts team for confirmation.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setSubmittedReceipt(null);
            setFile(null);
          }}
          className="text-xs font-semibold text-emerald-900 underline hover:no-underline cursor-pointer"
        >
          Upload another receipt
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
            Order or Save to Buy Reference *
          </label>
          <input
            type="text"
            required
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. SUC-4821-A1B2 or STB-1920-C3D4"
            className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 bg-white text-sm font-mono uppercase focus:outline-none focus:border-zinc-950"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
            SUCRE ELECTRONICS Bank Paid Into *
          </label>
          <select
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-none focus:border-zinc-950"
          >
            <option value="Union Bank">Union Bank (0180490612)</option>
            <option value="Zenith Bank">Zenith Bank (1016639318)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
            Amount Transferred (₦) *
          </label>
          <input
            type="number"
            required
            min={100}
            value={amountClaimed}
            onChange={(e) => setAmountClaimed(e.target.value)}
            placeholder="e.g. 250000"
            className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 bg-white text-sm font-mono focus:outline-none focus:border-zinc-950"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
            Account Holder / Sender Name *
          </label>
          <input
            type="text"
            required
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            placeholder="Name on sending bank account"
            className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-none focus:border-zinc-950"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
            Customer Email
          </label>
          <input
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-none focus:border-zinc-950"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
            Transfer Date *
          </label>
          <input
            type="date"
            required
            value={transferDate}
            onChange={(e) => setTransferDate(e.target.value)}
            className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-none focus:border-zinc-950"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
          Upload Bank Transfer Receipt (JPG, PNG, WebP, or PDF · Max 5MB) *
        </label>
        <label className="flex flex-col items-center justify-center w-full min-h-[120px] px-4 py-5 border-2 border-dashed border-zinc-300 rounded-xl bg-zinc-50 hover:bg-zinc-100 transition-colors cursor-pointer text-center">
          {file ? (
            <div className="flex items-center gap-2.5 text-zinc-900">
              <FileText className="w-5 h-5 text-[#B88D00]" />
              <span className="text-sm font-medium">{file.name}</span>
              <span className="text-xs text-zinc-500">
                ({(file.size / 1024).toFixed(0)} KB)
              </span>
            </div>
          ) : (
            <>
              <Upload className="w-6 h-6 text-zinc-500 mb-2" />
              <span className="text-sm font-medium text-zinc-800">
                Tap to select transfer screenshot or PDF receipt
              </span>
              <span className="text-xs text-zinc-500 mt-1">
                Stored securely and linked to your reference
              </span>
            </>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      </div>

      <div>
        <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
          Transfer Narration / Optional Notes
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional transfer session ID or remarks"
          className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-none focus:border-zinc-950"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full sm:w-auto px-6 py-3 min-h-[44px] rounded-lg bg-[#09090B] text-white font-semibold text-sm hover:bg-zinc-800 transition-colors disabled:opacity-50 cursor-pointer"
      >
        {submitting ? 'Uploading Receipt...' : 'Submit Payment Receipt'}
      </button>
    </form>
  );
}
