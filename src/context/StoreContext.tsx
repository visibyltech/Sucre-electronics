import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { CartItem, Category, PaymentConfig, Product, User } from '../types';

interface ToastMessage {
  id: number;
  text: string;
  tone: 'success' | 'error' | 'info';
}

interface StoreContextValue {
  cart: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  addToCart: (product: Product, quantity?: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  removeFromCart: (productId: number) => void;
  clearCart: () => void;
  user: User | null;
  token: string | null;
  authLoading: boolean;
  loginWithToken: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  categories: Category[];
  paymentConfig: PaymentConfig | null;
  toast: ToastMessage | null;
  showToast: (text: string, tone?: 'success' | 'error' | 'info') => void;
  dismissToast: () => void;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

const CART_STORAGE_KEY = 'sucre_electronics_cart_v1';
const TOKEN_STORAGE_KEY = 'sucre_electronics_token_v1';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(Boolean(token));
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore storage errors
    }
  }, [cart]);

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.categories)) setCategories(d.categories);
      })
      .catch(() => {});

    fetch('/api/config/payment')
      .then((r) => r.json())
      .then((d) => {
        if (d.business) setPaymentConfig(d);
      })
      .catch(() => {});
  }, []);

  const refreshUser = async () => {
    const activeToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!activeToken) {
      setUser(null);
      setAuthLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (!res.ok) {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken(null);
        setUser(null);
      } else {
        const data = await res.json();
        setUser(data.user);
      }
    } catch {
      // keep state resilient
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, [token]);

  const showToast = (text: string, tone: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToast({ id, text, tone });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3800);
    return () => clearTimeout(timer);
  }, [toast]);

  const addToCart = (product: Product, quantity = 1) => {
    if (product.stock <= 0) {
      showToast('This product is currently out of stock.', 'error');
      return;
    }
    const qtyToAdd = Math.max(1, quantity);
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        const nextQty = Math.min(product.stock, existing.quantity + qtyToAdd);
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: nextQty, stock: product.stock } : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          slug: product.slug,
          name: product.name,
          brand: product.brand,
          unitPrice: product.effectivePrice,
          originalPrice: product.price,
          image: product.images[0] || '',
          quantity: Math.min(product.stock, qtyToAdd),
          stock: product.stock,
        },
      ];
    });
    showToast(`Added "${product.name}" to your cart.`);
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.min(item.stock, Math.max(1, quantity)) }
          : item
      )
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = () => setCart([]);

  const loginWithToken = (newToken: string, newUser: User) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
    showToast('You have signed out.', 'info');
  };

  const cartCount = useMemo(() => cart.reduce((acc, i) => acc + i.quantity, 0), [cart]);
  const cartSubtotal = useMemo(
    () => cart.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0),
    [cart]
  );

  return (
    <StoreContext.Provider
      value={{
        cart,
        cartCount,
        cartSubtotal,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        user,
        token,
        authLoading,
        loginWithToken,
        logout,
        refreshUser,
        categories,
        paymentConfig,
        toast,
        showToast,
        dismissToast: () => setToast(null),
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
