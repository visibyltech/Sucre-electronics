/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { StoreProvider } from './context/StoreContext';
import {
  FloatingWhatsApp,
  Footer,
  Header,
  ScrollToTop,
  ToastBanner,
} from './components/Layout';
import { HomePage } from './pages/HomePage';
import { CategoriesPage, ShopPage } from './pages/ShopPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { PaymentConfirmationPage } from './pages/PaymentConfirmationPage';
import { SaveToBuyPage } from './pages/SaveToBuyPage';
import { BnplPage } from './pages/BnplPage';
import { AccountPage } from './pages/AccountPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import {
  AboutPage,
  ContactPage,
  DeliveryInfoPage,
  FaqPage,
  PaymentInfoPage,
  PrivacyPage,
  TermsPage,
} from './pages/InfoPages';

export default function App() {
  return (
    <BrowserRouter>
      <StoreProvider>
        <ScrollToTop />
        <div className="min-h-screen flex flex-col bg-white text-zinc-950">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/shop" element={<ShopPage mode="shop" />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/category/:slug" element={<ShopPage mode="category" />} />
              <Route path="/search" element={<ShopPage mode="search" />} />
              <Route path="/product/:slug" element={<ProductDetailPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/payment-confirmation" element={<PaymentConfirmationPage />} />
              <Route path="/save-to-buy" element={<SaveToBuyPage />} />
              <Route path="/bnpl" element={<BnplPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/payment-info" element={<PaymentInfoPage />} />
              <Route path="/delivery" element={<DeliveryInfoPage />} />
              <Route path="/faq" element={<FaqPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="*" element={<ShopPage mode="shop" />} />
            </Routes>
          </main>
          <Footer />
          <FloatingWhatsApp />
          <ToastBanner />
        </div>
      </StoreProvider>
    </BrowserRouter>
  );
}
