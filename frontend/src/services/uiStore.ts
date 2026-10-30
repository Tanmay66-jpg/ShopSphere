import type { Product } from '../types/product';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type?: 'success' | 'info' | 'warning' | 'error';
}

type Listener<T> = (data: T) => void;

class UIStore {
  private cartItems: { product: Product; quantity: number }[] = [];
  private wishlistIds: Set<number> = new Set([1, 3]);
  private activeToast: ToastMessage | null = null;
  private quickViewProduct: Product | null = null;

  private toastListeners: Set<Listener<ToastMessage | null>> = new Set();
  private cartListeners: Set<Listener<number>> = new Set();
  private wishlistListeners: Set<Listener<number>> = new Set();
  private quickViewListeners: Set<Listener<Product | null>> = new Set();

  public getCartCount(): number {
    return this.cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }

  public getWishlistCount(): number {
    return this.wishlistIds.size;
  }

  public isWishlisted(id: number): boolean {
    return this.wishlistIds.has(Number(id));
  }

  public toggleWishlist(id: number) {
    const numId = Number(id);
    if (this.wishlistIds.has(numId)) {
      this.wishlistIds.delete(numId);
      this.showToast('Removed from wishlist', 'Item removed from your saved list.', 'info');
    } else {
      this.wishlistIds.add(numId);
      this.showToast('Added to wishlist', 'Item saved to your wishlist.', 'success');
    }
    this.notifyWishlist();
  }

  public addToCart(product: Product, quantity = 1) {
    const existing = this.cartItems.find((item) => item.product.id === product.id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      this.cartItems.push({ product, quantity });
    }
    this.showToast('Added to Cart', `${product.name} (Qty: ${quantity}) added.`, 'success');
    this.notifyCart();
  }

  public showToast(title: string, message: string, type: ToastMessage['type'] = 'success') {
    const toast: ToastMessage = {
      id: Math.random().toString(36).substring(2, 9),
      title,
      message,
      type,
    };
    this.activeToast = toast;
    this.notifyToast();
    setTimeout(() => {
      if (this.activeToast?.id === toast.id) {
        this.activeToast = null;
        this.notifyToast();
      }
    }, 3500);
  }

  public dismissToast() {
    this.activeToast = null;
    this.notifyToast();
  }

  public openQuickView(product: Product) {
    this.quickViewProduct = product;
    this.notifyQuickView();
  }

  public closeQuickView() {
    this.quickViewProduct = null;
    this.notifyQuickView();
  }

  // Subscription helpers
  public subscribeToast(fn: Listener<ToastMessage | null>) {
    this.toastListeners.add(fn);
    fn(this.activeToast);
    return () => {
      this.toastListeners.delete(fn);
    };
  }

  public subscribeCart(fn: Listener<number>) {
    this.cartListeners.add(fn);
    fn(this.getCartCount());
    return () => {
      this.cartListeners.delete(fn);
    };
  }

  public subscribeWishlist(fn: Listener<number>) {
    this.wishlistListeners.add(fn);
    fn(this.getWishlistCount());
    return () => {
      this.wishlistListeners.delete(fn);
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
    this.cartListeners.forEach((fn) => fn(this.getCartCount()));
  }
  private notifyWishlist() {
    this.wishlistListeners.forEach((fn) => fn(this.getWishlistCount()));
  }
  private notifyQuickView() {
    this.quickViewListeners.forEach((fn) => fn(this.quickViewProduct));
  }
}

export const uiStore = new UIStore();
