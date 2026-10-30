export interface Product {
  id: number;
  name: string;
  normalized_name: string;
  price: number; // in INR rupees
  price_paise?: number; // stored in paise on backend
  category: string;
  description: string;
  image_url: string;
  stock_quantity: number;
  is_available: boolean;
  rating?: number;
  rating_count?: number;
  sku?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProductFilterState {
  query: string;
  searchBy: 'name' | 'id' | 'price';
  category: string;
  minPrice: number;
  maxPrice: number;
  inStockOnly: boolean;
  sortBy: 'id' | 'name' | 'price-asc' | 'price-desc';
}

export interface SearchResponse {
  results: Product[];
  total_count: number;
  search_key: string;
  search_by: string;
  comparisons: number;
  execution_time_ms: number;
  path: (string | number)[];
}
