import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../../types/product';
import { uiStore } from '../../services/uiStore';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const [isWishlisted, setIsWishlisted] = useState(uiStore.isWishlisted(product.id));
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    const unsub = uiStore.subscribeWishlist(() => {
      setIsWishlisted(uiStore.isWishlisted(product.id));
    });
    return () => {
      unsub();
    };
  }, [product.id]);

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    uiStore.toggleWishlist(product);
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    uiStore.openQuickView(product);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    uiStore.addToCart(product, 1);
  };

  const svgPlaceholder = `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500"><rect width="400" height="500" fill="#F0EDE8"/><text x="200" y="250" text-anchor="middle" dominant-baseline="middle" font-family="serif" font-size="72" fill="#8A8278">${product.name.charAt(0)}</text></svg>`
  )}`;

  return (
    <div className="product-card group flex flex-col border border-[#D9D4CC] rounded-sm bg-[#FDFCF9] h-full w-full overflow-hidden relative">
      {/* Top Action: Wishlist Heart Button (Placed outside Link to prevent any unwanted navigation) */}
      <button
        type="button"
        onClick={handleWishlistToggle}
        aria-label={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
        aria-pressed={isWishlisted}
        className="absolute top-2.5 right-2.5 z-20 w-8 h-8 rounded-full bg-[#FDFCF9]/90 hover:bg-[#FDFCF9] shadow-sm flex items-center justify-center text-[#8A8278] hover:text-[#8B2020] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B1B1B]"
      >
        <span
          className={`material-symbols-outlined text-[18px] transition-colors ${isWishlisted ? 'text-[#8B2020]' : ''}`}
          style={isWishlisted ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          favorite
        </span>
      </button>

      {/* Main Clickable Area: Links directly to Product Details */}
      <Link
        to={`/products/${product.id}`}
        className="flex-1 flex flex-col cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#1B1B1B]"
      >
        {/* Image Frame */}
        <div className="relative w-full aspect-[4/5] bg-[#F5F1EA] overflow-hidden flex-shrink-0">
          <img
            src={product.image_url || svgPlaceholder}
            alt={product.name}
            className={`img-fade w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-[250ms] ${imgLoaded ? 'loaded' : ''}`}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.dataset.fallback) {
                target.dataset.fallback = 'true';
                target.src = svgPlaceholder;
              }
            }}
          />

          {/* Quick View Button on hover */}
          <div className="absolute inset-x-0 bottom-0 flex opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
            <button
              type="button"
              onClick={handleQuickView}
              className="w-full py-2.5 bg-[#1B1B1B]/90 text-white text-[11px] font-medium tracking-wide flex items-center justify-center gap-1.5 hover:bg-[#1B1B1B]"
            >
              <span className="material-symbols-outlined text-[15px]">visibility</span>
              Quick View
            </button>
          </div>
        </div>

        {/* Content */}
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

      {/* Add to Bag (Always stays in-place, never navigates away) */}
      <div className="px-3 pb-3 pt-2">
        <button
          type="button"
          onClick={handleAddToCart}
          className="w-full py-2 bg-[#1B1B1B] text-white text-[12px] font-medium tracking-wide hover:bg-[#2D5A3D] transition-colors active:scale-[0.99] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#1B1B1B]"
        >
          Add to Bag
        </button>
      </div>
    </div>
  );
}
