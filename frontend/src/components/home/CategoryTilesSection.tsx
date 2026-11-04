import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../../types/product';

interface CategoryTilesSectionProps {
  products: Product[];
}

interface CategoryTileConfig {
  key: string;
  name: string;
  route: string;
  image: string;
}

const CATEGORY_CONFIG: CategoryTileConfig[] = [
  {
    key: 'Electronics',
    name: 'Electronics',
    route: '/search?category=Electronics',
    image: '/products/SS-0001.webp',
  },
  {
    key: 'Fashion',
    name: 'Fashion',
    route: '/search?category=Fashion',
    image: '/categories/footwear.jpg',
  },
  {
    key: 'Home & Living',
    name: 'Home & Living',
    route: '/search?category=Home%20%26%20Living',
    image: '/categories/home-living.jpg',
  },
  {
    key: 'Accessories',
    name: 'Accessories',
    route: '/search?category=Accessories',
    image: '/products/SS-0046.webp',
  },
];

export function CategoryTilesSection({ products }: CategoryTilesSectionProps) {
  // Compute live product counts per category directly from backend data
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of products) {
      const cat = p.category;
      map[cat] = (map[cat] || 0) + 1;
    }
    return map;
  }, [products]);

  return (
    <section id="categories" className="w-full py-16 border-t border-[#D9D4CC] scroll-mt-20">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12">
        {/* Section Header */}
        <div className="flex items-baseline justify-between mb-8">
          <div>
            <span className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#8A8278] block mb-1">
              Curated Departments
            </span>
            <h2 className="font-serif text-[28px] md:text-[34px] font-light text-[#1B1B1B]">
              Shop by Category
            </h2>
          </div>
          <Link
            to="/search"
            className="text-[13px] text-[#5C5A56] hover:text-[#1B1B1B] transition-colors underline underline-offset-4 decoration-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#1B1B1B]"
          >
            All Products ({products.length}) &rarr;
          </Link>
        </div>

        {/* 4 Category Tiles Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {CATEGORY_CONFIG.map((tile) => {
            const count = counts[tile.key] ?? 0;

            return (
              <Link
                key={tile.key}
                to={tile.route}
                className="group relative overflow-hidden aspect-[4/5] bg-[#EAE6DF] border border-[#D9D4CC] flex flex-col justify-end p-5 md:p-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B1B1B] focus-visible:ring-offset-2 transition-all cursor-pointer"
              >
                {/* Background Image */}
                <img
                  src={tile.image}
                  alt={tile.name}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-[350ms]"
                  onError={(e) => {
                    // Fallback to neutral canvas in the unlikely event an image fails
                    const target = e.currentTarget;
                    target.style.display = 'none';
                  }}
                />

                {/* Dark Gradient Overlay for legible typography */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1B1B1B]/80 via-[#1B1B1B]/25 to-transparent pointer-events-none transition-opacity group-hover:from-[#1B1B1B]/90" />

                {/* Foreground Copy */}
                <div className="relative z-10">
                  <span className="text-[11px] font-mono tracking-wider text-white/80 uppercase block mb-1">
                    {count > 0 ? `${count} products` : 'Curated collection'}
                  </span>
                  <h3 className="font-serif text-[20px] sm:text-[22px] md:text-[24px] font-light text-white tracking-tight group-hover:underline underline-offset-4 decoration-1">
                    {tile.name}
                  </h3>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

