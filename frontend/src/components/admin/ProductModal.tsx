import { useState, useEffect } from 'react';
import type { Product } from '../../types/product';

interface ProductModalProps {
  isOpen: boolean;
  productToEdit?: Product | null;
  onClose: () => void;
  onSave: (productData: Omit<Product, 'id'>, id?: number) => void;
}

export function ProductModal({ isOpen, productToEdit, onClose, onSave }: ProductModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [price, setPrice] = useState<number>(14999);
  const [stockQuantity, setStockQuantity] = useState<number>(25);
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setCategory(productToEdit.category);
      setPrice(productToEdit.price);
      setStockQuantity(productToEdit.stock_quantity);
      setSku(productToEdit.sku || '');
      setDescription(productToEdit.description);
      setImageUrl(productToEdit.image_url);
    } else {
      setName('');
      setCategory('Electronics');
      setPrice(2999);
      setStockQuantity(20);
      setSku(`SKU-${Math.floor(100 + Math.random() * 900)}`);
      setDescription('');
      setImageUrl('https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80');
    }
    setErrors({});
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const errs: { [key: string]: string } = {};
    if (!name.trim()) errs.name = 'Product title is required';
    if (!sku.trim()) errs.sku = 'SKU identifier is required';
    if (price <= 0) errs.price = 'Price must be greater than 0';
    if (stockQuantity < 0) errs.stockQuantity = 'Stock quantity cannot be negative';
    if (!description.trim()) errs.description = 'Description is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSave(
      {
        name: name.trim(),
        normalized_name: name.trim().toLowerCase(),
        price: Number(price),
        category,
        stock_quantity: Number(stockQuantity),
        sku: sku.trim(),
        description: description.trim(),
        image_url: imageUrl.trim() || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
        is_available: Number(stockQuantity) > 0,
        rating: productToEdit?.rating || 4.8,
        rating_count: productToEdit?.rating_count || 12,
      },
      productToEdit?.id
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f172a]/50 backdrop-blur-xs animate-fade-in">
      <div
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-[#e2e8f0] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4.5 bg-[#f8fafc] border-b border-[#e2e8f0] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">
                {productToEdit ? 'edit_note' : 'add_circle'}
              </span>
            </div>
            <div>
              <h3 className="font-headline text-[17px] font-bold text-[#1a1c1d]">
                {productToEdit ? 'Edit Product & Update Search Index' : 'Add New Product to Catalogue'}
              </h3>
              <p className="text-[11px] text-[#64748b]">
                Changes automatically synchronize across SQLite and BST/AVL search partitions.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#64748b] hover:text-[#1a1c1d] rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-[12px] font-bold text-[#1a1c1d] block mb-1">
                Product Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aura Pro Wireless ANC Headphones"
                className={`w-full h-10 px-3 rounded-xl bg-[#f8fafc] border text-[13px] text-[#1a1c1d] focus:outline-none focus:bg-white ${
                  errors.name ? 'border-red-500' : 'border-[#cbd5e1] focus:border-primary'
                }`}
              />
              {errors.name && <p className="text-[11px] text-red-500 mt-0.5">{errors.name}</p>}
            </div>

            <div>
              <label className="text-[12px] font-bold text-[#1a1c1d] block mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[#f8fafc] border border-[#cbd5e1] text-[13px] text-[#1a1c1d] focus:outline-none focus:border-primary focus:bg-white"
              >
                <option value="Electronics">Electronics</option>
                <option value="Fashion">Fashion</option>
                <option value="Home & Living">Home & Living</option>
                <option value="Accessories">Accessories</option>
              </select>
            </div>

            <div>
              <label className="text-[12px] font-bold text-[#1a1c1d] block mb-1">
                SKU Identifier <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. AUD-WH-904"
                className={`w-full h-10 px-3 rounded-xl bg-[#f8fafc] border text-[13px] text-[#1a1c1d] focus:outline-none focus:bg-white font-mono ${
                  errors.sku ? 'border-red-500' : 'border-[#cbd5e1] focus:border-primary'
                }`}
              />
              {errors.sku && <p className="text-[11px] text-red-500 mt-0.5">{errors.sku}</p>}
            </div>

            <div>
              <label className="text-[12px] font-bold text-[#1a1c1d] block mb-1">
                Price (INR ₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className={`w-full h-10 px-3 rounded-xl bg-[#f8fafc] border text-[13px] text-[#1a1c1d] focus:outline-none focus:bg-white tabular-nums ${
                  errors.price ? 'border-red-500' : 'border-[#cbd5e1] focus:border-primary'
                }`}
              />
              {errors.price && <p className="text-[11px] text-red-500 mt-0.5">{errors.price}</p>}
            </div>

            <div>
              <label className="text-[12px] font-bold text-[#1a1c1d] block mb-1">
                Stock Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(Number(e.target.value))}
                className={`w-full h-10 px-3 rounded-xl bg-[#f8fafc] border text-[13px] text-[#1a1c1d] focus:outline-none focus:bg-white tabular-nums ${
                  errors.stockQuantity ? 'border-red-500' : 'border-[#cbd5e1] focus:border-primary'
                }`}
              />
              {errors.stockQuantity && <p className="text-[11px] text-red-500 mt-0.5">{errors.stockQuantity}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="text-[12px] font-bold text-[#1a1c1d] block mb-1">
                Image URL
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full h-10 px-3 rounded-xl bg-[#f8fafc] border border-[#cbd5e1] text-[13px] text-[#1a1c1d] focus:outline-none focus:border-primary focus:bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[12px] font-bold text-[#1a1c1d] block mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide accurate hardware details and specifications..."
                className={`w-full p-3 rounded-xl bg-[#f8fafc] border text-[13px] text-[#1a1c1d] focus:outline-none focus:bg-white ${
                  errors.description ? 'border-red-500' : 'border-[#cbd5e1] focus:border-primary'
                }`}
              />
              {errors.description && <p className="text-[11px] text-red-500 mt-0.5">{errors.description}</p>}
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-[#f1f5f9] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#f3f3f4] text-[#464555] hover:text-[#1a1c1d] text-[13px] font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-primary hover:bg-[#4338ca] text-white text-[13px] font-semibold shadow-sm transition-all"
            >
              {productToEdit ? 'Save Changes' : 'Create & Reindex Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
