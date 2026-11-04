import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { CartItem } from '../services/uiStore';
import { uiStore } from '../services/uiStore';

export function CartPage() {
  const [items, setItems] = useState<CartItem[]>(uiStore.getCartItems());

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const unsub = uiStore.subscribeCartItems((cartItems) => {
      setItems(cartItems);
    });
    return () => {
      unsub();
    };
  }, []);

  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + (item.product.price || 0) * item.quantity, 0);

  const handleUpdateQty = (productId: number, newQty: number) => {
    uiStore.updateCartQuantity(productId, newQty);
  };

  const handleRemove = (productId: number) => {
    uiStore.removeFromCart(productId);
  };

  const handleCheckout = () => {
    uiStore.showToast(
      'Order Simulation',
      'This is a demonstration environment. No financial transactions are processed.',
      'info'
    );
  };

  return (
    <div className="w-full min-h-screen bg-[#F5F1EA] pt-24 pb-20">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="pb-4 text-[12px] text-[#5C5A56]">
          <ol className="flex items-center gap-1.5">
            <li>
              <Link to="/" className="hover:text-[#1B1B1B] transition-colors">
                Home
              </Link>
            </li>
            <li className="text-[#8A8278]" aria-hidden="true">
              /
            </li>
            <li className="text-[#1B1B1B] font-medium">Shopping Bag</li>
          </ol>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-baseline justify-between border-b border-[#D9D4CC] pb-6 mb-8 gap-2">
          <div>
            <span className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#8A8278] block mb-1">
              Cart Overview
            </span>
            <h1 className="font-serif text-[32px] md:text-[40px] font-light text-[#1B1B1B]">
              Shopping Bag
            </h1>
          </div>
          <p className="text-[13px] text-[#5C5A56]">
            {totalCount === 1 ? '1 piece in bag' : `${totalCount} pieces in bag`}
          </p>
        </div>

        {/* Content */}
        {items.length === 0 ? (
          /* Empty State */
          <div className="bg-[#FDFCF9] border border-[#D9D4CC] rounded-sm p-12 md:p-16 text-center max-w-xl mx-auto my-8">
            <div className="w-16 h-16 rounded-full bg-[#F5F1EA] border border-[#D9D4CC] flex items-center justify-center mx-auto mb-4 text-[#8A8278]">
              <span className="material-symbols-outlined text-[32px]">shopping_bag</span>
            </div>
            <h2 className="font-serif text-[24px] font-light text-[#1B1B1B] mb-2">
              Your bag is currently empty
            </h2>
            <p className="text-[13px] text-[#5C5A56] leading-relaxed mb-6 max-w-md mx-auto">
              Your cart is waiting to be filled. Explore our curated collections across electronics,
              fashion, home goods, and accessories.
            </p>
            <Link
              to="/search"
              className="inline-flex items-center justify-center px-6 py-3 bg-[#1B1B1B] text-[#FDFCF9] text-[13px] font-medium tracking-wide hover:bg-[#2D5A3D] transition-colors rounded-sm"
            >
              Start Shopping &rarr;
            </Link>
          </div>
        ) : (
          /* Bag Layout: Two Columns */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Line Items */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              <div className="bg-[#FDFCF9] border border-[#D9D4CC] rounded-sm divide-y divide-[#EAE6DF]">
                {items.map((item) => {
                  const maxStock = item.product.stock_quantity ?? 99;
                  const svgPlaceholder = `data:image/svg+xml,${encodeURIComponent(
                    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500"><rect width="400" height="500" fill="#F0EDE8"/><text x="200" y="250" text-anchor="middle" dominant-baseline="middle" font-family="serif" font-size="72" fill="#8A8278">${item.product.name.charAt(0)}</text></svg>`
                  )}`;

                  return (
                    <div
                      key={item.product.id}
                      className="p-4 md:p-6 flex flex-col sm:flex-row gap-4 sm:gap-6 items-start"
                    >
                      {/* Product Image */}
                      <Link
                        to={`/products/${item.product.id}`}
                        className="w-24 h-28 sm:w-28 sm:h-32 bg-[#F5F1EA] border border-[#D9D4CC] flex-shrink-0 overflow-hidden block"
                      >
                        <img
                          src={item.product.image_url || svgPlaceholder}
                          alt={item.product.name}
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (!target.dataset.fallback) {
                              target.dataset.fallback = 'true';
                              target.src = svgPlaceholder;
                            }
                          }}
                        />
                      </Link>

                      {/* Product Information */}
                      <div className="flex-1 flex flex-col justify-between self-stretch min-w-0">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-sans font-semibold tracking-[0.1em] uppercase text-[#8A8278] block">
                                {item.product.category}
                              </span>
                              <Link
                                to={`/products/${item.product.id}`}
                                className="font-serif text-[18px] font-medium text-[#1B1B1B] hover:underline underline-offset-2 decoration-1 line-clamp-2 mt-0.5"
                              >
                                {item.product.name}
                              </Link>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemove(item.product.id)}
                              aria-label={`Remove ${item.product.name}`}
                              className="text-[#8A8278] hover:text-[#8B2020] p-1 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>

                          <p className="font-serif text-[15px] font-medium text-[#1B1B1B] tabular-nums mt-1.5">
                            ₹{item.product.price.toLocaleString('en-IN')}{' '}
                            <span className="text-[12px] font-sans text-[#8A8278] font-normal">
                              each
                            </span>
                          </p>
                        </div>

                        {/* Controls Row: Stepper & Line Total */}
                        <div className="flex items-center justify-between pt-4 mt-2 border-t border-[#F5F1EA]">
                          {/* Quantity Stepper */}
                          <div className="flex items-center border border-[#D9D4CC] bg-[#FDFCF9] rounded-sm">
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(item.product.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              aria-label="Decrease quantity"
                              className="px-3 py-1 text-[#5C5A56] hover:bg-[#F5F1EA] hover:text-[#1B1B1B] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              -
                            </button>
                            <span className="px-3 py-1 text-[13px] font-medium tabular-nums text-[#1B1B1B] min-w-[32px] text-center border-x border-[#D9D4CC]">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(item.product.id, item.quantity + 1)}
                              disabled={item.quantity >= maxStock}
                              aria-label="Increase quantity"
                              className="px-3 py-1 text-[#5C5A56] hover:bg-[#F5F1EA] hover:text-[#1B1B1B] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              +
                            </button>
                          </div>

                          {/* Line Total */}
                          <div className="text-right">
                            <span className="text-[10px] text-[#8A8278] uppercase tracking-wider block">
                              Total
                            </span>
                            <span className="font-serif text-[17px] font-semibold text-[#1B1B1B] tabular-nums">
                              ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Extra Shopping Link */}
              <div className="flex justify-between items-center px-1">
                <Link
                  to="/search"
                  className="text-[13px] text-[#5C5A56] hover:text-[#1B1B1B] underline underline-offset-4 decoration-1 transition-colors"
                >
                  &larr; Continue Shopping
                </Link>
                <button
                  type="button"
                  onClick={() => uiStore.clearCart()}
                  className="text-[12px] text-[#8A8278] hover:text-[#8B2020] transition-colors"
                >
                  Clear bag
                </button>
              </div>
            </div>

            {/* Right Column: Order Summary */}
            <div className="lg:col-span-4">
              <div className="bg-[#FDFCF9] border border-[#D9D4CC] rounded-sm p-6 sticky top-24">
                <h2 className="font-serif text-[22px] font-light text-[#1B1B1B] pb-4 border-b border-[#D9D4CC]">
                  Order Summary
                </h2>

                <div className="py-4 space-y-3 text-[13px] border-b border-[#D9D4CC]">
                  <div className="flex justify-between text-[#5C5A56]">
                    <span>Items Subtotal ({totalCount})</span>
                    <span className="tabular-nums font-medium text-[#1B1B1B]">
                      ₹{subtotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#5C5A56]">
                    <span>Pan-India Shipping</span>
                    <span className="text-[#2D5A3D] font-medium uppercase tracking-wider text-[11px]">
                      Complimentary
                    </span>
                  </div>
                  <div className="flex justify-between text-[#5C5A56]">
                    <span>Estimated Tax (GST Incl.)</span>
                    <span className="tabular-nums font-medium text-[#1B1B1B]">₹0</span>
                  </div>
                </div>

                <div className="py-4 flex justify-between items-baseline">
                  <span className="font-serif text-[18px] text-[#1B1B1B]">Total</span>
                  <span className="font-serif text-[24px] font-medium text-[#1B1B1B] tabular-nums">
                    ₹{subtotal.toLocaleString('en-IN')}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCheckout}
                  className="w-full py-3.5 bg-[#1B1B1B] text-white text-[13px] font-medium tracking-wide hover:bg-[#2D5A3D] transition-colors rounded-sm flex items-center justify-center gap-2 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B1B1B]"
                >
                  <span className="material-symbols-outlined text-[18px]">lock</span>
                  <span>Proceed to Checkout</span>
                </button>

                {/* Trust Elements */}
                <div className="mt-6 pt-5 border-t border-[#EAE6DF] space-y-3 text-[11px] text-[#5C5A56]">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-[#2D5A3D]">
                      verified_user
                    </span>
                    <span>Direct-from-Brand Authenticity Guarantee</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-[#2D5A3D]">
                      local_shipping
                    </span>
                    <span>Free express delivery across India</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-[#2D5A3D]">
                      published_with_changes
                    </span>
                    <span>30-day hassle-free return guarantee</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
