import type { Product } from '../types/product';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type?: 'success' | 'info' | 'warning' | 'error';
  action?: {
    label: string;
    to: string;
  };
}

export interface CartItem {
  product: Product;
  quantity: number;
}

type Listener<T> = (data: T) => void;

const CART_STORAGE_KEY = 'shopsphere_cart';
const WISHLIST_STORAGE_KEY = 'shopsphere_wishlist';

function safeLoadJson<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return fallback;
    const item = window.localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item) as T;
  } catch (err) {
    console.warn(`[UIStore] Failed to read ${key} from localStorage:`, err);
    return fallback;
  }
}

function safeSaveJson<T>(key: string, value: T): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[UIStore] Failed to save ${key} to localStorage:`, err);
  }
}

class UIStore {
  private cartItems: CartItem[] = [];
  private wishlistProducts: Product[] = [];
  private wishlistIds: Set<number> = new Set();
  private activeToast: ToastMessage | null = null;
  private quickViewProduct: Product | null = null;

  private toastListeners: Set<Listener<ToastMessage | null>> = new Set();
  private cartCountListeners: Set<Listener<number>> = new Set();
  private cartItemsListeners: Set<Listener<CartItem[]>> = new Set();
  private wishlistCountListeners: Set<Listener<number>> = new Set();
  private wishlistProductsListeners: Set<Listener<Product[]>> = new Set();
  private quickViewListeners: Set<Listener<Product | null>> = new Set();

  constructor() {
    this.cartItems = safeLoadJson<CartItem[]>(CART_STORAGE_KEY, []);
    this.wishlistProducts = safeLoadJson<Product[]>(WISHLIST_STORAGE_KEY, []);
    this.wishlistIds = new Set(this.wishlistProducts.map((p) => Number(p.id)));
  }

  // --- Cart Getters & Operations ---

  public getCartCount(): number {
    return this.cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }

  public getCartItems(): CartItem[] {
    return [...this.cartItems];
  }

  public getCartSubtotal(): number {
    return this.cartItems.reduce(
      (sum, item) => sum + (item.product.price || 0) * item.quantity,
      0
    );
  }

  public addToCart(product: Product, quantity = 1) {
    const qty = Math.max(1, quantity);
    const existing = this.cartItems.find((item) => Number(item.product.id) === Number(product.id));
    if (existing) {
      existing.quantity += qty;
    } else {
      this.cartItems.push({ product, quantity: qty });
    }
    safeSaveJson(CART_STORAGE_KEY, this.cartItems);
    this.showToast(
      'Added to bag',
      `${product.name} (Qty: ${qty}) added to your shopping bag.`,
      'success',
      { label: 'View bag', to: '/cart' }
    );
    this.notifyCart();
  }

  public updateCartQuantity(productId: number, quantity: number) {
    const numId = Number(productId);
    if (quantity <= 0) {
      this.removeFromCart(numId);
      return;
    }
    const item = this.cartItems.find((it) => Number(it.product.id) === numId);
    if (item) {
      const maxStock = item.product.stock_quantity ?? 99;
      item.quantity = Math.min(quantity, maxStock);
      safeSaveJson(CART_STORAGE_KEY, this.cartItems);
      this.notifyCart();
    }
  }

  public removeFromCart(productId: number) {
    const numId = Number(productId);
    const item = this.cartItems.find((it) => Number(it.product.id) === numId);
    this.cartItems = this.cartItems.filter((it) => Number(it.product.id) !== numId);
    safeSaveJson(CART_STORAGE_KEY, this.cartItems);
    if (item) {
      this.showToast('Removed from bag', `${item.product.name} removed from your bag.`, 'info');
    }
    this.notifyCart();
  }

  public clearCart() {
    this.cartItems = [];
    safeSaveJson(CART_STORAGE_KEY, this.cartItems);
    this.notifyCart();
  }

  // --- Wishlist Getters & Operations ---

  public getWishlistCount(): number {
    return this.wishlistProducts.length;
  }

  public getWishlistProducts(): Product[] {
    return [...this.wishlistProducts];
  }

  public isWishlisted(id: number): boolean {
    return this.wishlistIds.has(Number(id));
  }

  public toggleWishlist(productOrId: Product | number) {
    const product = typeof productOrId === 'object' ? productOrId : null;
    const numId = typeof productOrId === 'object' ? Number(productOrId.id) : Number(productOrId);

    if (this.wishlistIds.has(numId)) {
      // Remove
      this.wishlistIds.delete(numId);
      this.wishlistProducts = this.wishlistProducts.filter((p) => Number(p.id) !== numId);
      safeSaveJson(WISHLIST_STORAGE_KEY, this.wishlistProducts);
      const name = product?.name || 'Item';
      this.showToast('Removed from wishlist', `${name} removed from your saved list.`, 'info');
    } else {
      // Add
      this.wishlistIds.add(numId);
      if (product) {
        this.wishlistProducts.push(product);
      } else {
        // Minimal stub if only ID provided without product payload
        this.wishlistProducts.push({
          id: numId,
          name: `Saved Product #${numId}`,
          normalized_name: `saved product #${numId}`,
          category: 'All',
          price: 0,
          description: '',
          stock_quantity: 1,
          is_available: true,
          image_url: '',
        } as unknown as Product);
      }
      safeSaveJson(WISHLIST_STORAGE_KEY, this.wishlistProducts);
      const name = product?.name || 'Item';
      this.showToast(
        'Added to wishlist',
        `${name} saved to your wishlist.`,
        'success',
        { label: 'View wishlist', to: '/wishlist' }
      );
    }
    this.notifyWishlist();
  }

  public removeFromWishlist(productId: number) {
    const numId = Number(productId);
    const item = this.wishlistProducts.find((p) => Number(p.id) === numId);
    this.wishlistIds.delete(numId);
    this.wishlistProducts = this.wishlistProducts.filter((p) => Number(p.id) !== numId);
    safeSaveJson(WISHLIST_STORAGE_KEY, this.wishlistProducts);
    if (item) {
      this.showToast('Removed from wishlist', `${item.name} removed from your saved list.`, 'info');
    }
    this.notifyWishlist();
  }

  public moveToBag(product: Product, quantity = 1) {
    this.removeFromWishlist(product.id);
    this.addToCart(product, quantity);
  }

  // --- Toast ---

  public showToast(
    title: string,
    message: string,
    type: ToastMessage['type'] = 'success',
    action?: { label: string; to: string }
  ) {
    const toast: ToastMessage = {
      id: Math.random().toString(36).substring(2, 9),
      title,
      message,
      type,
      action,
    };
    this.activeToast = toast;
    this.notifyToast();
    setTimeout(() => {
      if (this.activeToast?.id === toast.id) {
        this.activeToast = null;
        this.notifyToast();
      }
    }, 4000);
  }

  public dismissToast() {
    this.activeToast = null;
    this.notifyToast();
  }

  // --- Quick View ---

  public openQuickView(product: Product) {
    this.quickViewProduct = product;
    this.notifyQuickView();
  }

  public closeQuickView() {
    this.quickViewProduct = null;
    this.notifyQuickView();
  }

  // --- Subscriptions ---

  public subscribeToast(fn: Listener<ToastMessage | null>) {
    this.toastListeners.add(fn);
    fn(this.activeToast);
    return () => {
      this.toastListeners.delete(fn);
    };
  }

  public subscribeCart(fn: Listener<number>) {
    this.cartCountListeners.add(fn);
    fn(this.getCartCount());
    return () => {
      this.cartCountListeners.delete(fn);
    };
  }

  public subscribeCartItems(fn: Listener<CartItem[]>) {
    this.cartItemsListeners.add(fn);
    fn(this.getCartItems());
    return () => {
      this.cartItemsListeners.delete(fn);
    };
  }

  public subscribeWishlist(fn: Listener<number>) {
    this.wishlistCountListeners.add(fn);
    fn(this.getWishlistCount());
    return () => {
      this.wishlistCountListeners.delete(fn);
    };
  }

  public subscribeWishlistProducts(fn: Listener<Product[]>) {
    this.wishlistProductsListeners.add(fn);
    fn(this.getWishlistProducts());
    return () => {
      this.wishlistProductsListeners.delete(fn);
    };
  }

  public subscribeQuickView(fn: Listener<Product | null>) {
    this.quickViewListeners.add(fn);
    fn(this.quickViewProduct);
    return () => {
      this.quickViewListeners.delete(fn);
    };
  }

  private notifyToast() {
    this.toastListeners.forEach((fn) => fn(this.activeToast));
  }

  private notifyCart() {
    const count = this.getCartCount();
    const items = this.getCartItems();
    this.cartCountListeners.forEach((fn) => fn(count));
    this.cartItemsListeners.forEach((fn) => fn(items));
  }

  private notifyWishlist() {
    const count = this.getWishlistCount();
    const items = this.getWishlistProducts();
    this.wishlistCountListeners.forEach((fn) => fn(count));
    this.wishlistProductsListeners.forEach((fn) => fn(items));
  }

  private notifyQuickView() {
    this.quickViewListeners.forEach((fn) => fn(this.quickViewProduct));
  }
}

export const uiStore = new UIStore();
