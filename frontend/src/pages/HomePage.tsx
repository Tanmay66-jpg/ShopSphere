import { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { productStore } from '../services/productStore';
import { ProductCard } from '../components/product/ProductCard';
import type { Product } from '../types/product';


export function HomePage() {
  const navigate = useNavigate();

  // Discovery toolbar filters
  const [activeCategory, setActiveCategory] = useState('all');
  const [activePriceRange, setActivePriceRange] = useState('all');
  const [sortBy, setSortBy] = useState('featured');

  const [allProducts, setAllProducts] = useState<Product[]>(productStore.getAll());

  useEffect(() => {
    productStore.fetchProducts().then(setAllProducts).catch(() => {});
    const unsubscribe = productStore.subscribe(() => {
      setAllProducts(productStore.getAll());
    });
    return unsubscribe;
  }, []);

  const filteredProducts = useMemo(() => {
    let list = [...allProducts];

    // Category filter
    if (activeCategory !== 'all') {
      list = list.filter((p) => p.category.toLowerCase() === activeCategory.toLowerCase());
    }

    // Price range filter
    if (activePriceRange === 'under-5k') {
      list = list.filter((p) => p.price < 5000);
    } else if (activePriceRange === '5k-10k') {
      list = list.filter((p) => p.price >= 5000 && p.price <= 10000);
    } else if (activePriceRange === 'above-10k') {
      list = list.filter((p) => p.price > 10000);
    }

    // Sorting
    if (sortBy === 'price-asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'name-asc') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [allProducts, activeCategory, activePriceRange, sortBy]);

  // Hero product — first in the list
  const heroProduct = allProducts[0] ?? null;

  const svgPlaceholder = heroProduct
    ? `data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500"><rect width="400" height="500" fill="#EAE6DF"/><text x="200" y="250" text-anchor="middle" dominant-baseline="middle" font-family="serif" font-size="96" fill="#8A8278">${heroProduct.name.charAt(0)}</text></svg>`
      )}`
    : `data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500"><rect width="400" height="500" fill="#EAE6DF"/></svg>`
      )}`;

  return (
    <div className="w-full min-h-screen bg-[#F5F1EA] pt-20 pb-16">

      {/* ── HERO ── */}
      <section className="w-full py-16 md:py-24">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Left: Editorial copy */}
            <div className="flex flex-col">
              <h1 className="font-serif text-[48px] md:text-[60px] lg:text-[68px] font-light tracking-tight leading-[1.05] text-[#1B1B1B] mb-6">
                Fifty objects,<br />
                <em>carefully chosen.</em>
              </h1>
              <p className="text-[16px] text-[#5C5A56] leading-relaxed max-w-md mb-10">
                Electronics, fashion, home and accessories — all in one place. Curated and indexed for precision discovery.
              </p>
              <Link
                to="/search"
                className="self-start inline-block bg-[#1B1B1B] text-white text-[13px] font-medium px-6 py-3 hover:bg-[#2D5A3D] transition-colors"
              >
                Browse the Collection →
              </Link>
            </div>

            {/* Right: Hero product image */}
            <div className="relative">
              {heroProduct ? (
                <Link to={`/products/${heroProduct.id}`} className="block group">
                  <div className="relative w-full aspect-[4/5] bg-[#EAE6DF] overflow-hidden">
                    <img
                      src={heroProduct.image_url || svgPlaceholder}
                      alt={heroProduct.name}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-[350ms]"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.dataset.fallback) {
                          target.dataset.fallback = 'true';
                          target.src = svgPlaceholder;
                        }
                      }}
                    />
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <p className="font-sans text-[14px] font-medium text-[#1B1B1B] line-clamp-1">
                      {heroProduct.name}
                    </p>
                    <p className="font-serif text-[15px] text-[#1B1B1B] tabular-nums ml-4 flex-shrink-0">
                      ₹{heroProduct.price.toLocaleString('en-IN')}
                    </p>
                  </div>
                </Link>
              ) : (
                <div className="w-full aspect-[4/5] bg-[#EAE6DF]" />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── CATEGORIES ── */}
      <section className="w-full py-10 border-t border-[#D9D4CC]">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12">
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="font-serif text-[28px] md:text-[34px] font-light text-[#1B1B1B]">
              Shop by Category
            </h2>
            <Link to="/search" className="text-[13px] text-[#5C5A56] hover:text-[#1B1B1B] transition-colors underline underline-offset-4 decoration-1">
              View All
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-1">
            {[
              {
                label: 'Electronics',
                to: '/search?category=Electronics',
                img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85',
              },
              {
                label: 'Fashion',
                to: '/search?category=Fashion',
                img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85',
              },
              {
                label: 'Home & Living',
                to: '/search?category=Home%20%26%20Living',
                img: 'https://images.unsplash.com/photo-1580481077195-c9fa4d173c3d?auto=format&fit=crop&w=900&q=85',
              },
              {
                label: 'Accessories',
                to: '/search?category=Accessories',
                img: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85',
              },
            ].map((tile) => (
              <div
                key={tile.label}
                onClick={() => navigate(tile.to)}
                className="group relative overflow-hidden aspect-[4/5] cursor-pointer"
              >
                <img
                  src={tile.img}
                  alt={tile.label}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-[300ms]"
                />
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1B1B1B]/60 via-transparent to-transparent pointer-events-none" />
                <span className="absolute bottom-4 left-4 font-serif text-[18px] font-light text-white tracking-tight">
                  {tile.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRODUCT CATALOGUE ── */}
      <section className="w-full py-14 border-t border-[#D9D4CC]" id="catalogExplorer">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12">

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            {/* Category pills */}
            <div className="flex items-center gap-2 overflow-x-auto">
              {[
                { key: 'all', label: `All (${allProducts.length})` },
                { key: 'Electronics', label: 'Electronics' },
                { key: 'Fashion', label: 'Fashion' },
                { key: 'Home & Living', label: 'Home & Living' },
                { key: 'Accessories', label: 'Accessories' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveCategory(item.key)}
                  className={`px-3.5 py-1.5 text-[12px] font-medium transition-all whitespace-nowrap border ${
                    activeCategory === item.key
                      ? 'bg-[#1B1B1B] text-white border-[#1B1B1B]'
                      : 'bg-transparent text-[#5C5A56] border-[#D9D4CC] hover:border-[#1B1B1B] hover:text-[#1B1B1B]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Price + Sort */}
            <div className="flex items-center gap-4 flex-shrink-0">
              {/* Price filter */}
              <div className="flex items-center gap-1.5 text-[12px]">
                <span className="text-[#8A8278]">Price:</span>
                {[
                  { key: 'all', label: 'All' },
                  { key: 'under-5k', label: '< ₹5k' },
                  { key: '5k-10k', label: '₹5k–10k' },
                  { key: 'above-10k', label: '₹10k+' },
                ].map((range) => (
                  <button
                    key={range.key}
                    type="button"
                    onClick={() => setActivePriceRange(range.key)}
                    className={`px-2.5 py-1 border text-[11px] transition-all ${
                      activePriceRange === range.key
                        ? 'bg-[#2D5A3D] text-white border-[#2D5A3D]'
                        : 'text-[#5C5A56] border-[#D9D4CC] hover:border-[#2D5A3D] hover:text-[#2D5A3D]'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>

              {/* Sort dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="h-8 pl-2.5 pr-7 bg-transparent border border-[#D9D4CC] text-[12px] text-[#5C5A56] focus:outline-none cursor-pointer appearance-none hover:border-[#1B1B1B] transition-colors"
                >
                  <option value="featured">Featured</option>
                  <option value="price-asc">Price ↑</option>
                  <option value="price-desc">Price ↓</option>
                  <option value="name-asc">Name A–Z</option>
                </select>
                <span className="material-symbols-outlined text-[14px] text-[#8A8278] absolute right-1.5 top-2 pointer-events-none">
                  unfold_more
                </span>
              </div>

              <span className="text-[12px] text-[#8A8278] whitespace-nowrap">
                {filteredProducts.length} items
              </span>
            </div>
          </div>

          {/* Products grid / states */}
          {allProducts.length === 0 ? (
            // Loading skeleton
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div key={n} className="flex flex-col border border-[#D9D4CC]">
                  <div className="skeleton w-full aspect-[4/5]" />
                  <div className="p-3 space-y-2">
                    <div className="skeleton h-3 w-16" />
                    <div className="skeleton h-4 w-3/4" />
                    <div className="skeleton h-4 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20">
              <span className="material-symbols-outlined text-[48px] text-[#D9D4CC] mb-4">search_off</span>
              <h3 className="font-serif text-[22px] font-light text-[#1B1B1B] mb-2">No products found</h3>
              <p className="text-[14px] text-[#8A8278] mb-6">
                No items matched the selected filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveCategory('all');
                  setActivePriceRange('all');
                }}
                className="px-5 py-2.5 bg-[#1B1B1B] text-white text-[13px] font-medium hover:bg-[#2D5A3D] transition-colors"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
