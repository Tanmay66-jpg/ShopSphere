# ShopSphere — Baseline Functionality Report (PHASE 0)

Date: 2026-10-30  
Backend: FastAPI + SQLAlchemy 2.0 + SQLite (`http://127.0.0.1:8000`)  
Frontend: React 18 + Vite (`http://localhost:5173`)  
Starting State: 142 products in SQLite DB (120 seed items + 22 mock/test items)

---

## 1. Startup Commands

- **Backend**:
  ```powershell
  python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
  ```
- **Frontend**:
  ```powershell
  cd frontend
  npm run dev
  ```
  (Serving at `http://localhost:5173/`)

---

## 2. Baseline Checklist Results

| Feature / Flow | Expected Behavior | Status | Notes |
|---|---|---|---|
| **Health API** | `GET /api/health` returns status ok, diagnostics | **PASS** | Tree diagnostics active, total products = 142 |
| **Home page loads** | Storefront displays products & categories | **PASS** | API returns 200, products fetched into productStore |
| **Category browsing** | Filter by Electronics, Fashion, Home & Living, Accessories | **PASS** | Category query param filters correctly |
| **Search (Navbar & Hero)** | Search by keyword, empty search, no-result | **PASS** | Returns results, comparisons, execution time, path |
| **Price filter / Range** | Filter by min/max price | **PASS** | `/api/products/range` and `/api/search` price mode functional |
| **Product detail page** | Navigation to `/products/:id` loads detail | **PASS** | Product loaded via `api.getProductById`, specs displayed |
| **Wishlist** | Toggle item, updates badge, persists in localStorage | **PASS** | Managed via `uiStore` with localStorage sync |
| **Cart** | Add, remove, change quantity, totals in INR | **PASS** | Managed via `uiStore` with localStorage sync |
| **Admin Dashboard** | Login/Dashboard stats, Add, Edit, Delete product | **PASS** | `/admin` loads, CRUD operations intact |
| **ADSA Lab** | BST vs AVL tree benchmark runs and returns telemetry | **PASS** | Tested `dataset_size: 1000`, BST ht=20, AVL ht=11 |
| **Console Errors / Network** | Zero 500 errors on core flows | **PASS** | All routes return 200 OK |

---

## 3. Discovered Anomalies (Prior to Fix)

1. **Repeated Images**: Products in `seed_data.py` reuse identical Unsplash photo URLs across category clusters.
2. **Missing Local Files**: Local paths in DB/seed (`/products/SS-XXX.webp`) were pointing to files missing from `frontend/public/products/`. In `frontend/public`, files were inconsistently named with spaces (`SS - 001.webp` to `SS - 0010.webp`).
3. **Database Drift**: Database contained 142 items with stale test rows (`AUD-WH-904`, `PR-1000`, etc.) instead of the required 50 active products.
4. **Catalogue Size**: 120 seed items existed instead of the required exactly 50 active products (Electronics: 15, Fashion: 13, Home & Living: 12, Accessories: 10).

