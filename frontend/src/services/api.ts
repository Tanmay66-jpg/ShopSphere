import type { Product, ProductFilterState, SearchResponse } from '../types/product';
import type { TreeStructureResponse, OperationTraceResponse, BenchmarkResponse } from '../types/adsa';
import { API_BASE_URL } from './apiConfig';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const endpoint = url.startsWith('/') ? url : `/${url}`;
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errorDetail = `API request failed (${response.status} ${response.statusText})`;
    try {
      const err = await response.json();
      errorDetail = err.detail || JSON.stringify(err);
    } catch {
      errorDetail = response.statusText;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  // Health
  getHealth: () => fetchJson<{ status: string; engine: string; total_products: number }>('/health'),

  // Products
  getProducts: (params?: { category?: string; limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.category && params.category !== 'All Categories') query.append('category', params.category);
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());
    const qs = query.toString();
    return fetchJson<Product[]>(`/products${qs ? `?${qs}` : ''}`);
  },

  getProductById: (id: number) => fetchJson<Product>(`/products/${id}`),

  createProduct: (product: Omit<Product, 'id'>) =>
    fetchJson<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(product),
    }),

  updateProduct: (id: number, product: Partial<Product>) =>
    fetchJson<Product>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(product),
    }),

  deleteProduct: (id: number) =>
    fetchJson<{ message: string; deleted_id: number }>(`/products/${id}`, {
      method: 'DELETE',
    }),

  getCategories: () => fetchJson<string[]>('/categories'),

  // Search
  searchProducts: (filters: Partial<ProductFilterState>) =>
    fetchJson<SearchResponse>('/search', {
      method: 'POST',
      body: JSON.stringify(filters),
    }),

  // ADSA Lab
  getBstTree: (maxNodes?: number) =>
    fetchJson<TreeStructureResponse>(`/adsa/tree/bst${maxNodes ? `?max_nodes=${maxNodes}` : ''}`),

  getAvlTree: (maxNodes?: number) =>
    fetchJson<TreeStructureResponse>(`/adsa/tree/avl${maxNodes ? `?max_nodes=${maxNodes}` : ''}`),

  traceOperation: (params: { tree_type: 'bst' | 'avl'; target_key: number | string; max_nodes?: number }) =>
    fetchJson<OperationTraceResponse>('/adsa/operation-trace', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  runBenchmark: (params: {
    dataset_size: number;
    insertion_order: 'random' | 'ascending' | 'descending';
    repetitions?: number;
    iterations?: number;
    seed?: number;
    target_key?: number;
    include_raw_samples?: boolean;
  }) =>
    fetchJson<BenchmarkResponse>('/benchmark', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  syncTrees: () => fetchJson<{ status: string; node_count: number; sync_time_ms: number }>('/adsa/sync'),
};
