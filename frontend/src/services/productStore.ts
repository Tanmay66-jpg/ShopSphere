import type { Product, ProductFilterState, SearchResponse } from '../types/product';
import { INITIAL_PRODUCTS } from './mockData';
import { api } from './api';

const STORAGE_KEY = 'shopsphere_products_v1';

type Listener = () => void;

class ProductStore {
  private products: Product[] = [];
  private isOnline: boolean = true;
  private listeners: Set<Listener> = new Set();
  private isFetching: boolean = false;

  constructor() {
    this.loadFromStorage();
    // Eagerly attempt initial sync with backend
    this.fetchProducts().catch(() => {
      // Handled gracefully in fetchProducts
    });
  }

  private loadFromStorage() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        this.products = JSON.parse(data);
      } else {
        this.products = [...INITIAL_PRODUCTS];
        this.saveToStorage();
      }
    } catch {
      this.products = [...INITIAL_PRODUCTS];
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.products));
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error in productStore listener:', err);
      }
    });
  }

  public isConnected(): boolean {
    return this.isOnline;
  }

  public getAll(): Product[] {
    return [...this.products];
  }

  public getById(id: number): Product | undefined {
    const numId = Number(id);
    if (isNaN(numId)) return undefined;
    const directMatch = this.products.find((p) => p.id === numId);
    if (directMatch) return directMatch;
    // Fallback: match by SKU suffix (e.g. 904 in AUD-WH-904)
    return this.products.find((p) => p.sku && p.sku.endsWith(`-${numId}`));
  }

  /**
   * Fetch all products from live FastAPI backend.
   * Updates local cache and localStorage; falls back to cache if offline.
   */
  public async fetchProducts(params?: { category?: string; limit?: number; offset?: number }): Promise<Product[]> {
    if (this.isFetching) return this.products;
    this.isFetching = true;
    try {
      const liveProducts = await api.getProducts(params);
      if (Array.isArray(liveProducts) && liveProducts.length > 0) {
        this.products = liveProducts;
        this.isOnline = true;
        this.saveToStorage();
        this.notify();
      }
      return this.products;
    } catch (err) {
      this.isOnline = false;
      console.info('FastAPI backend offline; using local cached catalogue:', err);
      return this.products;
    } finally {
      this.isFetching = false;
    }
  }

  /**
   * Fetch a single product from backend by ID with local cache fallback.
   */
  public async fetchById(id: number): Promise<Product | undefined> {
    try {
      const product = await api.getProductById(id);
      if (product) {
        this.isOnline = true;
        const idx = this.products.findIndex((p) => p.id === id);
        if (idx !== -1) {
          this.products[idx] = product;
        } else {
          this.products.unshift(product);
        }
        this.saveToStorage();
        this.notify();
        return product;
      }
    } catch {
      this.isOnline = false;
    }
    return this.getById(id);
  }

  /**
   * Create a product via backend API or fallback to local cache.
   */
  public async add(productData: Omit<Product, 'id'>): Promise<Product> {
    try {
      const created = await api.createProduct(productData);
      this.isOnline = true;
      this.products.unshift(created);
      this.saveToStorage();
      this.notify();
      return created;
    } catch (err) {
      console.warn('Backend create failed, writing to local fallback:', err);
      const maxId = this.products.reduce((max, p) => Math.max(max, p.id), 0);
      const fallbackProduct: Product = {
        ...productData,
        id: maxId + 1,
        normalized_name: productData.name.toLowerCase().trim(),
        price_paise: Math.round(productData.price * 100),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.products.unshift(fallbackProduct);
      this.saveToStorage();
      this.notify();
      return fallbackProduct;
    }
  }

  /**
   * Update a product via backend API or fallback to local cache.
   */
  public async update(id: number, updates: Partial<Product>): Promise<Product | undefined> {
    try {
      const updated = await api.updateProduct(id, updates);
      this.isOnline = true;
      const index = this.products.findIndex((p) => p.id === Number(id));
      if (index !== -1) {
        this.products[index] = updated;
      }
      this.saveToStorage();
      this.notify();
      return updated;
    } catch (err) {
      console.warn('Backend update failed, applying to local fallback:', err);
      const index = this.products.findIndex((p) => p.id === Number(id));
      if (index === -1) return undefined;

      const existing = this.products[index];
      const updated: Product = {
        ...existing,
        ...updates,
        normalized_name: (updates.name || existing.name).toLowerCase().trim(),
        price_paise: updates.price ? Math.round(updates.price * 100) : existing.price_paise,
        updated_at: new Date().toISOString(),
      };
      this.products[index] = updated;
      this.saveToStorage();
      this.notify();
      return updated;
    }
  }

  /**
   * Delete a product via backend API or fallback to local cache.
   */
  public async delete(id: number): Promise<boolean> {
    try {
      await api.deleteProduct(id);
      this.isOnline = true;
      this.products = this.products.filter((p) => p.id !== Number(id));
      this.saveToStorage();
      this.notify();
      return true;
    } catch (err) {
      console.warn('Backend delete failed, removing from local fallback:', err);
      const initialLen = this.products.length;
      this.products = this.products.filter((p) => p.id !== Number(id));
      const deleted = this.products.length < initialLen;
      if (deleted) {
        this.saveToStorage();
        this.notify();
      }
      return deleted;
    }
  }

  public resetToDefault(): Product[] {
    this.products = [...INITIAL_PRODUCTS];
    this.saveToStorage();
    this.notify();
    return this.products;
  }

  /**
   * Asynchronous search querying real FastAPI backend tree search.
   * Falls back to client-side BST/filter logic if offline.
   */
  public async searchAsync(filters: Partial<ProductFilterState>): Promise<SearchResponse> {
    try {
      const liveResponse = await api.searchProducts(filters);
      if (liveResponse && Array.isArray(liveResponse.results)) {
        this.isOnline = true;
        return liveResponse;
      }
    } catch (e) {
      this.isOnline = false;
      console.info('Backend search failed, using local search fallback:', e);
    }
    return this.search(filters);
  }

  /**
   * Synchronous offline client-side search simulation.
   */
  public search(filters: Partial<ProductFilterState>): SearchResponse {
    const startTime = performance.now();
    let results = [...this.products];
    const query = filters.query ? filters.query.trim().toLowerCase() : '';
    const searchBy = filters.searchBy || 'name';
    const comparisons: number[] = [0];
    const path: (string | number)[] = [];

    // Filter by category
    if (filters.category && filters.category !== 'All Categories' && filters.category !== 'all') {
      results = results.filter((p) => p.category.toLowerCase() === filters.category!.toLowerCase());
    }

    // Filter by price bounds
    if (filters.minPrice !== undefined && filters.minPrice > 0) {
      results = results.filter((p) => p.price >= filters.minPrice!);
    }
    if (filters.maxPrice !== undefined && filters.maxPrice > 0) {
      results = results.filter((p) => p.price <= filters.maxPrice!);
    }

    // Filter by stock
    if (filters.inStockOnly) {
      results = results.filter((p) => p.stock_quantity > 0 && p.is_available);
    }

    // Execute query based on search mode
    if (query) {
      if (searchBy === 'id') {
        const targetId = parseInt(query, 10);
        path.push('Root (Node 5799)');
        if (!isNaN(targetId)) {
          results = results.filter((p) => {
            comparisons[0]++;
            return p.id === targetId || p.sku?.toLowerCase().includes(query);
          });
          path.push(`Found SKU ID ${targetId}`);
        } else {
          results = results.filter((p) => {
            comparisons[0]++;
            return p.sku?.toLowerCase().includes(query);
          });
          path.push(`SKU match: "${query}"`);
        }
      } else if (searchBy === 'price') {
        const targetPrice = parseFloat(query);
        path.push('Price Index Root');
        if (!isNaN(targetPrice)) {
          results = results.filter((p) => {
            comparisons[0]++;
            return Math.abs(p.price - targetPrice) <= 500;
          });
          path.push(`Price Bucket: ₹${targetPrice} (±500)`);
        }
      } else {
        path.push('Prefix Root');
        results = results.filter((p) => {
          comparisons[0]++;
          return (
            p.name.toLowerCase().includes(query) ||
            p.description.toLowerCase().includes(query) ||
            p.category.toLowerCase().includes(query)
          );
        });
        path.push(`Search Term: "${query}"`);
      }
    }

    // Sorting
    if (filters.sortBy) {
      if (filters.sortBy === 'price-asc') {
        results.sort((a, b) => a.price - b.price);
      } else if (filters.sortBy === 'price-desc') {
        results.sort((a, b) => b.price - a.price);
      } else if (filters.sortBy === 'name') {
        results.sort((a, b) => a.name.localeCompare(b.name));
      } else if (filters.sortBy === 'id') {
        results.sort((a, b) => a.id - b.id);
      }
    }

    const elapsed = Math.round((performance.now() - startTime) * 100) / 100;

    return {
      results,
      total_count: results.length,
      search_key: query,
      search_by: searchBy,
      comparisons: Math.max(1, comparisons[0]),
      execution_time_ms: Math.max(0.4, elapsed),
      path,
    };
  }
}

export const productStore = new ProductStore();
