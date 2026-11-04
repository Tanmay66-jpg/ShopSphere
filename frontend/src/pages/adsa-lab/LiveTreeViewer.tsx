import { useState, useEffect, useRef } from 'react';
import { adsaApi, type TreeResponse, type TreeNodeData } from '../../services/adsaApi';

interface FlatNode {
  id: string;
  x: number;
  y: number;
  data: TreeNodeData;
  parent?: FlatNode;
}

export function LiveTreeViewer() {
  const [treeType, setTreeType] = useState<'avl-id' | 'bst'>('avl-id');
  const [data, setData] = useState<TreeResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<TreeNodeData | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const fetchTree = async (type: 'avl-id' | 'bst') => {
    setLoading(true);
    setError(null);
    try {
      const res = await adsaApi.getStructureTree(type, 8);
      setData(res);
      // Reset pan/zoom on tree change
      setZoom(1);
      setPan({ x: 0, y: 0 });
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch tree structure');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTree(treeType);
  }, [treeType]);

  // Compute 2D node coordinates for hierarchical SVG rendering
  const layoutTree = (root: TreeNodeData | null): { nodes: FlatNode[]; edges: Array<{ x1: number; y1: number; x2: number; y2: number }> } => {
    if (!root) return { nodes: [], edges: [] };

    const nodes: FlatNode[] = [];
    const edges: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

    // Helper to calculate subtree width
    const getSubtreeWidth = (node: TreeNodeData | null): number => {
      if (!node) return 0;
      if (!node.left && !node.right) return 70;
      const leftW = getSubtreeWidth(node.left);
      const rightW = getSubtreeWidth(node.right);
      return Math.max(leftW + rightW, 80);
    };

    const positionNode = (node: TreeNodeData, x: number, y: number, spread: number, parentNode?: FlatNode) => {
      const flat: FlatNode = {
        id: String(node.key),
        x,
        y,
        data: node,
        parent: parentNode,
      };
      nodes.push(flat);

      if (parentNode) {
        edges.push({
          x1: parentNode.x,
          y1: parentNode.y,
          x2: x,
          y2: y,
        });
      }

      const nextY = y + 75;
      const nextSpread = Math.max(spread / 1.9, 36);

      if (node.left) {
        positionNode(node.left, x - nextSpread, nextY, nextSpread, flat);
      }
      if (node.right) {
        positionNode(node.right, x + nextSpread, nextY, nextSpread, flat);
      }
    };

    const initialSpread = treeType === 'bst' ? 120 : 380;
    positionNode(root, 600, 50, initialSpread);

    return { nodes, edges };
  };

  const { nodes, edges } = layoutTree(data?.root || null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="w-full bg-[#FDFCF9] border border-[#D9D4CC] p-6 lg:p-8 rounded-none mt-8">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#EAE6DF]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#8A8278]">
              Interactive Graph Visualization
            </span>
          </div>
          <h2 className="font-serif text-[24px] md:text-[28px] font-light text-[#1B1B1B]">
            Live Tree Hierarchy (50 Real Products)
          </h2>
        </div>

        {/* Tree Type Selector & Zoom Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex border border-[#D9D4CC] bg-[#F5F1EA]">
            <button
              type="button"
              onClick={() => setTreeType('avl-id')}
              className={`px-3 py-1.5 text-[12px] font-medium transition-colors ${
                treeType === 'avl-id'
                  ? 'bg-[#1B1B1B] text-white'
                  : 'text-[#5C5A56] hover:text-[#1B1B1B]'
              }`}
            >
              Balanced AVL Tree (ID)
            </button>
            <button
              type="button"
              onClick={() => setTreeType('bst')}
              className={`px-3 py-1.5 text-[12px] font-medium transition-colors border-l border-[#D9D4CC] ${
                treeType === 'bst'
                  ? 'bg-[#1B1B1B] text-white'
                  : 'text-[#5C5A56] hover:text-[#1B1B1B]'
              }`}
            >
              Unbalanced BST (ID)
            </button>
          </div>

          <div className="flex border border-[#D9D4CC] bg-[#F5F1EA]">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
              className="p-1.5 text-[#5C5A56] hover:text-[#1B1B1B]"
              title="Zoom Out"
            >
              <span className="material-symbols-outlined text-[16px]">remove</span>
            </button>
            <span className="px-2 py-1.5 text-[11px] font-mono text-[#5C5A56] border-x border-[#D9D4CC]">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
              className="p-1.5 text-[#5C5A56] hover:text-[#1B1B1B]"
              title="Zoom In"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              className="p-1.5 text-[#5C5A56] hover:text-[#1B1B1B] border-l border-[#D9D4CC]"
              title="Reset View"
            >
              <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {data && (
        <div className="flex flex-wrap items-center gap-6 py-3 px-4 bg-[#F5F1EA] border border-[#D9D4CC] mt-4 text-[12px] text-[#5C5A56]">
          <div>
            Total Nodes: <strong className="font-mono text-[#1B1B1B]">{data.total_nodes}</strong>
          </div>
          <div>
            Tree Height: <strong className={`font-mono ${data.is_balanced ? 'text-[#2D5A3D]' : 'text-[#8B2020]'}`}>{data.height}</strong>
          </div>
          <div>
            AVL Balance Condition: <strong className={data.is_balanced ? 'text-[#2D5A3D]' : 'text-[#8B2020]'}>
              {data.is_balanced ? 'Strictly Balanced (|BF| ≤ 1)' : 'Unbalanced Degenerate Path'}
            </strong>
          </div>
          <div className="ml-auto text-[#8A8278] text-[11px] hidden sm:block">
            Click &amp; drag to pan canvas. Hover over any node for live product specs.
          </div>
        </div>
      )}

      {/* SVG Canvas Area */}
      <div
        className="relative w-full h-[520px] bg-[#FAF8F5] border border-[#D9D4CC] mt-4 overflow-hidden select-none cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {loading ? (
          <div className="w-full h-full flex items-center justify-center text-[#8A8278] text-[13px]">
            Rendering graph structures...
          </div>
        ) : error ? (
          <div className="w-full h-full flex items-center justify-center text-[#8B2020] text-[13px]">
            {error}
          </div>
        ) : (
          <svg className="w-full h-full" style={{ overflow: 'visible' }}>
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Edges */}
              {edges.map((edge, i) => (
                <line
                  key={`edge-${i}`}
                  x1={edge.x1}
                  y1={edge.y1}
                  x2={edge.x2}
                  y2={edge.y2}
                  stroke="#D9D4CC"
                  strokeWidth={1.5}
                />
              ))}

              {/* Nodes */}
              {nodes.map((n) => {
                const isHovered = hoveredNode?.key === n.data.key;
                const isBalancedNode = Math.abs(n.data.balance_factor) <= 1;

                return (
                  <g
                    key={`node-${n.id}`}
                    transform={`translate(${n.x}, ${n.y})`}
                    className="cursor-pointer transition-all"
                    onMouseEnter={() => setHoveredNode(n.data)}
                  >
                    <circle
                      r={isHovered ? 20 : 16}
                      fill={isHovered ? '#1B1B1B' : '#FDFCF9'}
                      stroke={
                        isHovered
                          ? '#2D5A3D'
                          : isBalancedNode
                          ? '#2D5A3D'
                          : '#8B2020'
                      }
                      strokeWidth={isHovered ? 2.5 : 1.5}
                      className="transition-all duration-150"
                    />
                    <text
                      textAnchor="middle"
                      dy="4"
                      fontSize={10}
                      fontWeight="600"
                      fontFamily="monospace"
                      fill={isHovered ? '#FFFFFF' : '#1B1B1B'}
                    >
                      {n.data.key}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        )}

        {/* Hover Product Metadata Inspector Card */}
        {hoveredNode && (
          <div className="absolute bottom-4 left-4 max-w-sm p-4 bg-[#FDFCF9] border border-[#1B1B1B] shadow-md pointer-events-none z-20">
            <div className="flex items-center justify-between border-b border-[#EAE6DF] pb-2 mb-2">
              <span className="font-mono text-[12px] font-bold text-[#1B1B1B]">
                Key #{hoveredNode.key} ({hoveredNode.sku || 'N/A'})
              </span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 border ${
                  Math.abs(hoveredNode.balance_factor) <= 1
                    ? 'border-[#2D5A3D] text-[#2D5A3D]'
                    : 'border-[#8B2020] text-[#8B2020]'
                }`}
              >
                BF: {hoveredNode.balance_factor}
              </span>
            </div>
            <p className="font-serif text-[14px] text-[#1B1B1B] leading-snug line-clamp-2 mb-2">
              {hoveredNode.name || hoveredNode.sublabel || 'Catalogue Product'}
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-[#5C5A56] font-mono">
              <div>Height: <strong className="text-[#1B1B1B]">{hoveredNode.height}</strong></div>
              <div>Category: <strong className="text-[#1B1B1B]">{hoveredNode.category || 'Curated'}</strong></div>
              {hoveredNode.price !== undefined && (
                <div>Price: <strong className="text-[#1B1B1B]">₹{hoveredNode.price.toLocaleString('en-IN')}</strong></div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
