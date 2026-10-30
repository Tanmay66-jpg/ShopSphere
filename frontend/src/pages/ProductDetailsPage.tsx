import { useState, useMemo, useEffect } from 'react';

import { useParams, Link, useNavigate } from 'react-router-dom';
import { productStore } from '../services/productStore';
import { uiStore } from '../services/uiStore';
import { ProductCard } from '../components/product/ProductCard';
import type { Product } from '../types/product';

export function ProductDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Validate parsed ID
  const parsedId = Number(id);
  const isValidId = !isNaN(parsedId) && parsedId > 0;
  const productId = isValidId ? parsedId : 0;

  // Selected product state
  const [product, setProduct] = useState<Product | undefined>(() =>
    isValidId ? productStore.getById(productId) : undefined
  );
  const [isLoading, setIsLoading] = useState<boolean>(!product && isValidId);
  const [isNotFound, setIsNotFound] = useState<boolean>(!isValidId);

  // Simulation state switcher from Stitch
  const [simState, setSimState] = useState<'instock' | 'adding' | 'oos' | 'qty_warning' | 'not_found'>('instock');

  // PDP interactions
  const [selectedImage, setSelectedImage] = useState<string>(product?.image_url || '');
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState('Matte Black');

  useEffect(() => {
    if (!isValidId) {
      setIsNotFound(true);
      setIsLoading(false);
      setProduct(undefined);
      return;
    }

    let isCurrent = true;
    const cached = productStore.getById(productId);
    if (cached) {
      setProduct(cached);
      setSelectedImage(cached.image_url);
      setIsNotFound(false);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    productStore
      .fetchById(productId)
      .then((live) => {
        if (!isCurrent) return;
        if (live) {
          setProduct(live);
          setSelectedImage(live.image_url);
          setIsNotFound(false);
        } else if (!cached) {
          setIsNotFound(true);
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (!isCurrent) return;
        if (!cached) setIsNotFound(true);
        setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [id, isValidId, productId]);

  // Related products
  const relatedProducts = useMemo(() => {
    return productStore.getAll().filter((p: Product) => p.id !== product?.id).slice(0, 4);
  }, [product?.id]);

  // Loading skeleton state
  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-[#f9f9fa] pt-24 pb-20">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12 py-8 animate-pulse">
          <div className="h-4 w-48 bg-[#e8e8e9] rounded mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-7 bg-white rounded-3xl p-8 border border-[#e2e8f0]/80 h-[480px]">
              <div className="w-full h-full bg-[#f3f3f4] rounded-2xl"></div>
            </div>
            <div className="lg:col-span-5 bg-white rounded-3xl p-8 border border-[#e2e8f0]/80 space-y-4">
              <div className="h-4 w-24 bg-[#e8e8e9] rounded"></div>
              <div className="h-8 w-3/4 bg-[#e8e8e9] rounded"></div>
              <div className="h-6 w-1/3 bg-[#e8e8e9] rounded"></div>
              <div className="h-20 w-full bg-[#e8e8e9] rounded mt-4"></div>
              <div className="h-12 w-full bg-[#e8e8e9] rounded-xl mt-6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Graceful not-found state
  if (isNotFound || !product || simState === 'not_found') {
    return (
      <div className="w-full min-h-screen bg-[#f9f9fa] pt-24 pb-20">
        <div className="max-w-md mx-auto bg-white p-10 rounded-3xl shadow-sm border border-[#e2e8f0] text-center mt-12">
          <span className="material-symbols-outlined text-[64px] text-primary/60 mb-3">search_off</span>
          <h2 className="font-headline text-[24px] font-bold text-[#1a1c1d] mb-2">Product Not Found</h2>
          <p className="text-[14px] text-[#64748b] mb-6 leading-relaxed">
            The requested hardware identifier (ID: <span className="font-mono font-bold text-[#1a1c1d]">{id}</span>) could not be located in the current binary search tree index.
          </p>
          <div className="flex flex-col gap-2.5">
            <Link
              to="/products/1"
              onClick={() => setSimState('instock')}
              className="w-full py-2.5 rounded-xl bg-primary text-white text-[13px] font-semibold hover:bg-[#4338ca] transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">headphones</span>
              View Featured Aura Pro (ID: 1)
            </Link>
            <Link
              to="/search"
              className="w-full py-2.5 rounded-xl bg-[#f3f3f4] text-[#1a1c1d] text-[13px] font-semibold hover:bg-[#e8e8e9] transition-all"
            >
              Browse Full Catalogue &rarr;
            </Link>
            <Link
              to="/"
              className="w-full py-2.5 text-[13px] font-semibold text-[#64748b] hover:text-[#1a1c1d] transition-colors"
            >
              Return to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isOOS = simState === 'oos' || product.stock_quantity <= 0;
  const isAdding = simState === 'adding';

  const handleAddToCart = () => {
    if (isOOS) return;
    if (quantity > product.stock_quantity) {
      setSimState('qty_warning');
      uiStore.showToast('Stock Limit Exceeded', `Only ${product.stock_quantity} units remaining in inventory.`, 'warning');
      return;
    }
    setSimState('adding');
    setTimeout(() => {
      uiStore.addToCart(product, quantity);
      setSimState('instock');
    }, 400);
  };

  const originalPrice = Math.round(product.price * 1.25);
  const discountPercent = Math.round(((originalPrice - product.price) / originalPrice) * 100);

  // Gallery images
  const gallery = [
    product.image_url,
    'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=600&auto=format&fit=crop&q=80',
  ];

  return (
    <div className="w-full min-h-screen bg-[#f9f9fa] pt-24 pb-20">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12 pt-5 pb-3">
        <ol className="flex flex-wrap items-center gap-1.5 text-[12px] text-[#64748b]">
          <li>
            <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px]">home</span>
              Home
            </Link>
          </li>
          <li className="text-[#cbd5e1]">
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          </li>
          <li>
            <Link to={`/search?category=${encodeURIComponent(product.category)}`} className="hover:text-primary transition-colors">
              {product.category}
            </Link>
          </li>
          <li className="text-[#cbd5e1]">
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          </li>
          <li className="font-semibold text-[#1a1c1d] truncate max-w-xs md:max-w-md">
            {product.name}
          </li>
        </ol>
      </nav>

      {/* 3. Main Two-Column PDP Section */}
      <section className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12 pt-2 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* LEFT COLUMN: Gallery & Specs */}
          <div className="lg:col-span-7 flex flex-col gap-8">
            {/* Main Image Frame */}
            <div className="relative bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-[#e2e8f0]/80 overflow-hidden group">
              {/* Badges */}
              <div className="absolute top-5 left-5 z-20 flex flex-col gap-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#1a1c1d] text-white text-[11px] font-bold uppercase tracking-wider shadow-xs">
                  <span className="material-symbols-outlined text-[14px] text-amber-400">workspace_premium</span>
                  Premium Hardware
                </span>
                {isOOS ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#ba1a1a] text-white text-[11px] font-bold tracking-wide">
                    Out of Stock
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold tracking-wide">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                    Verified In Stock ({product.stock_quantity})
                  </span>
                )}
              </div>

              <div className="relative w-full aspect-square max-h-[460px] mx-auto flex items-center justify-center">
                <img
                  src={selectedImage || product.image_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85'}
                  alt={product.name}
                  className="w-full h-full object-contain rounded-2xl group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.dataset.fallback) {
                      target.dataset.fallback = 'true';
                      target.src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85';
                    }
                  }}
                />
              </div>
            </div>

            {/* Thumbnail Strip */}
            <div className="grid grid-cols-4 gap-4">
              {gallery.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImage(img)}
                  className={`relative aspect-square rounded-2xl bg-white p-2 border overflow-hidden transition-all shadow-xs ${
                    (selectedImage || product.image_url) === img
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-[#e2e8f0] hover:border-[#cbd5e1]'
                  }`}
                >
                  <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover rounded-xl" />
                </button>
              ))}
            </div>

            {/* Hardware Architecture Specs Table */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#e2e8f0]/80 shadow-xs">
              <h3 className="font-headline text-[18px] font-bold text-[#1a1c1d] mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">tune</span>
                Hardware Specifications & Architecture
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
                <div className="p-3.5 rounded-2xl bg-[#f8fafc] border border-[#f1f5f9]">
                  <span className="text-[#64748b] block text-[11px] uppercase tracking-wider font-semibold">SKU Identifier</span>
                  <span className="font-mono font-bold text-[#1a1c1d]">{product.sku || `SKU-${product.id}`}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#f8fafc] border border-[#f1f5f9]">
                  <span className="text-[#64748b] block text-[11px] uppercase tracking-wider font-semibold">Tree Node Partition</span>
                  <span className="font-mono font-bold text-primary">Key #{product.id} (AVL Node Depth 4)</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#f8fafc] border border-[#f1f5f9]">
                  <span className="text-[#64748b] block text-[11px] uppercase tracking-wider font-semibold">Category Classification</span>
                  <span className="font-bold text-[#1a1c1d]">{product.category}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#f8fafc] border border-[#f1f5f9]">
                  <span className="text-[#64748b] block text-[11px] uppercase tracking-wider font-semibold">Inventory Status</span>
                  <span className="font-bold text-emerald-700">{product.stock_quantity} units available</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#f8fafc] border border-[#f1f5f9]">
                  <span className="text-[#64748b] block text-[11px] uppercase tracking-wider font-semibold">Currency Code</span>
                  <span className="font-bold text-[#1a1c1d]">INR (₹) Tabular Numeric</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#f8fafc] border border-[#f1f5f9]">
                  <span className="text-[#64748b] block text-[11px] uppercase tracking-wider font-semibold">Index Latency</span>
                  <span className="font-mono font-bold text-primary">&lt; 1.2 ms guaranteed</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Product Config & Buy Actions */}
          <div className="lg:col-span-5 flex flex-col gap-6 sticky top-28">
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#e2e8f0]/80 shadow-sm flex flex-col gap-6">
              {/* Category & Title */}
              <div>
                <div className="flex items-center justify-between text-[12px] text-[#64748b] font-medium mb-1">
                  <span className="uppercase tracking-wider font-bold text-primary">{product.category}</span>
                  <span className="font-mono">{product.sku}</span>
                </div>
                <h1 className="font-headline text-[26px] md:text-[32px] font-bold text-[#1a1c1d] leading-snug">
                  {product.name}
                </h1>

                {/* Rating */}
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center text-amber-500">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        star
                      </span>
                    ))}
                  </div>
                  <span className="text-[13px] font-bold text-[#1a1c1d]">{product.rating || 4.9}</span>
                  <span className="text-[13px] text-[#64748b]">({product.rating_count || 428} verified reviews)</span>
                </div>
              </div>

              {/* Price Row */}
              <div className="p-4 rounded-2xl bg-[#f8fafc] border border-[#f1f5f9] flex items-baseline justify-between">
                <div>
                  <div className="flex items-baseline gap-2.5">
                    <span className="font-headline text-[32px] font-bold text-[#1a1c1d] tabular-nums">
                      ₹{product.price.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[16px] text-[#94a3b8] line-through tabular-nums">
                      ₹{originalPrice.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748b] mt-0.5">Inclusive of all GST taxes & Pan-India delivery</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[12px] font-bold">
                  {discountPercent}% OFF
                </span>
              </div>

              {/* Description */}
              <p className="text-[14px] text-[#464555] leading-relaxed">
                {product.description}
              </p>

              {/* Color / Variant Selection */}
              <div>
                <label className="text-[12px] font-bold text-[#1a1c1d] block mb-2">
                  Finish / Colorway: <span className="text-primary font-semibold">{selectedVariant}</span>
                </label>
                <div className="flex items-center gap-3">
                  {[
                    { name: 'Matte Black', hex: '#1e293b' },
                    { name: 'Titanium Slate', hex: '#64748b' },
                    { name: 'Sand White', hex: '#e2e8f0' },
                  ].map((v) => (
                    <button
                      key={v.name}
                      type="button"
                      onClick={() => setSelectedVariant(v.name)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[12px] font-semibold transition-all ${
                        selectedVariant === v.name
                          ? 'border-primary bg-primary/5 text-primary shadow-2xs'
                          : 'border-[#cbd5e1] hover:border-[#94a3b8] text-[#464555]'
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ backgroundColor: v.hex }}></span>
                      <span>{v.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity Selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[12px] font-bold text-[#1a1c1d]">Select Quantity</label>
                  <span className="text-[12px] text-[#64748b]">
                    Max: <strong className="text-[#1a1c1d]">{product.stock_quantity}</strong>
                  </span>
                </div>
                <div className="flex items-center rounded-xl border border-[#cbd5e1] overflow-hidden bg-[#f8fafc] w-36">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={isOOS}
                    className="px-4 py-2 text-[#464555] hover:bg-white transition-colors disabled:opacity-40"
                  >
                    -
                  </button>
                  <span className="px-4 py-2 text-[14px] font-bold text-[#1a1c1d] flex-1 text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(product.stock_quantity, q + 1))}
                    disabled={isOOS || quantity >= product.stock_quantity}
                    className="px-4 py-2 text-[#464555] hover:bg-white transition-colors disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isOOS}
                  className={`w-full h-12 rounded-2xl text-[14px] font-bold flex items-center justify-center gap-2 shadow-md shadow-primary/20 transition-all active:scale-[0.98] ${
                    isOOS
                      ? 'bg-[#cbd5e1] text-[#64748b] cursor-not-allowed'
                      : isAdding
                      ? 'bg-[#4338ca] text-white'
                      : 'bg-primary hover:bg-[#4338ca] text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-[19px]">
                    {isAdding ? 'hourglass_top' : 'shopping_bag'}
                  </span>
                  <span>
                    {isOOS
                      ? 'Out of Stock'
                      : isAdding
                      ? 'Adding to Cart...'
                      : `Add to Bag • ₹${(product.price * quantity).toLocaleString('en-IN')}`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleAddToCart();
                    navigate('/search');
                  }}
                  disabled={isOOS}
                  className="w-full h-11 rounded-2xl bg-[#f3f3f4] hover:bg-[#e8e8e9] text-[#1a1c1d] text-[13px] font-semibold transition-all disabled:opacity-50"
                >
                  Instant Buy Now (Fast Dispatch)
                </button>
              </div>

              {/* Trust Badges */}
              <div className="pt-4 border-t border-[#f1f5f9] grid grid-cols-3 gap-2 text-center text-[11px] text-[#64748b]">
                <div className="p-2 flex flex-col items-center gap-1">
                  <span className="material-symbols-outlined text-primary text-[20px]">local_shipping</span>
                  <span>Pan-India Free Express</span>
                </div>
                <div className="p-2 flex flex-col items-center gap-1">
                  <span className="material-symbols-outlined text-primary text-[20px]">published_with_changes</span>
                  <span>30-Day Hassle-Free Returns</span>
                </div>
                <div className="p-2 flex flex-col items-center gap-1">
                  <span className="material-symbols-outlined text-primary text-[20px]">verified_user</span>
                  <span>2-Year Official Warranty</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Related Curated Products */}
        <div className="mt-16 pt-12 border-t border-[#eeeeef]">
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-[12px] font-bold text-primary uppercase tracking-wider">
                Similar Partition Nodes
              </span>
              <h3 className="font-headline text-[24px] font-bold text-[#1a1c1d] mt-0.5">
                Related Hardware in {product.category}
              </h3>
            </div>
            <Link to="/search" className="text-[13px] font-semibold text-primary hover:underline">
              View All Catalogue Items &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((rel: Product) => (
              <ProductCard key={rel.id} product={rel} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
