import type { Product } from '../../types/product';

interface DeleteDialogProps {
  isOpen: boolean;
  product?: Product | null;
  onClose: () => void;
  onConfirm: (id: number) => void;
}

export function DeleteDialog({ isOpen, product, onClose, onConfirm }: DeleteDialogProps) {
  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f172a]/50 backdrop-blur-xs animate-fade-in">
      <div
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#e2e8f0] p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-2xl bg-red-100 text-[#ba1a1a] flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-[28px]">delete_forever</span>
        </div>

        <h3 className="font-headline text-[18px] font-bold text-[#1a1c1d]">
          Delete Product from Catalogue?
        </h3>

        <p className="text-[13px] text-[#64748b] mt-1.5 leading-relaxed">
          Are you sure you want to remove <strong className="text-[#1a1c1d]">"{product.name}"</strong> (ID: {product.id})?
          This will delete the database record and rebalance all memory BST and AVL search trees.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-[#f3f3f4] text-[#464555] hover:text-[#1a1c1d] text-[13px] font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm(product.id);
              onClose();
            }}
            className="flex-1 py-2.5 rounded-xl bg-[#ba1a1a] hover:bg-[#93000a] text-white text-[13px] font-semibold shadow-sm transition-all"
          >
            Confirm Delete
          </button>
        </div>
      </div>
    </div>
  );
}
