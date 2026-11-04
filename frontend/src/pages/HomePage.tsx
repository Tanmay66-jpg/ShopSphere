import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productStore } from '../services/productStore';
import { CategoryTilesSection } from '../components/home/CategoryTilesSection';
import { FeaturedStripSection } from '../components/home/FeaturedStripSection';
import type { Product } from '../types/product';

export function HomePage() {
  const [allProducts, setAllProducts] = useState<Product[]>(productStore.getAll());

  useEffect(() => {
    productStore.fetchProducts().then(setAllProducts).catch(() => {});
    const unsubscribe = productStore.subscribe(() => {
      setAllProducts(productStore.getAll());
    });
    return unsubscribe;
  }, []);

  // Hero product — first in the catalogue (Sony WH-1000XM5)
  const heroProduct = allProducts[0] ?? null;

  const svgPlaceholder = heroProduct
    ? `data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500"><rect width="400" height="500" fill="#EAE6DF"/><text x="200" y="250" text-anchor="middle" dominant-baseline="middle" font-family="serif" font-size="96" fill="#8A8278">${heroProduct.name.charAt(0)}</text></svg>`
      )}`
    : `data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500"><rect width="400" height="500" fill="#EAE6DF"/></svg>`
      )}`;

  const handleScrollToCategories = () => {
    const el = document.getElementById('categories');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F5F1EA] pt-[60px] pb-16">

      {/* ── HERO (Fitted to viewport minus header) ── */}
      <section className="w-full min-h-[calc(100vh-60px)] max-h-[840px] flex items-center py-8 lg:py-12">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

            {/* Left: Editorial copy (~58% width on desktop) */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              <span className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#8A8278] mb-3 block">
                THE SHOPSPHERE EDIT
              </span>
              <h1 className="font-serif text-[42px] sm:text-[54px] lg:text-[64px] font-light tracking-tight leading-[1.08] text-[#1B1B1B] mb-5">
                Less browsing,<br />
                <em>Better finding.</em>
              </h1>
              <p className="text-[15px] sm:text-[16px] text-[#5C5A56] leading-relaxed max-w-lg mb-8">
                Electronics, fashion, home and accessories — all in one place. Curated and indexed for precision discovery.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={handleScrollToCategories}
                  className="self-start inline-flex items-center gap-2 bg-[#1B1B1B] text-white text-[13px] font-medium px-6 py-3 hover:bg-[#2D5A3D] transition-colors cursor-pointer shadow-xs"
                >
                  <span>Browse the Collection</span>
                  <span className="text-[12px]">&darr;</span>
                </button>
                <Link
                  to="/search"
                  className="inline-flex items-center text-[13px] text-[#5C5A56] hover:text-[#1B1B1B] transition-colors underline underline-offset-4 decoration-1 px-2 py-3"
                >
                  View All Products &rarr;
                </Link>
              </div>
            </div>

            {/* Right: Restrained Hero product card (~42% width on desktop) */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              {heroProduct ? (
                <Link
                  to={`/products/${heroProduct.id}`}
                  className="block group w-full max-w-[360px] sm:max-w-[380px] lg:max-w-[400px]"
                >
                  {/* Restrained Image Panel with object-contain */}
                  <div className="relative w-full aspect-[4/5] max-h-[440px] bg-[#EAE6DF] border border-[#D9D4CC] overflow-hidden flex items-center justify-center p-6 transition-all group-hover:border-[#1B1B1B]">
                    <img
                      src={heroProduct.image_url || svgPlaceholder}
                      alt={heroProduct.name}
                      className="w-full h-full object-contain group-hover:scale-[1.03] transition-transform duration-[350ms]"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.dataset.fallback) {
                          target.dataset.fallback = 'true';
                          target.src = svgPlaceholder;
                        }
                      }}
                    />
                  </div>
                  <div className="mt-3 flex items-baseline justify-between text-[13px]">
                    <p className="font-sans font-medium text-[#1B1B1B] line-clamp-1 group-hover:underline underline-offset-2">
                      {heroProduct.name}
                    </p>
                    <p className="font-serif text-[#1B1B1B] tabular-nums ml-4 flex-shrink-0">
                      ₹{heroProduct.price.toLocaleString('en-IN')}
                    </p>
                  </div>
                </Link>
              ) : (
                <div className="w-full max-w-[380px] aspect-[4/5] max-h-[440px] bg-[#EAE6DF] border border-[#D9D4CC]" />
              )}
            </div>

          </div>
        </div>
      </section>

      {/* ── CATEGORY-FIRST ENTRY POINTS (Shop by Category) ── */}
      <CategoryTilesSection products={allProducts} />

      {/* ── FEATURED EDIT (Max 8 Products) ── */}
      <FeaturedStripSection products={allProducts} />

    </div>
  );
}
