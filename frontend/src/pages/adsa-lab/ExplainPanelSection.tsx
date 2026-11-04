export function ExplainPanelSection() {
  return (
    <div className="w-full bg-[#FDFCF9] border border-[#D9D4CC] p-6 lg:p-8 rounded-none mt-8 mb-12">
      <div className="pb-4 border-b border-[#EAE6DF] mb-6">
        <span className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#8A8278]">
          Theoretical Reference &amp; Mathematical Guarantees
        </span>
        <h2 className="font-serif text-[24px] md:text-[28px] font-light text-[#1B1B1B]">
          How ShopSphere Backend Data Structures Work
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 1. BST Degeneration */}
        <div className="p-4 bg-[#F5F1EA] border border-[#D9D4CC]">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8B2020]" />
            <h3 className="font-serif text-[16px] font-medium text-[#1B1B1B]">
              BST Degeneration
            </h3>
          </div>
          <p className="text-[12px] text-[#5C5A56] leading-relaxed mb-3">
            A naive Binary Search Tree inserts nodes based solely on key comparisons without rebalancing.
            When 50 sequential items (<code className="text-[#1B1B1B]">1..50</code>) are inserted, the tree degenerates into a linear linked list of height 49.
          </p>
          <div className="p-2 bg-[#FDFCF9] border border-[#D9D4CC] font-mono text-[11px] text-[#8B2020]">
            Worst Case: O(N) search latency
          </div>
        </div>

        {/* 2. AVL Self-Balancing */}
        <div className="p-4 bg-[#F5F1EA] border border-[#D9D4CC]">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2D5A3D]" />
            <h3 className="font-serif text-[16px] font-medium text-[#1B1B1B]">
              AVL Rotations (LL, RR, LR, RL)
            </h3>
          </div>
          <p className="text-[12px] text-[#5C5A56] leading-relaxed mb-3">
            An AVL tree computes a Balance Factor (<code className="text-[#1B1B1B]">BF = h_L - h_R</code>) at every node. If |BF| &gt; 1, an $O(1)$ single or double rotation restores strict logarithmic bounds.
          </p>
          <div className="p-2 bg-[#FDFCF9] border border-[#D9D4CC] font-mono text-[11px] text-[#2D5A3D]">
            Guaranteed: O(log N) worst case
          </div>
        </div>

        {/* 3. Balanced Price Index */}
        <div className="p-4 bg-[#F5F1EA] border border-[#D9D4CC]">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2D5A3D]" />
            <h3 className="font-serif text-[16px] font-medium text-[#1B1B1B]">
              Multi-Bucket Price Index
            </h3>
          </div>
          <p className="text-[12px] text-[#5C5A56] leading-relaxed mb-3">
            The Price Index maps price values in paise to sets of product IDs. Range queries (<code className="text-[#1B1B1B]">₹1k - ₹5k</code>) traverse only the bounding subtrees without scanning irrelevant price points.
          </p>
          <div className="p-2 bg-[#FDFCF9] border border-[#D9D4CC] font-mono text-[11px] text-[#1B1B1B]">
            Complexity: O(log M + K)
          </div>
        </div>

        {/* 4. Persistence & Sync Invariant */}
        <div className="p-4 bg-[#F5F1EA] border border-[#D9D4CC]">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2D5A3D]" />
            <h3 className="font-serif text-[16px] font-medium text-[#1B1B1B]">
              Zero-Downtime Sync
            </h3>
          </div>
          <p className="text-[12px] text-[#5C5A56] leading-relaxed mb-3">
            SQLite provides ACID durability on disk, while memory trees serve read traffic with sub-millisecond latency. Mutations atomically update SQLite and prune/rebalance memory indexes.
          </p>
          <div className="p-2 bg-[#FDFCF9] border border-[#D9D4CC] font-mono text-[11px] text-[#2D5A3D]">
            Memory: 50 | Disk: 50 (100% Sync)
          </div>
        </div>
      </div>
    </div>
  );
}
