import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { uiStore } from '../../services/uiStore';

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [searchTerm, setSearchTerm] = useState('');
  const [cartCount, setCartCount] = useState(uiStore.getCartCount());
  const [wishlistCount, setWishlistCount] = useState(uiStore.getWishlistCount());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);

  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubCart = uiStore.subscribeCart(setCartCount);
    const unsubWishlist = uiStore.subscribeWishlist(setWishlistCount);
    return () => {
      unsubCart();
      unsubWishlist();
    };
  }, []);

  // Close menus on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
    setIsCategoryMenuOpen(false);
  }, [location.pathname, location.search]);

  // Click outside to close category dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCategoryMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setIsSearchOpen(false);
        setIsCategoryMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      navigate('/search');
    }
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
  };

  const handleWishlistClick = () => {
    if (wishlistCount > 0) {
      uiStore.showToast(
        'Wishlist Active',
        `${wishlistCount} item(s) saved in your wishlist. Exploring catalogue...`,
        'info'
      );
    } else {
      uiStore.showToast(
        'Wishlist Empty',
        'Explore products and click the heart icon to save items.',
        'info'
      );
    }
    navigate('/search');
  };

  const handleCartClick = () => {
    if (cartCount > 0) {
      uiStore.showToast(
        'Shopping Bag',
        `${cartCount} item(s) in bag. Ready for checkout.`,
        'success'
      );
    } else {
      uiStore.showToast(
        'Shopping Bag Empty',
        'Browse the catalogue and add items to your bag.',
        'info'
      );
    }
    navigate('/search');
  };

  const isCategoryActive = (cat: string) => {
    const params = new URLSearchParams(location.search);
    return location.pathname === '/search' && params.get('category') === cat;
  };

  const navLinkClass = (active: boolean) =>
    `text-[13px] font-medium transition-colors duration-150 ${
      active
        ? 'text-[#1B1B1B] underline underline-offset-4 decoration-1'
        : 'text-[#5C5A56] hover:text-[#1B1B1B] hover:underline hover:underline-offset-4 hover:decoration-1'
    }`;

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-[#FDFCF9]/95 backdrop-blur-md border-b border-[#D9D4CC] transition-all">
      {/* Main Navigation Row */}
      <div className="h-14 md:h-[60px] max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12 flex items-center justify-between gap-4">

        {/* Left: Wordmark */}
        <Link to="/" className="flex-shrink-0" aria-label="ShopSphere Home">
          <span className="font-serif text-[22px] font-light tracking-tight text-[#1B1B1B] leading-none">
            ShopSphere
          </span>
        </Link>

        {/* Center: Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-7" aria-label="Main Navigation">
          {/* Shop dropdown */}
          <div className="relative" ref={categoryDropdownRef}>
            <button
              type="button"
              onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
              className={`flex items-center gap-0.5 ${navLinkClass(isCategoryMenuOpen)}`}
              aria-expanded={isCategoryMenuOpen}
              aria-haspopup="true"
            >
              <span>Shop</span>
              <span
                className={`material-symbols-outlined text-[15px] transition-transform duration-150 ${
                  isCategoryMenuOpen ? 'rotate-180' : ''
                }`}
              >
                expand_more
              </span>
            </button>

            {isCategoryMenuOpen && (
              <div className="absolute left-0 top-full mt-3 w-48 bg-[#FDFCF9] border border-[#D9D4CC] shadow-lg z-50">
                {[
                  { label: 'All Products', to: '/search' },
                  { label: 'Electronics', to: '/search?category=Electronics' },
                  { label: 'Fashion', to: '/search?category=Fashion' },
                  { label: 'Home & Living', to: '/search?category=Home%20%26%20Living' },
                  { label: 'Accessories', to: '/search?category=Accessories' },
                ].map((item) => (
                  <Link
                    key={item.label}
                    to={item.to}
                    onClick={() => setIsCategoryMenuOpen(false)}
                    className="block px-4 py-2.5 text-[13px] text-[#5C5A56] hover:text-[#1B1B1B] hover:bg-[#F5F1EA] transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link
            to="/search?category=Electronics"
            className={navLinkClass(isCategoryActive('Electronics'))}
          >
            Electronics
          </Link>
          <Link
            to="/search?category=Fashion"
            className={navLinkClass(isCategoryActive('Fashion'))}
          >
            Fashion
          </Link>
          <Link
            to="/search?category=Home%20%26%20Living"
            className={navLinkClass(isCategoryActive('Home & Living'))}
          >
            Home & Living
          </Link>
          <Link
            to="/search?category=Accessories"
            className={navLinkClass(isCategoryActive('Accessories'))}
          >
            Accessories
          </Link>
          <Link
            to="/adsa-lab"
            className={navLinkClass(location.pathname === '/adsa-lab')}
          >
            ADSA Lab
          </Link>
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          {/* Inline search (desktop) — expands when toggled */}
          {isSearchOpen ? (
            <form onSubmit={handleSearchSubmit} className="hidden sm:flex items-center gap-2 mr-2">
              <input
                ref={searchInputRef}
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products..."
                className="h-8 px-3 bg-[#F5F1EA] border border-[#D9D4CC] text-[13px] text-[#1B1B1B] placeholder:text-[#8A8278] focus:outline-none focus:border-[#2D5A3D] w-52 transition-all"
                aria-label="Search catalogue"
              />
              <button
                type="submit"
                className="text-[12px] font-medium text-[#5C5A56] hover:text-[#1B1B1B] transition-colors"
              >
                Go
              </button>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="text-[#8A8278] hover:text-[#1B1B1B] transition-colors"
                aria-label="Close search"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Open search"
              className="hidden sm:flex p-2 text-[#5C5A56] hover:text-[#1B1B1B] transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">search</span>
            </button>
          )}

          {/* Mobile search toggle */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            aria-label="Toggle Search"
            className="sm:hidden p-2 text-[#5C5A56] hover:text-[#1B1B1B] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">
              {isSearchOpen ? 'close' : 'search'}
            </span>
          </button>

          {/* Wishlist */}
          <button
            type="button"
            onClick={handleWishlistClick}
            aria-label={`Wishlist (${wishlistCount} items)`}
            className="relative p-2 text-[#5C5A56] hover:text-[#1B1B1B] transition-colors"
            title="View Wishlist"
          >
            <span className="material-symbols-outlined text-[20px]">favorite</span>
            {wishlistCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] px-0.5 bg-[#2D5A3D] text-[9px] font-bold text-white flex items-center justify-center">
                {wishlistCount}
              </span>
            )}
          </button>

          {/* Cart / Bag */}
          <button
            type="button"
            onClick={handleCartClick}
            aria-label={`Cart (${cartCount} items)`}
            className="relative p-2 text-[#5C5A56] hover:text-[#1B1B1B] transition-colors"
            title="View Shopping Bag"
          >
            <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
            {cartCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] px-0.5 bg-[#2D5A3D] text-[9px] font-bold text-white flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
            className="lg:hidden p-2 text-[#5C5A56] hover:text-[#1B1B1B] transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">
              {isMobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile search row */}
      {isSearchOpen && (
        <div className="sm:hidden px-4 pb-3 pt-1 border-t border-[#D9D4CC] bg-[#FDFCF9]">
          <form onSubmit={handleSearchSubmit} className="relative w-full flex items-center gap-2">
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products..."
              className="flex-1 h-9 px-3 bg-[#F5F1EA] border border-[#D9D4CC] text-[13px] text-[#1B1B1B] placeholder:text-[#8A8278] focus:outline-none focus:border-[#2D5A3D]"
              autoFocus
              aria-label="Mobile search"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-[#1B1B1B] text-white text-[12px] font-medium"
            >
              Search
            </button>
          </form>
        </div>
      )}

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-[#FDFCF9] border-t border-[#D9D4CC] shadow-lg max-h-[calc(100vh-60px)] overflow-y-auto">
          <div className="px-4 py-5 space-y-1">
            <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#8A8278] px-2 mb-3">
              Shop
            </p>
            {[
              { label: 'All Products', to: '/search' },
              { label: 'Electronics', to: '/search?category=Electronics' },
              { label: 'Fashion', to: '/search?category=Fashion' },
              { label: 'Home & Living', to: '/search?category=Home%20%26%20Living' },
              { label: 'Accessories', to: '/search?category=Accessories' },
            ].map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className="block px-2 py-2.5 text-[14px] text-[#5C5A56] hover:text-[#1B1B1B] transition-colors border-b border-[#EAE6DF]"
              >
                {item.label}
              </Link>
            ))}

            <div className="pt-4 border-t border-[#D9D4CC] space-y-1">
              <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#8A8278] px-2 mb-3">
                Platform
              </p>
              <Link
                to="/admin"
                className="block px-2 py-2.5 text-[14px] text-[#5C5A56] hover:text-[#1B1B1B] transition-colors border-b border-[#EAE6DF]"
              >
                Admin Dashboard
              </Link>
              <Link
                to="/adsa-lab"
                className="block px-2 py-2.5 text-[14px] text-[#5C5A56] hover:text-[#1B1B1B] transition-colors"
              >
                ADSA Performance Lab
              </Link>
            </div>

            <div className="pt-4 border-t border-[#D9D4CC] flex gap-6 px-2">
              <button
                type="button"
                onClick={handleWishlistClick}
                className="flex items-center gap-1.5 text-[13px] text-[#5C5A56] hover:text-[#1B1B1B] transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">favorite</span>
                <span>Wishlist ({wishlistCount})</span>
              </button>
              <button
                type="button"
                onClick={handleCartClick}
                className="flex items-center gap-1.5 text-[13px] text-[#5C5A56] hover:text-[#1B1B1B] transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
                <span>Bag ({cartCount})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
