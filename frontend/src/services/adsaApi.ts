/**
 * ADSA Live Backend Working API Client
 * Connects to /api/adsa/ endpoints to inspect real database data structures.
 */

const API_BASE = '/api/adsa';

async function fetchAdsaJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    let errorDetail = `ADSA API Error (${res.status} ${res.statusText})`;
    try {
      const errorJson = await res.json();
      if (errorJson.detail) {
        errorDetail = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
      }
    } catch {
      // Ignore JSON parse failure on non-JSON response
    }
    throw new Error(errorDetail);
  }

  return res.json();
}

export interface StructureSummaryItem {
  name: string;
  key_type: string;
  node_count: number;
  height: number;
  is_balanced: boolean;
  matches_sqlite?: boolean;
  total_indexed_products?: number;
  distinct_keys?: number;
  complexity: string;
}

export interface StructuresSummaryResponse {
  sqlite_product_count: number;
  is_all_synced: boolean;
  structures: {
    bst: StructureSummaryItem;
    avl_id: StructureSummaryItem;
    avl_name: StructureSummaryItem;
    price_index: StructureSummaryItem;
  };
}

export interface TreeNodeData {
  key: string | number;
  height: number;
  balance_factor: number;
  left: TreeNodeData | null;
  right: TreeNodeData | null;
  id?: number;
  sku?: string;
  name?: string;
  category?: string;
  price?: number;
  label?: string;
  sublabel?: string;
  product_ids?: number[];
  count?: number;
}

export interface TreeResponse {
  tree_type: string;
  name: string;
  total_nodes: number;
  height: number;
  is_balanced: boolean;
  root: TreeNodeData | null;
}

export interface TraceStepItem {
  node_key: number | string | null;
  depth: number;
  comparison: string;
  direction: 'left' | 'right' | 'match' | 'none';
}

export interface SearchTraceResponse {
  type: 'id' | 'name' | 'price';
  query: string | number;
  found?: boolean;
  elapsed_us: number;
  result?: {
    id: number;
    sku: string;
    name: string;
    category: string;
    price: number;
  } | null;
  bst_trace?: {
    comparisons: number;
    steps: TraceStepItem[];
  };
  avl_trace?: {
    comparisons: number;
    steps: TraceStepItem[];
  };
  normalized_query?: string;
  matching_products?: Array<{
    id: number;
    sku: string;
    name: string;
    price: number;
  }>;
  steps?: TraceStepItem[];
  min_rupees?: number;
  max_rupees?: number;
  count?: number;
}

export interface MethodComparisonItem {
  name: string;
  comparisons: number;
  time_us: number;
  time_ns: number;
  complexity: string;
  found: boolean;
}

export interface CompareMethodsResponse {
  query: string;
  is_id_search: boolean;
  catalogue_size: number;
  matched_product: {
    id: number;
    sku: string;
    name: string;
    price: number;
  } | null;
  methods: {
    linear_scan: MethodComparisonItem;
    bst: MethodComparisonItem;
    avl: MethodComparisonItem;
  };
}

export interface InsertionOrderResponse {
  product_count: number;
  sequential_insertion: {
    order: string;
    bst_height: number;
    bst_is_degenerate: boolean;
    avl_height: number;
    avl_is_balanced: boolean;
    avl_rotations: {
      LL: number;
      RR: number;
      LR: number;
      RL: number;
      total: number;
    };
    explanation: string;
  };
  random_insertion: {
    order: string;
    bst_height: number;
    avl_height: number;
    explanation: string;
  };
}

export const adsaApi = {
  getStructuresSummary: () =>
    fetchAdsaJson<StructuresSummaryResponse>('/structures/summary'),

  getStructureTree: (treeType: 'bst' | 'avl-id' | 'avl-name', maxDepth: number = 7) =>
    fetchAdsaJson<TreeResponse>(`/structures/tree/${treeType}?max_depth=${maxDepth}`),

  getSearchTrace: (type: 'id' | 'name' | 'price', query: string) =>
    fetchAdsaJson<SearchTraceResponse>(`/search/trace?type=${type}&query=${encodeURIComponent(query)}`),

  compareMethods: (query: string) =>
    fetchAdsaJson<CompareMethodsResponse>(`/compare?query=${encodeURIComponent(query)}`),

  getInsertionOrder: () =>
    fetchAdsaJson<InsertionOrderResponse>('/insertion-order'),
};

