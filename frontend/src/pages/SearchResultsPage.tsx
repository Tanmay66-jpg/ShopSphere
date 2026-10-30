import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { productStore } from '../services/productStore';
import { ProductCard } from '../components/product/ProductCard';
import type { Product, SearchResponse } from '../types/product';


export function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Search mode & parameters
  const queryParam = searchParams.get('q') || '';
  const categoryParam = searchParams.get('category') || 'All Categories';

  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [searchBy, setSearchBy] = useState<'name' | 'id' | 'price'>('name');
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(25000);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'id' | 'name' | 'price-asc' | 'price-desc'>('name');


  useEffect(() => {
    setSearchQuery(queryParam);
  }, [queryParam]);

  useEffect(() => {
    if (categoryParam) setSelectedCategory(categoryParam);
  }, [categoryParam]);

  // Execute search via live backend with fallback to product store
  const [searchResult, setSearchResult] = useState<SearchResponse>(() =>
    productStore.search({
      query: searchQuery,
      searchBy,
      category: selectedCategory,
      minPrice,
      maxPrice,
      inStockOnly,
      sortBy,
    })
  );
  const [isSearching, setIsSearching] = useState<boolean>(false);

  useEffect(() => {
    let isCurrent = true;
    setIsSearching(true);
    productStore
      .searchAsync({
        query: searchQuery,
        searchBy,
        category: selectedCategory,
        minPrice,
        maxPrice,
        inStockOnly,
        sortBy,
      })
      .then((res) => {
        if (isCurrent) {
          setSearchResult(res);
          setIsSearching(false);
        }
      })
      .catch(() => {
        if (isCurrent) setIsSearching(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [searchQuery, searchBy, selectedCategory, minPrice, maxPrice, inStockOnly, sortBy]);


  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
    const params = new URLSearchParams(searchParams);
    if (cat && cat !== 'All Categories') {
      params.set('category', cat);
    } else {
      params.delete('category');
    }
    setSearchParams(params);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim());
    } else {
      params.delete('q');
    }
    setSearchParams(params);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All Categories');
    setMinPrice(0);
    setMaxPrice(25000);
    setInStockOnly(false);
    setSearchParams({});
  };

  return (
    <div className="w-full min-h-screen bg-[#f9f9fa] pt-24 pb-16">
      {/* Context & Search Header */}
      <section className="w-full bg-white shadow-xs border-b border-[#eeeeef]">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12 pt-6 pb-6">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 mb-3 text-[12px] text-[#64748b] flex-wrap">
            <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px]">home</span>
              Home
            </Link>
            <span className="material-symbols-outlined text-[14px] text-[#cbd5e1]">chevron_right</span>
            <Link to="/search" className="hover:text-primary transition-colors">
              Catalogue
            </Link>
            <span className="material-symbols-outlined text-[14px] text-[#cbd5e1]">chevron_right</span>
            <span className="text-[#1a1c1d] font-semibold truncate max-w-[200px]">
              {searchQuery ? `Search: "${searchQuery}"` : selectedCategory}
            </span>
          </nav>

          {/* Headline & Multi-Key Switcher */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-headline text-[28px] md:text-[34px] font-bold text-[#1a1c1d] tracking-tight">
                  Search & Discovery Results
                </h1>
                <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[12px] font-bold">
                  <span className="material-symbols-outlined text-[14px]">bolt</span>
                  {searchResult.total_count} Results
                </span>
              </div>
              <p className="text-[14px] text-[#64748b] mt-1 max-w-2xl leading-relaxed">
                Explore curated catalog keys indexed by multi-key lookup across product title, unique SKU / Product ID, and dynamic INR pricing.
              </p>
            </div>

            {/* Multi-Key Mode Switcher */}
            <div className="bg-[#f3f3f4] p-1 rounded-2xl flex items-center gap-1 shadow-inner self-start lg:self-auto border border-[#e2e8f0]">
              <span className="text-[12px] text-[#64748b] font-semibold px-2 hidden sm:inline flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-primary">manage_search</span>
                Indexed by:
              </span>
              <button
                type="button"
                onClick={() => setSearchBy('name')}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all ${
                  searchBy === 'name' ? 'bg-white text-primary shadow-xs' : 'text-[#64748b] hover:text-[#1a1c1d]'
                }`}
              >
                Product Name
              </button>
              <button
                type="button"
                onClick={() => setSearchBy('id')}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all ${
                  searchBy === 'id' ? 'bg-white text-primary shadow-xs' : 'text-[#64748b] hover:text-[#1a1c1d]'
                }`}
              >
                SKU / ID (BST)
              </button>
              <button
                type="button"
                onClick={() => setSearchBy('price')}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all ${
                  searchBy === 'price' ? 'bg-white text-primary shadow-xs' : 'text-[#64748b] hover:text-[#1a1c1d]'
                }`}
              >
                Price Tree
              </button>
            </div>
          </div>

          {/* Active Facets Row */}
          <div className="flex items-center gap-2 flex-wrap pt-2 text-[12px]">
            <span className="font-bold text-[#64748b] uppercase tracking-wider mr-1">Active Facets:</span>

            {selectedCategory !== 'All Categories' && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed shadow-2xs font-semibold">
                <span>Category: {selectedCategory}</span>
                <button
                  type="button"
                  onClick={() => handleCategorySelect('All Categories')}
                  className="hover:text-red-600 transition-colors"
                  aria-label="Remove category filter"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </div>
            )}

            {searchQuery && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed shadow-2xs font-semibold">
                <span>Query: "{searchQuery}"</span>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    const params = new URLSearchParams(searchParams);
                    params.delete('q');
                    setSearchParams(params);
                  }}
                  className="hover:text-red-600 transition-colors"
                  aria-label="Remove search query filter"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </div>
            )}

            {(minPrice > 0 || maxPrice < 25000) && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed shadow-2xs font-semibold">
                <span>
                  Price: ₹{minPrice.toLocaleString('en-IN')} – ₹{maxPrice.toLocaleString('en-IN')}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMinPrice(0);
                    setMaxPrice(25000);
                  }}
                  className="hover:text-red-600 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </div>
            )}

            {inStockOnly && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 shadow-2xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                <span>In Stock Only</span>
                <button
                  type="button"
                  onClick={() => setInStockOnly(false)}
                  className="hover:text-red-600 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleClearFilters}
              className="text-primary hover:underline font-semibold ml-2 text-[12px]"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      </section>

      {/* 3. Main Search Results & Faceted Sidebar Layout */}
      <section className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Filter Sidebar */}
          <aside className="lg:col-span-3 bg-white p-5 rounded-3xl border border-[#e2e8f0]/80 shadow-xs flex flex-col gap-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#f1f5f9]">
              <span className="font-headline text-[16px] font-bold text-[#1a1c1d] flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">filter_list</span>
                Filters
              </span>
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-[12px] text-primary hover:underline font-semibold"
              >
                Reset
              </button>
            </div>

            {/* Search Input Box */}
            <div>
              <label className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider block mb-2">
                Search Term
              </label>
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    searchBy === 'id'
                      ? 'Enter SKU (e.g. 904)...'
                      : searchBy === 'price'
                      ? 'Enter target price...'
                      : 'Search title or keyword...'
                  }
                  className="w-full h-10 pl-3 pr-8 rounded-xl bg-[#f8fafc] border border-[#cbd5e1] text-[13px] text-[#1a1c1d] focus:outline-none focus:border-primary focus:bg-white"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-2.5 text-[#64748b] hover:text-primary"
                >
                  <span className="material-symbols-outlined text-[18px]">search</span>
                </button>
              </form>
            </div>

            {/* Category Filter */}
            <div>
              <label className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider block mb-2">
                Category
              </label>
              <div className="space-y-1.5">
                {['All Categories', 'Electronics', 'Fashion', 'Home & Living', 'Accessories'].map((cat) => (
                  <label
                    key={cat}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-[#f8fafc] cursor-pointer text-[13px] text-[#1a1c1d]"
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="categoryFilter"
                        checked={selectedCategory === cat}
                        onChange={() => handleCategorySelect(cat)}
                        className="w-4 h-4 text-primary focus:ring-0"
                      />
                      <span className={selectedCategory === cat ? 'font-bold text-primary' : ''}>{cat}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Range Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
                  Price Range (INR)
                </label>
                <span className="text-[12px] font-mono font-bold text-primary">
                  ₹{maxPrice.toLocaleString('en-IN')}
                </span>
              </div>
              <input
                type="range"
                min="1000"
                max="25000"
                step="500"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
              <div className="flex items-center justify-between text-[11px] text-[#64748b] font-mono mt-1">
                <span>₹1,000</span>
                <span>₹25,000+</span>
              </div>
            </div>

            {/* Stock Availability Toggle */}
            <div className="pt-2 border-t border-[#f1f5f9]">
              <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-[#f8fafc]">
                <span className="text-[13px] font-semibold text-[#1a1c1d]">In Stock Only</span>
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-0"
                />
              </label>
            </div>

            {/* Diagnostic Path Trace Card */}
            <div className="p-3.5 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] text-[12px]">
              <div className="flex items-center gap-2 text-primary font-bold mb-1">
                <span className="material-symbols-outlined text-[16px]">route</span>
                <span>Index Search Trace</span>
              </div>
              <div className="font-mono text-[11px] text-[#464555] space-y-0.5">
                <p>Mode: {searchBy.toUpperCase()}</p>
                <p>Comparisons: {searchResult.comparisons}</p>
                <p>Engine latency: {searchResult.execution_time_ms} ms</p>
                {searchResult.path.length > 0 && (
                  <p className="truncate text-primary font-semibold">
                    Path: {searchResult.path.join(' → ')}
                  </p>
                )}
              </div>
            </div>
          </aside>

          {/* Right Column: Search Results Grid & State Handlers */}
          <main className="lg:col-span-9 flex flex-col gap-6">
            {/* Sorting & Result Counts Bar */}
            <div className="bg-white p-3.5 rounded-2xl border border-[#e2e8f0]/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="text-[13px] text-[#64748b] flex items-center gap-2">
                <span>
                  Found <strong className="text-[#1a1c1d]">{searchResult.total_count}</strong> matching products
                  {searchQuery && (
                    <span>
                      {' '}
                      for <strong className="text-primary">"{searchQuery}"</strong>
                    </span>
                  )}
                </span>
                {isSearching && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
                    Index Querying...
                  </span>
                )}
              </div>


              <div className="flex items-center gap-3">
                <span className="text-[12px] font-medium text-[#64748b]">Sort By:</span>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="h-9 pl-3 pr-8 rounded-xl bg-[#f8fafc] border border-[#cbd5e1] text-[12px] font-semibold text-[#1a1c1d] focus:outline-none cursor-pointer appearance-none"
                  >
                    <option value="name">Name: Alphabetical</option>
                    <option value="id">Product ID (BST order)</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                  </select>
                  <span className="material-symbols-outlined text-[16px] text-[#64748b] absolute right-2.5 top-2.5 pointer-events-none">
                    unfold_more
                  </span>
                </div>
              </div>
            </div>

            {/* Search Results Grid & Real-time State Rendering */}
            {isSearching ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div
                    key={n}
                    className="rounded-2xl bg-white p-3.5 border border-[#e2e8f0]/80 shadow-xs animate-pulse flex flex-col gap-3"
                  >
                    <div className="w-full aspect-square rounded-xl bg-[#e8e8e9]"></div>
                    <div className="h-3 w-20 bg-[#e8e8e9] rounded"></div>
                    <div className="h-5 w-3/4 bg-[#e8e8e9] rounded"></div>
                    <div className="h-4 w-1/3 bg-[#e8e8e9] rounded"></div>
                    <div className="h-9 w-full bg-[#e8e8e9] rounded-xl mt-2"></div>
                  </div>
                ))}
              </div>
            ) : searchResult.results.length === 0 ? (
              <div className="w-full bg-white rounded-3xl p-12 text-center border border-[#e2e8f0]/80 shadow-xs max-w-lg mx-auto">
                <span className="material-symbols-outlined text-[64px] text-primary/40 mb-3">search_off</span>
                <h3 className="font-headline text-[22px] font-bold text-[#1a1c1d]">No Products Found</h3>
                <p className="text-[14px] text-[#64748b] mt-1 mb-6">
                  We couldn't locate any products matching your specific query across the BST or AVL indexes.
                </p>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="px-5 py-2.5 rounded-xl bg-primary text-white text-[13px] font-semibold shadow-sm hover:bg-primary/90 transition-colors"
                >
                  Clear All Filters & Reset
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchResult.results.map((product: Product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </main>
        </div>
      </section>
    </div>
  );
}
