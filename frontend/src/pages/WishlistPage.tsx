import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../types/product';
import { uiStore } from '../services/uiStore';

export function WishlistPage() {
  const [products, setProducts] = useState<Product[]>(uiStore.getWishlistProducts());

  useEffect(() => {
    // Scroll to top on page load
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const unsub = uiStore.subscribeWishlistProducts((items) => {
      setProducts(items);
    });
    return () => {
      unsub();
    };
  }, []);

  const handleRemove = (productId: number) => {
    uiStore.removeFromWishlist(productId);
  };

  const handleMoveToBag = (product: Product) => {
    uiStore.moveToBag(product);
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
            <li className="text-[#1B1B1B] font-medium">Wishlist</li>
          </ol>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-baseline justify-between border-b border-[#D9D4CC] pb-6 mb-8 gap-2">
          <div>
            <span className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#8A8278] block mb-1">
              Personal Collection
            </span>
            <h1 className="font-serif text-[32px] md:text-[40px] font-light text-[#1B1B1B]">
              Your Wishlist
            </h1>
          </div>
          <p className="text-[13px] text-[#5C5A56]">
            {products.length === 1 ? '1 item saved' : `${products.length} items saved`}
          </p>
        </div>

        {/* Content */}
        {products.length === 0 ? (
          /* Empty State */
          <div className="bg-[#FDFCF9] border border-[#D9D4CC] rounded-sm p-12 md:p-16 text-center max-w-xl mx-auto my-8">
            <div className="w-16 h-16 rounded-full bg-[#F5F1EA] border border-[#D9D4CC] flex items-center justify-center mx-auto mb-4 text-[#8A8278]">
              <span className="material-symbols-outlined text-[32px]">favorite</span>
            </div>
            <h2 className="font-serif text-[24px] font-light text-[#1B1B1B] mb-2">
              Your wishlist is currently empty
            </h2>
            <p className="text-[13px] text-[#5C5A56] leading-relaxed mb-6 max-w-md mx-auto">
              Save pieces you admire by tapping the heart icon on any product. They will wait right
              here until you are ready to make them yours.
            </p>
            <Link
              to="/search"
              className="inline-flex items-center justify-center px-6 py-3 bg-[#1B1B1B] text-[#FDFCF9] text-[13px] font-medium tracking-wide hover:bg-[#2D5A3D] transition-colors rounded-sm"
            >
              Explore Catalogue &rarr;
            </Link>
          </div>
        ) : (
          /* Wishlist Grid */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => {
              const svgPlaceholder = `data:image/svg+xml,${encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500"><rect width="400" height="500" fill="#F0EDE8"/><text x="200" y="250" text-anchor="middle" dominant-baseline="middle" font-family="serif" font-size="72" fill="#8A8278">${product.name.charAt(0)}</text></svg>`
              )}`;

              return (
                <div
                  key={product.id}
                  className="product-card group flex flex-col border border-[#D9D4CC] rounded-sm bg-[#FDFCF9] h-full w-full overflow-hidden relative"
                >
                  {/* Remove Button (top-right) */}
                  <button
                    type="button"
                    onClick={() => handleRemove(product.id)}
                    aria-label={`Remove ${product.name} from wishlist`}
                    className="absolute top-2.5 right-2.5 z-20 w-8 h-8 rounded-full bg-[#FDFCF9]/90 hover:bg-[#FDFCF9] shadow-sm flex items-center justify-center text-[#8A8278] hover:text-[#8B2020] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B1B1B]"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>

                  {/* Product Click Area */}
                  <Link
                    to={`/products/${product.id}`}
                    className="flex-1 flex flex-col cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#1B1B1B]"
                  >
                    <div className="relative w-full aspect-[4/5] bg-[#F5F1EA] overflow-hidden flex-shrink-0">
                      <img
                        src={product.image_url || svgPlaceholder}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-[250ms]"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.dataset.fallback) {
                            target.dataset.fallback = 'true';
                            target.src = svgPlaceholder;
                          }
                        }}
                      />
                    </div>

                    <div className="px-3 pt-3 pb-1 flex-1 flex flex-col">
                      <span className="text-[10px] font-sans font-semibold tracking-[0.1em] uppercase text-[#8A8278]">
                        {product.category}
                      </span>
                      <h3 className="font-sans text-[14px] font-medium text-[#1B1B1B] leading-snug line-clamp-2 mt-1 flex-1">
                        {product.name}
                      </h3>
                      <p className="font-serif text-[16px] font-medium text-[#1B1B1B] tabular-nums mt-2">
                        ₹{product.price.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </Link>

                  {/* Actions: Move to Bag & Remove */}
                  <div className="p-3 pt-2 flex flex-col gap-1.5 border-t border-[#EAE6DF]">
                    <button
                      type="button"
                      onClick={() => handleMoveToBag(product)}
                      className="w-full py-2 bg-[#1B1B1B] text-white text-[12px] font-medium tracking-wide hover:bg-[#2D5A3D] transition-colors active:scale-[0.99] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#1B1B1B]"
                    >
                      Move to Bag
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(product.id)}
                      className="w-full py-1 text-[11px] text-[#5C5A56] hover:text-[#8B2020] transition-colors"
                    >
                      Remove from saved
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
