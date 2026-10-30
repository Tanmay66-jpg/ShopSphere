import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../../types/product';
import { uiStore } from '../../services/uiStore';

export function QuickViewModal() {
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const unsub = uiStore.subscribeQuickView((p) => {
      setProduct(p);
      setQuantity(1);
    });
    return () => {
      unsub();
    };
  }, []);

  if (!product) return null;

  const handleClose = () => uiStore.closeQuickView();

  const handleAdd = () => {
    uiStore.addToCart(product, quantity);
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f172a]/45 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-[0_25px_50px_-12px_rgba(15,23,42,0.25)] border border-[#e2e8f0] overflow-hidden flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-[#464555] hover:text-[#1a1c1d] shadow-sm transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>

        {/* Product Media */}
        <div className="md:w-1/2 bg-[#f8fafc] p-6 flex items-center justify-center relative overflow-hidden">
          <img
            src={product.image_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85'}
            alt={product.name}
            className="w-full h-auto aspect-square object-cover rounded-2xl shadow-sm"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.dataset.fallback) {
                target.dataset.fallback = 'true';
                target.src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85';
              }
            }}
          />
          <div className="absolute top-4 left-4">
            <span className="px-3 py-1 rounded-full bg-primary text-white text-[11px] font-semibold tracking-wider uppercase">
              {product.category}
            </span>
          </div>
        </div>

        {/* Product Details */}
        <div className="md:w-1/2 p-6 md:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] text-[#64748b] font-mono mb-1">
              <span>SKU: {product.sku || `SKU-${product.id}`}</span>
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                In Stock ({product.stock_quantity})
              </span>
            </div>

            <h3 className="font-headline text-[20px] font-bold text-[#1a1c1d] leading-snug">
              {product.name}
            </h3>

            <div className="flex items-baseline gap-2 mt-3">
              <span className="font-headline text-[24px] font-bold text-primary tabular-nums">
                ₹{product.price.toLocaleString('en-IN')}
              </span>
              <span className="text-[13px] text-[#94a3b8] line-through tabular-nums">
                ₹{Math.round(product.price * 1.25).toLocaleString('en-IN')}
              </span>
            </div>

            <p className="text-[13px] text-[#464555] leading-relaxed mt-3 line-clamp-3">
              {product.description}
            </p>

            {/* Quantity Selector */}
            <div className="mt-5 flex items-center gap-3">
              <span className="text-[13px] font-medium text-[#464555]">Quantity:</span>
              <div className="flex items-center rounded-xl border border-[#cbd5e1] overflow-hidden bg-[#f8fafc]">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-1 text-[#464555] hover:bg-white transition-colors"
                >
                  -
                </button>
                <span className="px-3 py-1 text-[13px] font-bold text-[#1a1c1d] min-w-[32px] text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(product.stock_quantity, q + 1))}
                  className="px-3 py-1 text-[#464555] hover:bg-white transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#f1f5f9] flex flex-col gap-2">
            <button
              type="button"
              onClick={handleAdd}
              className="w-full h-11 rounded-xl bg-primary hover:bg-[#4338ca] text-white text-[14px] font-semibold flex items-center justify-center gap-2 shadow-md shadow-primary/20 transition-all active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
              Add to Bag (₹{(product.price * quantity).toLocaleString('en-IN')})
            </button>

            <Link
              to={`/products/${product.id}`}
              onClick={handleClose}
              className="w-full text-center py-2 text-[13px] font-semibold text-primary hover:text-[#4338ca] transition-colors"
            >
              View Full Hardware Specifications &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
