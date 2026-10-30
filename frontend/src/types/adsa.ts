export interface TreeNodePayload {
  key: number | string;
  value?: any;
  height: number;
  balance_factor?: number;
  label?: string;
  left?: TreeNodePayload | null;
  right?: TreeNodePayload | null;
  x?: number;
  y?: number;
  is_target?: boolean;
  in_path?: boolean;
}

export interface TreeStructureResponse {
  tree_type: 'bst' | 'avl';
  root: TreeNodePayload | null;
  total_nodes: number;
  height: number;
  is_balanced: boolean;
}

export interface OperationTraceResponse {
  tree_type: 'bst' | 'avl';
  target_key: number | string;
  found: boolean;
  comparisons: number;
  execution_time_ms: number;
  path_keys: (number | string)[];
  tree_snapshot: TreeNodePayload | null;
}

export interface BenchmarkMetrics {
  operation: 'search_hit' | 'search_miss' | 'insertion' | 'deletion';
  dataset_size: number;
  insertion_order: 'random' | 'ascending' | 'descending';
  bst_time_ms: number;
  avl_time_ms: number;
  bst_per_op_us?: number;
  avl_per_op_us?: number;
  bst_comparisons: number;
  avl_comparisons: number;
  bst_height: number;
  avl_height: number;
  bst_max_theoretical_height: number;
  avl_max_theoretical_height: number;
  bst_min_time_ms?: number;
  avl_min_time_ms?: number;
  bst_median_time_ms?: number;
  avl_median_time_ms?: number;
}

export interface TheoreticalComplexityItem {
  structure: string;
  search_avg: string;
  search_worst: string;
  insert_avg: string;
  insert_worst: string;
  delete_avg: string;
  delete_worst: string;
  height_avg: string;
  height_worst: string;
  balancing_invariant: string;
  notes: string;
}

export interface BenchmarkResponse {
  dataset_size: number;
  insertion_order: 'random' | 'ascending' | 'descending';
  random_seed: number;
  repetitions: number;
  warmup_runs: number;
  timing_unit: string;
  per_op_unit: string;
  timing_statistic: string;
  timing_statistic_explanation: string;

  bst_height: number;
  avl_height: number;
  bst_theoretical_height: number;
  avl_theoretical_height: number;
  avl_is_balanced: boolean;
  avl_rotations: Record<string, number>;

  search_target: number;
  search_hit_found: boolean;
  search_miss_target: number;
  search_miss_found: boolean;
  deletion_target: number;
  deletion_found: boolean;

  bst_insert_time_ms: number;
  avl_insert_time_ms: number;
  bst_insert_per_op_us: number;
  avl_insert_per_op_us: number;

  bst_search_hit_time_ms: number;
  avl_search_hit_time_ms: number;
  bst_search_hit_per_op_us: number;
  avl_search_hit_per_op_us: number;
  bst_search_hit_comparisons: number;
  avl_search_hit_comparisons: number;

  bst_search_miss_time_ms: number;
  avl_search_miss_time_ms: number;
  bst_search_miss_per_op_us: number;
  avl_search_miss_per_op_us: number;
  bst_search_miss_comparisons: number;
  avl_search_miss_comparisons: number;

  bst_delete_time_ms: number;
  avl_delete_time_ms: number;
  bst_delete_per_op_us: number;
  avl_delete_per_op_us: number;
  bst_delete_comparisons: number;
  avl_delete_comparisons: number;

  metrics: BenchmarkMetrics[];
  theoretical_complexity: TheoreticalComplexityItem[];
  interpretation: string;
  raw_samples?: Record<string, number[]> | null;
}
