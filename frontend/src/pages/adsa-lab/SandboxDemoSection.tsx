import { useState } from 'react';

// Pure client-side in-memory AVL implementation for sandbox demonstration
interface SandboxNode {
  key: number;
  height: number;
  left: SandboxNode | null;
  right: SandboxNode | null;
}

function getNodeHeight(node: SandboxNode | null): number {
  return node ? node.height : 0;
}

function getBalanceFactor(node: SandboxNode | null): number {
  return node ? getNodeHeight(node.left) - getNodeHeight(node.right) : 0;
}

function updateHeight(node: SandboxNode): void {
  node.height = 1 + Math.max(getNodeHeight(node.left), getNodeHeight(node.right));
}

export function SandboxDemoSection() {
  const [root, setRoot] = useState<SandboxNode | null>(() => {
    // Initial sample tree: [20, 10, 30, 5, 15]
    let r: SandboxNode | null = null;
    const initialKeys = [20, 10, 30, 5, 15];
    for (const k of initialKeys) {
      r = insertPure(r, k, () => {});
    }
    return r;
  });

  const [inputKey, setInputKey] = useState<string>('25');
  const [rotationEvents, setRotationEvents] = useState<string[]>([
    'Initialized sandbox AVL tree with sample keys: [20, 10, 30, 5, 15].',
  ]);

  // Rotations
  function rightRotate(y: SandboxNode, log: (msg: string) => void): SandboxNode {
    const x = y.left!;
    const T2 = x.right;

    x.right = y;
    y.left = T2;

    updateHeight(y);
    updateHeight(x);

    log(`Rotated RIGHT around node #${y.key} (LL Rebalance) -> Node #${x.key} is new local root.`);
    return x;
  }

  function leftRotate(x: SandboxNode, log: (msg: string) => void): SandboxNode {
    const y = x.right!;
    const T2 = y.left;

    y.left = x;
    x.right = T2;

    updateHeight(x);
    updateHeight(y);

    log(`Rotated LEFT around node #${x.key} (RR Rebalance) -> Node #${y.key} is new local root.`);
    return y;
  }

  function insertPure(
    node: SandboxNode | null,
    key: number,
    log: (msg: string) => void
  ): SandboxNode {
    if (!node) {
      return { key, height: 1, left: null, right: null };
    }

    if (key < node.key) {
      node.left = insertPure(node.left, key, log);
    } else if (key > node.key) {
      node.right = insertPure(node.right, key, log);
    } else {
      log(`Key #${key} already exists in tree (duplicates ignored).`);
      return node;
    }

    updateHeight(node);
    const balance = getBalanceFactor(node);

    // Left-Left (LL) Case
    if (balance > 1 && key < (node.left?.key ?? 0)) {
      log(`Imbalance detected at #${node.key} (BF = +${balance}). Executing Right Rotation (LL).`);
      return rightRotate(node, log);
    }

    // Right-Right (RR) Case
    if (balance < -1 && key > (node.right?.key ?? 0)) {
      log(`Imbalance detected at #${node.key} (BF = ${balance}). Executing Left Rotation (RR).`);
      return leftRotate(node, log);
    }

    // Left-Right (LR) Case
    if (balance > 1 && key > (node.left?.key ?? 0)) {
      log(`Double Imbalance at #${node.key} (LR). Step 1: Left rotate child #${node.left?.key}.`);
      node.left = leftRotate(node.left!, log);
      log(`Step 2: Right rotate root #${node.key}.`);
      return rightRotate(node, log);
    }

    // Right-Left (RL) Case
    if (balance < -1 && key < (node.right?.key ?? 0)) {
      log(`Double Imbalance at #${node.key} (RL). Step 1: Right rotate child #${node.right?.key}.`);
      node.right = rightRotate(node.right!, log);
      log(`Step 2: Left rotate root #${node.key}.`);
      return leftRotate(node, log);
    }

    return node;
  }

  function minValueNode(node: SandboxNode): SandboxNode {
    let current = node;
    while (current.left) {
      current = current.left;
    }
    return current;
  }

  function deletePure(
    node: SandboxNode | null,
    key: number,
    log: (msg: string) => void
  ): SandboxNode | null {
    if (!node) {
      log(`Key #${key} not found for deletion.`);
      return null;
    }

    if (key < node.key) {
      node.left = deletePure(node.left, key, log);
    } else if (key > node.key) {
      node.right = deletePure(node.right, key, log);
    } else {
      if (!node.left || !node.right) {
        const temp = node.left || node.right;
        node = temp;
        log(`Pruned leaf/single-child node #${key}.`);
      } else {
        const temp = minValueNode(node.right);
        node.key = temp.key;
        node.right = deletePure(node.right, temp.key, log);
        log(`Replaced node #${key} with in-order successor #${temp.key}.`);
      }
    }

    if (!node) return null;

    updateHeight(node);
    const balance = getBalanceFactor(node);

    if (balance > 1 && getBalanceFactor(node.left) >= 0) {
      return rightRotate(node, log);
    }
    if (balance > 1 && getBalanceFactor(node.left) < 0) {
      node.left = leftRotate(node.left!, log);
      return rightRotate(node, log);
    }
    if (balance < -1 && getBalanceFactor(node.right) <= 0) {
      return leftRotate(node, log);
    }
    if (balance < -1 && getBalanceFactor(node.right) > 0) {
      node.right = rightRotate(node.right!, log);
      return leftRotate(node, log);
    }

    return node;
  }

  const handleInsert = () => {
    const k = parseInt(inputKey, 10);
    if (isNaN(k)) return;

    const newLogs: string[] = [];
    const newRoot = insertPure(root, k, (msg) => newLogs.push(msg));
    setRoot({ ...newRoot });
    setRotationEvents((prev) => [...newLogs, ...prev].slice(0, 15));
    setInputKey('');
  };

  const handleDelete = () => {
    const k = parseInt(inputKey, 10);
    if (isNaN(k)) return;

    const newLogs: string[] = [];
    const newRoot = deletePure(root, k, (msg) => newLogs.push(msg));
    setRoot(newRoot ? { ...newRoot } : null);
    setRotationEvents((prev) => [...newLogs, ...prev].slice(0, 15));
    setInputKey('');
  };

  const handleReset = () => {
    let r: SandboxNode | null = null;
    const initialKeys = [20, 10, 30, 5, 15];
    for (const k of initialKeys) {
      r = insertPure(r, k, () => {});
    }
    setRoot(r);
    setRotationEvents(['Reset sandbox AVL tree to standard 5-node baseline.']);
  };

  // Convert pure tree to SVG nodes
  interface FlatSandboxNode {
    key: number;
    height: number;
    bf: number;
    x: number;
    y: number;
  }
  const nodes: FlatSandboxNode[] = [];
  const edges: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

  const traverse = (node: SandboxNode | null, x: number, y: number, spread: number) => {
    if (!node) return;
    nodes.push({ key: node.key, height: node.height, bf: getBalanceFactor(node), x, y });

    const nextY = y + 70;
    const nextSpread = Math.max(spread / 1.9, 35);

    if (node.left) {
      edges.push({ x1: x, y1: y, x2: x - nextSpread, y2: nextY });
      traverse(node.left, x - nextSpread, nextY, nextSpread);
    }
    if (node.right) {
      edges.push({ x1: x, y1: y, x2: x + nextSpread, y2: nextY });
      traverse(node.right, x + nextSpread, nextY, nextSpread);
    }
  };

  traverse(root, 300, 45, 120);

  return (
    <div className="w-full bg-[#FDFCF9] border border-[#D9D4CC] p-6 lg:p-8 rounded-none mt-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#EAE6DF]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#8A8278]">
              Client-Side Rotation Simulator
            </span>
          </div>
          <h2 className="font-serif text-[24px] md:text-[28px] font-light text-[#1B1B1B]">
            Interactive AVL Rotation Sandbox
          </h2>
        </div>

        {/* Input controls */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            placeholder="Key (e.g. 25)..."
            className="w-28 h-9 px-3 bg-[#F5F1EA] border border-[#D9D4CC] text-[13px] font-mono text-[#1B1B1B]"
          />
          <button
            type="button"
            onClick={handleInsert}
            className="px-3 h-9 bg-[#2D5A3D] text-white text-[12px] font-medium hover:bg-[#23452f] transition-colors"
          >
            Insert Key
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="px-3 h-9 bg-[#8B2020] text-white text-[12px] font-medium hover:bg-[#701a1a] transition-colors"
          >
            Delete Key
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-3 h-9 border border-[#D9D4CC] bg-[#F5F1EA] text-[#5C5A56] hover:text-[#1B1B1B] text-[12px] font-medium"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="text-[11px] text-[#5C5A56] mt-3">
        * Completely sandboxed in local memory. Zero risk to persistent database records or active catalogue indexes.
      </div>

      {/* Grid: SVG Canvas + Rotation Event Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Left: Interactive Tree Canvas */}
        <div className="lg:col-span-7 bg-[#FAF8F5] border border-[#D9D4CC] h-[340px] relative overflow-hidden flex items-center justify-center">
          <svg className="w-full h-full" viewBox="0 0 600 340">
            {edges.map((e, idx) => (
              <line key={idx} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke="#D9D4CC" strokeWidth={1.5} />
            ))}
            {nodes.map((n) => (
              <g key={n.key} transform={`translate(${n.x}, ${n.y})`}>
                <circle
                  r={16}
                  fill="#FDFCF9"
                  stroke={Math.abs(n.bf) <= 1 ? '#2D5A3D' : '#8B2020'}
                  strokeWidth={2}
                />
                <text
                  textAnchor="middle"
                  dy="4"
                  fontSize={10}
                  fontWeight="600"
                  fontFamily="monospace"
                  fill="#1B1B1B"
                >
                  {n.key}
                </text>
                <text
                  textAnchor="middle"
                  dy="24"
                  fontSize={9}
                  fontFamily="monospace"
                  fill="#5C5A56"
                >
                  BF:{n.bf}
                </text>
              </g>
            ))}
          </svg>
        </div>

        {/* Right: Live Rotation Log */}
        <div className="lg:col-span-5 p-4 bg-[#F5F1EA] border border-[#D9D4CC] flex flex-col justify-between">
          <div>
            <h4 className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#8A8278] mb-2 flex items-center justify-between">
              <span>Rotation Event Stream</span>
              <span className="font-mono text-[10px] text-[#2D5A3D]">Live Trajectory</span>
            </h4>
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
              {rotationEvents.map((ev, i) => (
                <div
                  key={i}
                  className="p-2 bg-[#FDFCF9] border border-[#D9D4CC] text-[11px] font-mono text-[#1B1B1B] leading-relaxed"
                >
                  {ev}
                </div>
              ))}
            </div>
          </div>
          <div className="pt-3 border-t border-[#D9D4CC] text-[10px] text-[#8A8278]">
            Rotations maintain strict balance factor: BF = height(left) - height(right) ∈ &#123;-1, 0, +1&#125;.
          </div>
        </div>
      </div>
    </div>
  );
}
