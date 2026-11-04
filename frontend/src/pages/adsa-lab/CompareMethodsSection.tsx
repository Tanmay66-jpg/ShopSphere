import { useState, useEffect } from 'react';
import { adsaApi, type CompareMethodsResponse } from '../../services/adsaApi';

export function CompareMethodsSection() {
  const [query, setQuery] = useState<string>('25');
  const [data, setData] = useState<CompareMethodsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const runCompare = async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adsaApi.compareMethods(q);
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Comparison failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runCompare(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      runCompare(query.trim());
    }
  };

  return (
    <div className="w-full bg-[#FDFCF9] border border-[#D9D4CC] p-6 lg:p-8 rounded-none mt-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#EAE6DF]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#8A8278]">
              Side-by-Side Architectural Profiling
            </span>
          </div>
          <h2 className="font-serif text-[24px] md:text-[28px] font-light text-[#1B1B1B]">
            Compare Search Methods (Linear Scan vs. BST vs. AVL)
          </h2>
        </div>

        {/* Query Input */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Product ID (1..50) or Name..."
            className="w-48 h-9 px-3 bg-[#F5F1EA] border border-[#D9D4CC] text-[13px] text-[#1B1B1B] focus:outline-none focus:border-[#2D5A3D]"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 h-9 bg-[#1B1B1B] text-white text-[12px] font-medium hover:bg-[#2D5A3D] transition-colors"
          >
            {loading ? 'Profiling...' : 'Compare'}
          </button>
        </form>
      </div>

      {error ? (
        <div className="p-4 mt-6 bg-[#8B2020]/10 border border-[#8B2020]/30 text-[#8B2020] text-[13px]">
          {error}
        </div>
      ) : data ? (
        <div className="mt-6">
          {data.matched_product && (
            <div className="p-3 bg-[#F5F1EA] border border-[#D9D4CC] mb-6 flex items-center justify-between text-[12px]">
              <div>
                Target Product: <strong className="text-[#1B1B1B]">{data.matched_product.name}</strong> ({data.matched_product.sku})
              </div>
              <div className="font-mono text-[#5C5A56]">
                Catalogue: {data.catalogue_size} Products
              </div>
            </div>
          )}

          {/* Three Column Side-by-Side Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. Linear Scan */}
            <div className="p-5 bg-[#F5F1EA] border border-[#D9D4CC] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-serif text-[17px] text-[#1B1B1B] font-medium">
                    Linear Scan
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-[#8A8278]/20 text-[#5C5A56]">
                    O(n)
                  </span>
                </div>
                <p className="text-[12px] text-[#5C5A56] mb-6">
                  Sequential iteration across array or unindexed table rows.
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t border-[#D9D4CC]">
                <div className="flex items-baseline justify-between">
                  <span className="text-[12px] text-[#5C5A56]">Comparisons</span>
                  <span className="font-mono text-[24px] font-bold text-[#8A8278]">
                    {data.methods.linear_scan.comparisons}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[12px] text-[#5C5A56]">Latency</span>
                  <span className="font-mono text-[16px] text-[#1B1B1B]">
                    {data.methods.linear_scan.time_us} µs
                  </span>
                </div>
                <div className="text-[11px] text-[#8A8278]">
                  Status: {data.methods.linear_scan.found ? 'Found' : 'Not found'}
                </div>
              </div>
            </div>

            {/* 2. Unbalanced BST */}
            <div className="p-5 bg-[#F5F1EA] border border-[#D9D4CC] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-serif text-[17px] text-[#1B1B1B] font-medium">
                    Unbalanced BST
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-[#8B2020]/15 text-[#8B2020]">
                    O(h) Degenerate
                  </span>
                </div>
                <p className="text-[12px] text-[#5C5A56] mb-6">
                  Prone to skewing into O(n) linked list under sorted inputs.
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t border-[#D9D4CC]">
                <div className="flex items-baseline justify-between">
                  <span className="text-[12px] text-[#5C5A56]">Comparisons</span>
                  <span className="font-mono text-[24px] font-bold text-[#8B2020]">
                    {data.methods.bst.comparisons}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[12px] text-[#5C5A56]">Latency</span>
                  <span className="font-mono text-[16px] text-[#1B1B1B]">
                    {data.methods.bst.time_us} µs
                  </span>
                </div>
                <div className="text-[11px] text-[#8A8278]">
                  Status: {data.methods.bst.found ? 'Found' : 'Not found'}
                </div>
              </div>
            </div>

            {/* 3. Balanced AVL Tree */}
            <div className="p-5 bg-[#F5F1EA] border-2 border-[#2D5A3D] flex flex-col justify-between relative shadow-xs">
              <div className="absolute top-2 right-2">
                <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 bg-[#2D5A3D] text-white">
                  Optimal
                </span>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-serif text-[17px] text-[#1B1B1B] font-semibold">
                    Balanced AVL Tree
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-[#2D5A3D]/20 text-[#2D5A3D] mr-12">
                    O(log n)
                  </span>
                </div>
                <p className="text-[12px] text-[#5C5A56] mb-6">
                  Strict height balancing with 4 rotation primitives (LL, RR, LR, RL).
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t border-[#D9D4CC]">
                <div className="flex items-baseline justify-between">
                  <span className="text-[12px] text-[#5C5A56]">Comparisons</span>
                  <span className="font-mono text-[24px] font-bold text-[#2D5A3D]">
                    {data.methods.avl.comparisons}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[12px] text-[#5C5A56]">Latency</span>
                  <span className="font-mono text-[16px] font-bold text-[#2D5A3D]">
                    {data.methods.avl.time_us} µs
                  </span>
                </div>
                <div className="text-[11px] text-[#2D5A3D] font-medium">
                  {Math.round(((data.methods.linear_scan.comparisons - data.methods.avl.comparisons) / Math.max(1, data.methods.linear_scan.comparisons)) * 100)}% fewer operations than Linear Scan
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
