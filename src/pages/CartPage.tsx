import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatNaira } from '../lib/format';
import { BackBar } from '../components/Layout';

export function CartPage() {
  const { cart, cartSubtotal, updateQuantity, removeFromCart } = useStore();
  const navigate = useNavigate();

  const estimatedDelivery = cartSubtotal >= 800000 || cartSubtotal === 0 ? 0 : 5000;
  const estimatedTotal = cartSubtotal + estimatedDelivery;

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <BackBar label="Back" fallbackTo="/shop" />

      <h1 className="font-display text-2xl sm:text-4xl font-bold text-zinc-950 mb-6">
        Shopping Cart
      </h1>

      {cart.length === 0 ? (
        <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-10 text-center space-y-4">
          <ShoppingBag className="w-10 h-10 text-zinc-400 mx-auto" />
          <h2 className="font-display text-xl font-bold text-zinc-950">Your cart is empty</h2>
          <p className="text-sm text-zinc-600 max-w-md mx-auto">
            Browse our genuine televisions, inverter refrigerators, deep freezers, generators, and
            home appliances.
          </p>
          <div className="pt-2">
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#09090B] text-white text-sm font-semibold hover:bg-zinc-800 transition-colors"
            >
              <span>Continue Shopping</span>
              <ArrowRight className="w-4 h-4 text-[#F5C518]" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Items List */}
          <div className="lg:col-span-8 space-y-4">
            {cart.map((item) => (
              <div
                key={item.productId}
                className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-zinc-200 bg-white"
              >
                <Link
                  to={`/product/${item.slug}`}
                  className="w-full sm:w-28 aspect-[4/3] rounded-lg bg-zinc-100 overflow-hidden shrink-0"
                >
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </Link>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-zinc-500">{item.brand}</p>
                  <Link
                    to={`/product/${item.slug}`}
                    className="font-display text-base font-semibold text-zinc-950 hover:underline line-clamp-2"
                  >
                    {item.name}
                  </Link>
                  <p className="font-mono text-sm font-semibold text-zinc-900 mt-1 tabular-nums">
                    {formatNaira(item.unitPrice)} each
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100">
                  <div className="inline-flex items-center border border-zinc-300 rounded-lg bg-white">
                    <button
                      type="button"
                      aria-label={`Decrease ${item.name} quantity`}
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="w-9 h-9 flex items-center justify-center text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-10 text-center font-mono text-sm font-semibold tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label={`Increase ${item.name} quantity`}
                      disabled={item.quantity >= item.stock}
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="w-9 h-9 flex items-center justify-center text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-right min-w-[100px]">
                    <p className="font-mono text-sm font-bold text-zinc-950 tabular-nums">
                      {formatNaira(item.unitPrice * item.quantity)}
                    </p>
                  </div>

                  <button
                    type="button"
                    aria-label={`Remove ${item.name}`}
                    onClick={() => removeFromCart(item.productId)}
                    className="p-2 text-zinc-400 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            <div className="pt-2">
              <Link
                to="/shop"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-700 hover:text-zinc-950"
              >
                ← Continue Shopping
              </Link>
            </div>
          </div>

          {/* Order Summary */}
          <aside className="lg:col-span-4 bg-zinc-50 border border-zinc-200 rounded-2xl p-6 space-y-4 lg:sticky lg:top-24">
            <h2 className="font-display text-lg font-bold text-zinc-950">Order Summary</h2>

            <div className="space-y-2.5 text-sm border-b border-zinc-200 pb-4">
              <div className="flex justify-between">
                <span className="text-zinc-600">Subtotal</span>
                <span className="font-mono font-semibold text-zinc-950 tabular-nums">
                  {formatNaira(cartSubtotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">Warri Home Delivery</span>
                <span className="font-mono font-semibold text-zinc-950 tabular-nums">
                  {estimatedDelivery === 0 ? 'Free' : formatNaira(estimatedDelivery)}
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Free Warri delivery on orders from ₦800,000, or ₦0 on Warri Showroom Pickup.
              </p>
            </div>

            <div className="flex justify-between items-baseline">
              <span className="font-display text-base font-bold text-zinc-950">Estimated Total</span>
              <span className="font-mono text-xl font-bold text-zinc-950 tabular-nums">
                {formatNaira(estimatedTotal)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => navigate('/checkout')}
              className="w-full py-3.5 min-h-[48px] rounded-lg bg-[#09090B] text-white font-semibold text-sm hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4 text-[#F5C518]" />
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}
