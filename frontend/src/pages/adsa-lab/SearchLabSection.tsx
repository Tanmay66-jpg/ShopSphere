import { useState, useEffect } from 'react';
import { adsaApi, type SearchTraceResponse, type TraceStepItem } from '../../services/adsaApi';
import { productStore } from '../../services/productStore';
import type { Product } from '../../types/product';

export function SearchLabSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchMode, setSearchMode] = useState<'id' | 'name' | 'price'>('id');
  const [selectedProductId, setSelectedProductId] = useState<number>(1);
  const [customQuery, setCustomQuery] = useState<string>('Sony');
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 1000, max: 8000 });

  const [traceData, setTraceData] = useState<SearchTraceResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Animated step-by-step state
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  useEffect(() => {
    setProducts(productStore.getAll());
    const unsub = productStore.subscribe(() => {
      setProducts(productStore.getAll());
    });
    return unsub;
  }, []);

  const runSearch = async () => {
    setLoading(true);
    setError(null);
    setIsPlaying(false);
    setActiveStepIndex(0);

    try {
      let q = '';
      if (searchMode === 'id') {
        q = String(selectedProductId);
      } else if (searchMode === 'name') {
        q = customQuery;
      } else {
        q = `${priceRange.min}-${priceRange.max}`;
      }

      const res = await adsaApi.getSearchTrace(searchMode, q);
      setTraceData(res);
      // Automatically advance to last step
      if (res.avl_trace?.steps?.length) {
        setActiveStepIndex(res.avl_trace.steps.length - 1);
      } else if (res.steps?.length) {
        setActiveStepIndex(res.steps.length - 1);
      }
    } catch (err: any) {
      setError(err?.message || 'Search execution failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchMode, selectedProductId]);

  // Handle animated traversal playback
  const handlePlayAnimation = () => {
    const steps = traceData?.avl_trace?.steps || traceData?.steps || [];
    if (!steps.length) return;

    setIsPlaying(true);
    setActiveStepIndex(0);

    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      if (current >= steps.length) {
        clearInterval(interval);
        setIsPlaying(false);
      } else {
        setActiveStepIndex(current);
      }
    }, 600);
  };

  const stepsToDisplay: TraceStepItem[] =
    traceData?.avl_trace?.steps || traceData?.steps || [];

  return (
    <div className="w-full bg-[#FDFCF9] border border-[#D9D4CC] p-6 lg:p-8 rounded-none mt-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#EAE6DF]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#8A8278]">
              Data-Driven Traversal Inspector
            </span>
          </div>
          <h2 className="font-serif text-[24px] md:text-[28px] font-light text-[#1B1B1B]">
            Search Path Lab &amp; Range Query Trace
          </h2>
        </div>

        {/* Mode Selector */}
        <div className="flex border border-[#D9D4CC] bg-[#F5F1EA]">
          <button
            type="button"
            onClick={() => setSearchMode('id')}
            className={`px-3 py-1.5 text-[12px] font-medium transition-colors ${
              searchMode === 'id' ? 'bg-[#1B1B1B] text-white' : 'text-[#5C5A56] hover:text-[#1B1B1B]'
            }`}
          >
            Product ID Lookup
          </button>
          <button
            type="button"
            onClick={() => setSearchMode('name')}
            className={`px-3 py-1.5 text-[12px] font-medium transition-colors border-l border-[#D9D4CC] ${
              searchMode === 'name' ? 'bg-[#1B1B1B] text-white' : 'text-[#5C5A56] hover:text-[#1B1B1B]'
            }`}
          >
            Name Prefix Lookup
          </button>
          <button
            type="button"
            onClick={() => setSearchMode('price')}
            className={`px-3 py-1.5 text-[12px] font-medium transition-colors border-l border-[#D9D4CC] ${
              searchMode === 'price' ? 'bg-[#1B1B1B] text-white' : 'text-[#5C5A56] hover:text-[#1B1B1B]'
            }`}
          >
            Price Range Index
          </button>
        </div>
      </div>

      {/* Query Inputs Row */}
      <div className="p-4 bg-[#F5F1EA] border border-[#D9D4CC] mt-6 flex flex-wrap items-center gap-4">
        {searchMode === 'id' && (
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <label className="text-[12px] text-[#5C5A56] font-medium flex-shrink-0">
              Pick Product (50 Database Items):
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(Number(e.target.value))}
              className="flex-1 h-9 px-3 bg-[#FDFCF9] border border-[#D9D4CC] text-[13px] text-[#1B1B1B] focus:outline-none focus:border-[#2D5A3D]"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.id} — {p.sku} ({p.name.slice(0, 32)}...) - ₹{p.price.toLocaleString('en-IN')}
                </option>
              ))}
            </select>
          </div>
        )}

        {searchMode === 'name' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runSearch();
            }}
            className="flex items-center gap-3 flex-1 min-w-[280px]"
          >
            <label className="text-[12px] text-[#5C5A56] font-medium flex-shrink-0">
              Product Name / Brand:
            </label>
            <input
              type="text"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              placeholder="e.g. Sony, Nike, IKEA, boAt..."
              className="flex-1 h-9 px-3 bg-[#FDFCF9] border border-[#D9D4CC] text-[13px] text-[#1B1B1B] focus:outline-none focus:border-[#2D5A3D]"
            />
            <button
              type="submit"
              className="px-4 h-9 bg-[#1B1B1B] text-white text-[12px] font-medium hover:bg-[#2D5A3D] transition-colors"
            >
              Execute Search
            </button>
          </form>
        )}

        {searchMode === 'price' && (
          <div className="flex flex-wrap items-center gap-4 flex-1">
            <span className="text-[12px] text-[#5C5A56] font-medium">Price Range:</span>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-[#8A8278]">Min ₹</span>
              <input
                type="number"
                step="500"
                min="100"
                value={priceRange.min}
                onChange={(e) => setPriceRange({ ...priceRange, min: Number(e.target.value) })}
                className="w-24 h-9 px-2 bg-[#FDFCF9] border border-[#D9D4CC] text-[13px] font-mono text-[#1B1B1B]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-[#8A8278]">Max ₹</span>
              <input
                type="number"
                step="500"
                min="500"
                value={priceRange.max}
                onChange={(e) => setPriceRange({ ...priceRange, max: Number(e.target.value) })}
                className="w-24 h-9 px-2 bg-[#FDFCF9] border border-[#D9D4CC] text-[13px] font-mono text-[#1B1B1B]"
              />
            </div>
            <button
              type="button"
              onClick={runSearch}
              className="px-4 h-9 bg-[#1B1B1B] text-white text-[12px] font-medium hover:bg-[#2D5A3D] transition-colors ml-auto"
            >
              Query Price Index
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={handlePlayAnimation}
          disabled={isPlaying || loading || stepsToDisplay.length === 0}
          className="flex items-center gap-1.5 px-3 h-9 bg-[#2D5A3D] text-white text-[12px] font-medium hover:bg-[#23452f] transition-colors disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-[16px]">play_arrow</span>
          <span>{isPlaying ? 'Tracing...' : 'Replay Animation'}</span>
        </button>
      </div>

      {error ? (
        <div className="p-4 mt-6 bg-[#8B2020]/10 border border-[#8B2020]/30 text-[#8B2020] text-[13px]">
          {error}
        </div>
      ) : traceData ? (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Step-by-step path breakdown */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="p-4 bg-[#F5F1EA] border border-[#D9D4CC]">
              <div className="flex items-center justify-between text-[12px] text-[#5C5A56] mb-3">
                <span>
                  Query Target: <strong className="font-mono text-[#1B1B1B]">{String(traceData.query)}</strong>
                </span>
                <span>
                  Backend Execution Time: <strong className="font-mono text-[#2D5A3D]">{traceData.elapsed_us} µs</strong>
                </span>
              </div>

              {searchMode === 'id' && traceData.bst_trace && traceData.avl_trace && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 bg-[#FDFCF9] border border-[#D9D4CC]">
                    <div className="text-[11px] text-[#8A8278] uppercase font-mono">Unbalanced BST</div>
                    <div className="text-[18px] font-mono font-bold text-[#8B2020]">
                      {traceData.bst_trace.comparisons} <span className="text-[11px] font-normal text-[#5C5A56]">hops</span>
                    </div>
                  </div>
                  <div className="p-3 bg-[#FDFCF9] border border-[#D9D4CC]">
                    <div className="text-[11px] text-[#8A8278] uppercase font-mono">Balanced AVL</div>
                    <div className="text-[18px] font-mono font-bold text-[#2D5A3D]">
                      {traceData.avl_trace.comparisons} <span className="text-[11px] font-normal text-[#5C5A56]">hops</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Step Sequence */}
              {stepsToDisplay.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#8A8278] mb-2">
                    Step-by-Step Node Traversal
                  </h4>
                  <div className="space-y-2">
                    {stepsToDisplay.map((step, idx) => {
                      const isCurrent = idx === activeStepIndex;
                      const isPast = idx < activeStepIndex;

                      return (
                        <div
                          key={`step-${idx}`}
                          className={`p-2.5 border transition-all flex items-center justify-between text-[12px] font-mono ${
                            isCurrent
                              ? 'bg-[#1B1B1B] text-white border-[#1B1B1B]'
                              : isPast
                              ? 'bg-[#FDFCF9] text-[#1B1B1B] border-[#D9D4CC]'
                              : 'bg-[#FDFCF9]/50 text-[#8A8278] border-[#EAE6DF]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#EAE6DF] text-[#1B1B1B] flex items-center justify-center text-[10px] font-bold">
                              {idx + 1}
                            </span>
                            <span>Node Key: #{String(step.node_key)}</span>
                            <span className="text-[10px] text-[#8A8278]">(Depth: {step.depth})</span>
                          </div>
                          <span
                            className={`px-2 py-0.5 text-[10px] uppercase font-bold ${
                              step.direction === 'match'
                                ? 'bg-[#2D5A3D] text-white'
                                : isCurrent
                                ? 'bg-white/20 text-white'
                                : 'bg-[#EAE6DF] text-[#5C5A56]'
                            }`}
                          >
                            {step.comparison} &rarr; {step.direction}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Matched Result Card */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="p-5 bg-[#F5F1EA] border border-[#D9D4CC] h-full flex flex-col justify-between">
              <div>
                <h4 className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#8A8278] mb-3">
                  Retrieved Product Payload
                </h4>

                {traceData.result ? (
                  <div className="p-4 bg-[#FDFCF9] border border-[#D9D4CC]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[11px] uppercase text-[#2D5A3D] font-bold">
                        {traceData.result.sku}
                      </span>
                      <span className="text-[11px] text-[#8A8278]">
                        ID: #{traceData.result.id}
                      </span>
                    </div>
                    <h5 className="font-serif text-[18px] text-[#1B1B1B] leading-snug mb-2">
                      {traceData.result.name}
                    </h5>
                    <div className="text-[12px] text-[#5C5A56] mb-3">
                      Category: <strong className="text-[#1B1B1B]">{traceData.result.category}</strong>
                    </div>
                    <div className="pt-3 border-t border-[#EAE6DF] flex items-baseline justify-between">
                      <span className="text-[12px] text-[#5C5A56]">Catalogue Price</span>
                      <span className="font-serif text-[20px] font-medium text-[#1B1B1B]">
                        ₹{traceData.result.price.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ) : traceData.matching_products?.length ? (
                  <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                    <p className="text-[12px] text-[#5C5A56] mb-2 font-mono">
                      Found {traceData.matching_products.length} products matching criteria:
                    </p>
                    {traceData.matching_products.map((p) => (
                      <div key={p.id} className="p-3 bg-[#FDFCF9] border border-[#D9D4CC] flex items-center justify-between text-[12px]">
                        <div>
                          <div className="font-medium text-[#1B1B1B] line-clamp-1">{p.name}</div>
                          <div className="text-[10px] text-[#8A8278] font-mono">#{p.id} • {p.sku}</div>
                        </div>
                        <div className="font-serif text-[14px] text-[#1B1B1B] ml-2 flex-shrink-0">
                          ₹{p.price.toLocaleString('en-IN')}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-[#8A8278] text-[13px] bg-[#FDFCF9] border border-[#D9D4CC]">
                    No matching products located in the current tree snapshot.
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-[#D9D4CC] text-[11px] text-[#5C5A56]">
                Guaranteed: No database full-table scans. All lookups resolve through in-memory tree nodes.
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
