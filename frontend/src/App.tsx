import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { Toast } from './components/common/Toast';
import { QuickViewModal } from './components/product/QuickViewModal';

import { HomePage } from './pages/HomePage';
import { SearchResultsPage } from './pages/SearchResultsPage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdsaLabPage } from './pages/AdsaLabPage';
import { WishlistPage } from './pages/WishlistPage';
import { CartPage } from './pages/CartPage';

export function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-[#F5F1EA] text-[#1B1B1B] font-sans">
        <Navbar />
        
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<SearchResultsPage />} />
            <Route path="/search" element={<SearchResultsPage />} />
            <Route path="/products/:id" element={<ProductDetailsPage />} />
            <Route path="/product/:id" element={<ProductDetailsPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/bag" element={<Navigate to="/cart" replace />} />
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/adsa-lab" element={<AdsaLabPage />} />
            <Route path="/adsa" element={<Navigate to="/adsa-lab" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <Footer />
        <QuickViewModal />
        <Toast />
      </div>
    </BrowserRouter>
  );
}

export default App;
