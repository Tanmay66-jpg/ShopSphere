import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ProductCard } from '../product/ProductCard';
import type { Product } from '../../types/product';

interface FeaturedStripSectionProps {
  products: Product[];
}

export function FeaturedStripSection({ products }: FeaturedStripSectionProps) {
  // Select top 2 rated items from each of the 4 categories (exactly 8 products)
  const featuredProducts = useMemo(() => {
    const categories = ['Electronics', 'Fashion', 'Home & Living', 'Accessories'];
    const selected: Product[] = [];

    for (const cat of categories) {
      const itemsInCat = products
        .filter((p) => p.category === cat)
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      selected.push(...itemsInCat.slice(0, 2));
    }

    // Limit to exactly 8 products
    return selected.slice(0, 8);
  }, [products]);

  if (featuredProducts.length === 0) {
    return null;
  }

  return (
    <section className="w-full py-16 border-t border-[#D9D4CC]">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 mb-8">
          <div>
            <span className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#8A8278] block mb-1">
              Curated Edit
            </span>
            <h2 className="font-serif text-[28px] md:text-[34px] font-light text-[#1B1B1B]">
              Featured Pieces
            </h2>
            <p className="text-[14px] text-[#5C5A56] mt-1">
              Top-rated selections curated across all four departments.
            </p>
          </div>
          <Link
            to="/search"
            className="text-[13px] text-[#5C5A56] hover:text-[#1B1B1B] transition-colors underline underline-offset-4 decoration-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#1B1B1B]"
          >
            Browse all {products.length} products &rarr;
          </Link>
        </div>

        {/* 8 Product Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* Bottom CTA Strip */}
        <div className="mt-12 pt-8 border-t border-[#D9D4CC] flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <p className="text-[13px] text-[#5C5A56]">
            Looking for something specific? Search our entire 50-object catalogue with BST &amp; AVL indexing.
          </p>
          <Link
            to="/search"
            className="inline-flex items-center gap-2 bg-[#1B1B1B] text-white text-[13px] font-medium px-6 py-2.5 hover:bg-[#2D5A3D] transition-colors"
          >
            <span>Open Full Shop</span>
            <span>&rarr;</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
