import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="w-full bg-[#1B1B1B] text-[#5C5A56] pt-14 pb-8 mt-16 border-t border-[#2f3132]">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-10 border-b border-[#2f3132]">

          {/* Brand */}
          <div className="md:col-span-1 flex flex-col gap-4">
            <span className="font-serif text-[22px] font-light text-white tracking-tight">
              ShopSphere
            </span>
            <p className="text-[12px] text-[#5C5A56] leading-relaxed">
              A curated catalogue of electronics, fashion, home goods and accessories, built on custom BST and AVL tree data structures.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#8A8278] mb-4">
              Shop
            </h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Electronics', to: '/search?category=Electronics' },
                { label: 'Fashion', to: '/search?category=Fashion' },
                { label: 'Home & Living', to: '/search?category=Home%20%26%20Living' },
                { label: 'Accessories', to: '/search?category=Accessories' },
              ].map((item) => (
                <li key={item.label}>
                  <Link to={item.to} className="text-[12px] text-[#5C5A56] hover:text-white transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#8A8278] mb-4">
              Platform
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/admin" className="text-[12px] text-[#5C5A56] hover:text-white transition-colors">
                  Admin Dashboard
                </Link>
              </li>
              <li>
                <Link to="/adsa-lab" className="text-[12px] text-[#5C5A56] hover:text-white transition-colors">
                  ADSA Lab
                </Link>
              </li>
              <li>
                <Link to="/search" className="text-[12px] text-[#5C5A56] hover:text-white transition-colors">
                  All Products
                </Link>
              </li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h4 className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#8A8278] mb-4">
              Info
            </h4>
            <ul className="space-y-2.5">
              <li className="text-[12px] text-[#5C5A56]">Prices in INR (₹)</li>
              <li className="text-[12px] text-[#5C5A56]">Delivery across India</li>
              <li className="text-[12px] text-[#5C5A56]">BST & AVL indexed search</li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 text-[11px] text-[#5C5A56]">
          © {new Date().getFullYear()} ShopSphere — Advanced Data Structures &amp; Algorithms Mini Project.
        </div>
      </div>
    </footer>
  );
}
