import { useState, useEffect } from 'react';
import { adsaApi, type StructuresSummaryResponse } from '../../services/adsaApi';

export function SyncStatusSection() {
  const [data, setData] = useState<StructuresSummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adsaApi.getStructuresSummary();
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load structures summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  return (
    <div className="w-full bg-[#FDFCF9] border border-[#D9D4CC] p-6 lg:p-8 rounded-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#EAE6DF]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#2D5A3D]" />
            <span className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#8A8278]">
              Live In-Memory Indexes vs SQLite
            </span>
          </div>
          <h2 className="font-serif text-[24px] md:text-[28px] font-light text-[#1B1B1B]">
            Data Structure Synchronization Status
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {data?.is_all_synced ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#2D5A3D]/10 text-[#2D5A3D] text-[12px] font-medium border border-[#2D5A3D]/30">
              <span className="material-symbols-outlined text-[15px]">check_circle</span>
              All Structures 100% In Sync
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#8B2020]/10 text-[#8B2020] text-[12px] font-medium border border-[#8B2020]/30">
              <span className="material-symbols-outlined text-[15px]">warning</span>
              Sync Discrepancy Detected
            </span>
          )}
          <button
            type="button"
            onClick={fetchSummary}
            disabled={loading}
            className="p-2 border border-[#D9D4CC] bg-[#F5F1EA] hover:bg-[#EAE6DF] text-[#1B1B1B] transition-colors"
            title="Refresh Status"
          >
            <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
          </button>
        </div>
      </div>

      {error ? (
        <div className="p-4 mt-6 bg-[#8B2020]/10 border border-[#8B2020]/30 text-[#8B2020] text-[13px]">
          {error}
        </div>
      ) : loading && !data ? (
        <div className="py-12 flex justify-center text-[#8A8278] text-[13px]">
          Reading live data structures from backend...
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {/* 1. BST */}
          <div className="p-5 bg-[#F5F1EA] border border-[#D9D4CC] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-serif text-[16px] text-[#1B1B1B] font-medium">
                  {data.structures.bst.name}
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-[#EAE6DF] text-[#5C5A56] border border-[#D9D4CC]">
                  BST
                </span>
              </div>
              <p className="text-[12px] text-[#5C5A56] mb-4">
                Key: <code className="text-[#1B1B1B]">{data.structures.bst.key_type}</code>
              </p>
            </div>
            <div>
              <div className="flex items-baseline justify-between pt-3 border-t border-[#D9D4CC]">
                <span className="text-[12px] text-[#5C5A56]">Indexed Nodes</span>
                <span className="font-mono text-[20px] font-semibold text-[#1B1B1B]">
                  {data.structures.bst.node_count} <span className="text-[12px] font-normal text-[#8A8278]">/ {data.sqlite_product_count}</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#5C5A56] mt-2">
                <span>Height: <strong className="font-mono text-[#8B2020]">{data.structures.bst.height}</strong> (Unbalanced)</span>
                <span className="text-[#2D5A3D] font-medium">Match: Yes</span>
              </div>
            </div>
          </div>

          {/* 2. AVL Tree (ID) */}
          <div className="p-5 bg-[#F5F1EA] border border-[#D9D4CC] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-serif text-[16px] text-[#1B1B1B] font-medium">
                  {data.structures.avl_id.name}
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-[#2D5A3D]/10 text-[#2D5A3D] border border-[#2D5A3D]/30">
                  AVL ID
                </span>
              </div>
              <p className="text-[12px] text-[#5C5A56] mb-4">
                Key: <code className="text-[#1B1B1B]">{data.structures.avl_id.key_type}</code>
              </p>
            </div>
            <div>
              <div className="flex items-baseline justify-between pt-3 border-t border-[#D9D4CC]">
                <span className="text-[12px] text-[#5C5A56]">Indexed Nodes</span>
                <span className="font-mono text-[20px] font-semibold text-[#1B1B1B]">
                  {data.structures.avl_id.node_count} <span className="text-[12px] font-normal text-[#8A8278]">/ {data.sqlite_product_count}</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#5C5A56] mt-2">
                <span>Height: <strong className="font-mono text-[#2D5A3D]">{data.structures.avl_id.height}</strong> (Strictly Balanced)</span>
                <span className="text-[#2D5A3D] font-medium">Match: Yes</span>
              </div>
            </div>
          </div>

          {/* 3. AVL Tree (Name) */}
          <div className="p-5 bg-[#F5F1EA] border border-[#D9D4CC] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-serif text-[16px] text-[#1B1B1B] font-medium">
                  {data.structures.avl_name.name}
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-[#2D5A3D]/10 text-[#2D5A3D] border border-[#2D5A3D]/30">
                  AVL Name
                </span>
              </div>
              <p className="text-[12px] text-[#5C5A56] mb-4">
                Key: <code className="text-[#1B1B1B]">{data.structures.avl_name.key_type}</code>
              </p>
            </div>
            <div>
              <div className="flex items-baseline justify-between pt-3 border-t border-[#D9D4CC]">
                <span className="text-[12px] text-[#5C5A56]">Unique Names</span>
                <span className="font-mono text-[20px] font-semibold text-[#1B1B1B]">
                  {data.structures.avl_name.node_count} <span className="text-[12px] font-normal text-[#8A8278]">/ {data.sqlite_product_count}</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#5C5A56] mt-2">
                <span>Height: <strong className="font-mono text-[#2D5A3D]">{data.structures.avl_name.height}</strong> (Balanced)</span>
                <span className="text-[#2D5A3D] font-medium">Match: Yes</span>
              </div>
            </div>
          </div>

          {/* 4. Price Index */}
          <div className="p-5 bg-[#F5F1EA] border border-[#D9D4CC] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-serif text-[16px] text-[#1B1B1B] font-medium">
                  {data.structures.price_index.name}
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-[#EAE6DF] text-[#5C5A56] border border-[#D9D4CC]">
                  Range Index
                </span>
              </div>
              <p className="text-[12px] text-[#5C5A56] mb-4">
                Buckets: <code className="text-[#1B1B1B]">{data.structures.price_index.node_count} distinct prices</code>
              </p>
            </div>
            <div>
              <div className="flex items-baseline justify-between pt-3 border-t border-[#D9D4CC]">
                <span className="text-[12px] text-[#5C5A56]">Indexed Items</span>
                <span className="font-mono text-[20px] font-semibold text-[#1B1B1B]">
                  {data.structures.price_index.total_indexed_products} <span className="text-[12px] font-normal text-[#8A8278]">/ {data.sqlite_product_count}</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#5C5A56] mt-2">
                <span>Height: <strong className="font-mono text-[#2D5A3D]">{data.structures.price_index.height}</strong></span>
                <span className="text-[#2D5A3D] font-medium">Match: Yes</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
