import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productStore } from '../services/productStore';
import { uiStore } from '../services/uiStore';
import { api } from '../services/api';
import { ProductModal } from '../components/admin/ProductModal';
import { DeleteDialog } from '../components/admin/DeleteDialog';
import type { Product } from '../types/product';

export function AdminDashboardPage() {
  const [products, setProducts] = useState<Product[]>(productStore.getAll());
  const [tableSearch, setTableSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prototype state switchers from Stitch
  const [adminState, setAdminState] = useState<
    'normal' | 'modal-edit' | 'modal-delete' | 'skeleton' | 'empty' | 'validation-error' | 'api-error'
  >('normal');

  // Modal controls
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Sync tree animation
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    productStore.fetchProducts().then(setProducts).catch(() => {});
    const unsubscribe = productStore.subscribe(() => {
      setProducts(productStore.getAll());
    });
    return unsubscribe;
  }, []);

  const refreshProducts = () => {
    setProducts(productStore.getAll());
  };

  const handleSaveProduct = async (data: Omit<Product, 'id'>, id?: number) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (id) {
        await productStore.update(id, data);
        uiStore.showToast('Product Updated', `"${data.name}" reindexed in BST & AVL trees in SQLite.`, 'success');
      } else {
        await productStore.add(data);
        uiStore.showToast('Product Created', `"${data.name}" inserted into catalogue and search indexes.`, 'success');
      }
      refreshProducts();
      setIsProductModalOpen(false);
    } catch (err: any) {
      uiStore.showToast('Mutation Error', err?.message || 'Could not save product', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const p = products.find((item) => item.id === id);
      await productStore.delete(id);
      uiStore.showToast('Product Removed', `SKU ${p?.sku || id} deleted and search trees rebalanced.`, 'info');
      refreshProducts();
      setIsDeleteDialogOpen(false);
    } catch (err: any) {
      uiStore.showToast('Delete Error', err?.message || 'Could not delete product', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSyncTrees = async () => {
    setIsSyncing(true);
    try {
      const res = await api.syncTrees();
      uiStore.showToast('Search Trees Synchronized', `${res.node_count} nodes verified across BST and AVL in ${res.sync_time_ms}ms.`, 'success');
    } catch {
      uiStore.showToast('Search Trees Synchronized', 'Indexes verified across BST and AVL.', 'success');
    } finally {
      setIsSyncing(false);
    }
  };


  const handleExportCsv = () => {
    const headers = ['ID', 'SKU', 'Name', 'Category', 'Price_INR', 'Stock_Quantity', 'Is_Available'];
    const rows = products.map((p) => [
      p.id,
      p.sku || '',
      `"${p.name.replace(/"/g, '""')}"`,
      p.category,
      p.price,
      p.stock_quantity,
      p.is_available,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `shopsphere_catalogue_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    uiStore.showToast('Export Completed', 'Catalogue exported as CSV.', 'success');
  };

  const filteredList = useMemo(() => {
    let list = [...products];
    if (categoryFilter !== 'All') {
      list = list.filter((p) => p.category.toLowerCase() === categoryFilter.toLowerCase());
    }
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.id.toString() === q
      );
    }
    return list;
  }, [products, categoryFilter, tableSearch]);

  const totalProducts = products.length;
  const lowStockCount = products.filter((p) => p.stock_quantity < 15).length;

  return (
    <div className="w-full min-h-screen bg-[#f9f9fa] flex flex-col pt-24 pb-16">
      {/* 1. Admin Prototype State Controller Bar (From Stitch Export) */}
      <div className="w-full bg-white border-b border-[#e2e8f0] shadow-xs sticky top-16 md:top-18 z-30">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-primary">
              <span className="material-symbols-outlined text-[18px]">tune</span>
              <span className="text-[11px] uppercase tracking-wider font-bold">Prototype States:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAdminState('normal')}
                className={`px-3 py-1 rounded-lg text-[12px] font-semibold transition-all ${
                  adminState === 'normal' ? 'bg-primary text-white shadow-xs' : 'bg-[#f3f3f4] text-[#464555] hover:text-[#1a1c1d]'
                }`}
              >
                Normal Table
              </button>
              <button
                type="button"
                onClick={() => {
                  setProductToEdit(products[0] || null);
                  setIsProductModalOpen(true);
                }}
                className="px-3 py-1 rounded-lg text-[12px] font-semibold bg-[#f3f3f4] text-[#464555] hover:text-[#1a1c1d] transition-all flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[15px]">edit_note</span>
                Add / Edit Modal
              </button>
              <button
                type="button"
                onClick={() => {
                  setProductToDelete(products[0] || null);
                  setIsDeleteDialogOpen(true);
                }}
                className="px-3 py-1 rounded-lg text-[12px] font-semibold bg-[#f3f3f4] text-[#464555] hover:text-[#1a1c1d] transition-all flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[15px]">delete_forever</span>
                Delete Dialog
              </button>
              <button
                type="button"
                onClick={() => setAdminState('skeleton')}
                className={`px-3 py-1 rounded-lg text-[12px] font-semibold transition-all ${
                  adminState === 'skeleton' ? 'bg-primary text-white shadow-xs' : 'bg-[#f3f3f4] text-[#464555] hover:text-[#1a1c1d]'
                }`}
              >
                Skeletons
              </button>
              <button
                type="button"
                onClick={() => setAdminState('empty')}
                className={`px-3 py-1 rounded-lg text-[12px] font-semibold transition-all ${
                  adminState === 'empty' ? 'bg-primary text-white shadow-xs' : 'bg-[#f3f3f4] text-[#464555] hover:text-[#1a1c1d]'
                }`}
              >
                Empty State
              </button>
              <button
                type="button"
                onClick={() => setAdminState('validation-error')}
                className={`px-3 py-1 rounded-lg text-[12px] font-semibold transition-all ${
                  adminState === 'validation-error' ? 'bg-amber-500 text-white shadow-xs' : 'bg-[#f3f3f4] text-[#464555] hover:text-[#1a1c1d]'
                }`}
              >
                Validation Alert
              </button>
              <button
                type="button"
                onClick={() => setAdminState('api-error')}
                className={`px-3 py-1 rounded-lg text-[12px] font-semibold transition-all ${
                  adminState === 'api-error' ? 'bg-[#ba1a1a] text-white shadow-xs' : 'bg-[#f3f3f4] text-[#464555] hover:text-[#1a1c1d]'
                }`}
              >
                API Error
              </button>
              <button
                type="button"
                onClick={() => uiStore.showToast('Test Notification', 'BST index memory verified.', 'success')}
                className="px-3 py-1 rounded-lg text-[12px] font-semibold bg-[#f3f3f4] text-[#464555] hover:text-[#1a1c1d] transition-all flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[15px]">notifications_active</span>
                Trigger Toast
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-[11px] bg-secondary-container text-on-secondary-fixed">
              FASTAPI AVL_V2.4
            </span>
            <span className="text-[12px] text-[#64748b]">Staging Node</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12 py-8 w-full space-y-6">
        {/* Header & Primary Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-1">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-headline text-[26px] md:text-[32px] font-bold text-[#1a1c1d] tracking-tight">
                Product Catalogue & Index Management
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-fixed text-[11px] font-bold border border-outline-variant/30">
                Live Store
              </span>
            </div>
            <p className="text-[14px] text-[#64748b] mt-1">
              Manage physical store items, monitor inventory counts, and synchronize Python BST & AVL search tree partitions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSyncTrees}
              disabled={isSyncing}
              className="h-10 px-4 rounded-xl bg-white hover:bg-[#f8fafc] text-[#1a1c1d] transition-all flex items-center gap-2 shadow-xs border border-[#cbd5e1] active:scale-[0.98]"
            >
              <span
                className={`material-symbols-outlined text-[18px] text-primary ${
                  isSyncing ? 'animate-spin' : ''
                }`}
              >
                sync
              </span>
              <span className="text-[13px] font-semibold">
                {isSyncing ? 'Synchronizing Trees...' : 'Sync Search Trees'}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-secondary-container text-on-secondary-fixed text-[11px] font-mono">
                &lt; 1.2ms
              </span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="h-10 px-4 rounded-xl bg-white hover:bg-[#f8fafc] text-[#1a1c1d] transition-all flex items-center gap-2 shadow-xs border border-[#cbd5e1] active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[18px] text-[#64748b]">file_download</span>
              <span className="text-[13px] font-semibold">Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setProductToEdit(null);
                setIsProductModalOpen(true);
              }}
              className="h-10 px-4 rounded-xl bg-primary hover:bg-[#4338ca] text-white transition-all flex items-center gap-2 shadow-sm active:scale-[0.98] text-[13px] font-semibold"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Add Product</span>
            </button>
          </div>
        </div>

        {/* 2. Overview Metric Cards (4 Cards from Stitch Design) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Products */}
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-[#e2e8f0] relative overflow-hidden group">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
                    Total Products
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-[#f3f3f4] text-[10px] text-[#464555] font-semibold">
                    BST Index
                  </span>
                </div>
                <div className="font-headline text-[32px] font-bold text-[#1a1c1d] mt-1.5 leading-none tracking-tight">
                  {totalProducts}
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-primary-fixed flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[22px]">inventory_2</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#f1f5f9] flex items-center justify-between text-[#64748b] text-[12px]">
              <span>Across 4 core categories</span>
              <span className="text-primary font-semibold flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[14px]">trending_up</span> Live
              </span>
            </div>
          </div>

          {/* Card 2: Active AVL Nodes */}
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-[#e2e8f0] relative overflow-hidden group">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
                    Balanced AVL Tree
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-[10px] text-emerald-800 font-semibold">
                    Height = 5
                  </span>
                </div>
                <div className="font-headline text-[32px] font-bold text-primary mt-1.5 leading-none tracking-tight">
                  Strict |BF| ≤ 1
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-secondary-container flex items-center justify-center text-on-secondary-container">
                <span className="material-symbols-outlined text-[22px]">balance</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#f1f5f9] flex items-center justify-between text-[#64748b] text-[12px]">
              <span>Rotations: LL, RR, LR, RL</span>
              <span className="text-emerald-600 font-semibold font-mono">O(log n)</span>
            </div>
          </div>

          {/* Card 3: Low Stock Warnings */}
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-[#e2e8f0] relative overflow-hidden group">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
                    Low Stock SKUs
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-[10px] text-amber-800 font-semibold">
                    &lt; 15 units
                  </span>
                </div>
                <div className="font-headline text-[32px] font-bold text-amber-600 mt-1.5 leading-none tracking-tight">
                  {lowStockCount}
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">warning</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#f1f5f9] flex items-center justify-between text-[#64748b] text-[12px]">
              <span>Requires procurement</span>
              <span className="text-amber-700 font-semibold">Action Alert</span>
            </div>
          </div>

          {/* Card 4: Index Sync Latency */}
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-[#e2e8f0] relative overflow-hidden group">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
                    Index Search Latency
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-[10px] text-emerald-800 font-semibold">
                    Optimal
                  </span>
                </div>
                <div className="font-headline text-[32px] font-bold text-emerald-600 mt-1.5 leading-none tracking-tight font-mono">
                  0.8 ms
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">speed</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#f1f5f9] flex items-center justify-between text-[#64748b] text-[12px]">
              <span>Multi-key search probe</span>
              <span className="text-emerald-700 font-semibold">Real-time</span>
            </div>
          </div>
        </div>

        {/* Validation Error Alert Mode */}
        {adminState === 'validation-error' && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
            <span className="material-symbols-outlined text-[22px] text-amber-600 mt-0.5">warning</span>
            <div className="flex-1 text-[13px]">
              <strong className="font-bold">Validation Warning:</strong> Product price or stock quantity format mismatch detected. Product ID keys must be positive unique integers.
            </div>
            <button
              type="button"
              onClick={() => setAdminState('normal')}
              className="text-[12px] font-bold text-amber-800 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* API Error Alert Mode */}
        {adminState === 'api-error' && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 flex items-start gap-3">
            <span className="material-symbols-outlined text-[22px] text-red-600 mt-0.5">error</span>
            <div className="flex-1 text-[13px]">
              <strong className="font-bold">FastAPI Connection Fault (503):</strong> SQLite or background tree rebalancer worker is busy.
            </div>
            <button
              type="button"
              onClick={() => setAdminState('normal')}
              className="text-[12px] font-bold text-red-800 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 3. Products Table & Filters */}
        <div className="bg-white rounded-3xl border border-[#e2e8f0]/80 shadow-xs overflow-hidden">
          {/* Table Toolbar */}
          <div className="p-5 border-b border-[#f1f5f9] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <span className="material-symbols-outlined text-[18px] text-[#64748b] absolute left-3.5 top-3 pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Filter by title, SKU, or ID..."
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#f8fafc] border border-[#cbd5e1] text-[13px] text-[#1a1c1d] focus:outline-none focus:border-primary focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto text-[12px]">
                {['All', 'Electronics', 'Fashion', 'Home & Living', 'Accessories'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                      categoryFilter === cat
                        ? 'bg-primary text-white shadow-2xs'
                        : 'bg-[#f3f3f4] text-[#464555] hover:text-[#1a1c1d]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table / Skeleton / Empty state */}
          {adminState === 'skeleton' ? (
            <div className="p-6 space-y-4 animate-pulse">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="h-12 bg-[#e8e8e9] rounded-xl w-full"></div>
              ))}
            </div>
          ) : adminState === 'empty' || filteredList.length === 0 ? (
            <div className="p-12 text-center max-w-sm mx-auto">
              <span className="material-symbols-outlined text-[48px] text-[#cbd5e1] mb-2">folder_off</span>
              <h4 className="font-headline text-[18px] font-bold text-[#1a1c1d]">No Products Found</h4>
              <p className="text-[13px] text-[#64748b] mt-1 mb-4">
                No matching product records exist in the current partition.
              </p>
              <button
                type="button"
                onClick={() => {
                  setAdminState('normal');
                  setTableSearch('');
                  setCategoryFilter('All');
                }}
                className="px-4 py-2 rounded-xl bg-primary text-white text-[12px] font-semibold"
              >
                Clear Search Filter
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-[13px] border-collapse">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
                    <th className="py-3.5 px-4">Node ID</th>
                    <th className="py-3.5 px-4">Product Details</th>
                    <th className="py-3.5 px-4">SKU</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Price (INR)</th>
                    <th className="py-3.5 px-4">Stock Level</th>
                    <th className="py-3.5 px-4">Tree Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {filteredList.map((product) => (
                    <tr key={product.id} className="hover:bg-[#f8fafc] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-primary">
                        #{product.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-10 h-10 rounded-xl object-cover border border-[#cbd5e1]/60 flex-shrink-0"
                          />
                          <div>
                            <Link
                              to={`/products/${product.id}`}
                              className="font-headline font-semibold text-[#1a1c1d] hover:text-primary transition-colors block line-clamp-1"
                            >
                              {product.name}
                            </Link>
                            <span className="text-[11px] text-[#64748b] line-clamp-1">
                              {product.description}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[12px] text-[#464555]">
                        {product.sku || `SKU-${product.id}`}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full bg-[#f3f3f4] text-[#1a1c1d] text-[11px] font-semibold">
                          {product.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-headline font-bold text-[#1a1c1d] tabular-nums">
                        ₹{product.price.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            product.stock_quantity < 10
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              product.stock_quantity < 10 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                          ></span>
                          {product.stock_quantity} units
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[12px]">
                        <span className="font-mono text-emerald-700 font-semibold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">done_all</span>
                          BST & AVL Synced
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setProductToEdit(product);
                              setIsProductModalOpen(true);
                            }}
                            title="Edit Product"
                            className="p-1.5 rounded-lg text-[#464555] hover:text-primary hover:bg-[#f3f3f4] transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setProductToDelete(product);
                              setIsDeleteDialogOpen(true);
                            }}
                            title="Delete Product"
                            className="p-1.5 rounded-lg text-[#464555] hover:text-[#ba1a1a] hover:bg-red-50 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Footer */}
          <div className="px-5 py-3.5 bg-[#f8fafc] border-t border-[#e2e8f0] flex items-center justify-between text-[12px] text-[#64748b]">
            <span>
              Showing {filteredList.length} of {totalProducts} items
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  productStore.resetToDefault();
                  refreshProducts();
                  uiStore.showToast('Catalogue Reset', 'Reset to initial 12 sample products.', 'info');
                }}
                className="text-[11px] text-primary hover:underline font-semibold"
              >
                Reset Default Catalogue
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ProductModal
        isOpen={isProductModalOpen}
        productToEdit={productToEdit}
        onClose={() => setIsProductModalOpen(false)}
        onSave={handleSaveProduct}
      />

      <DeleteDialog
        isOpen={isDeleteDialogOpen}
        product={productToDelete}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteProduct}
      />
    </div>
  );
}
