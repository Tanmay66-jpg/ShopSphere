"""ShopSphere Catalogue Synchronization Script.

Performs safe database upsert of SEED_PRODUCTS into SQLite using SKU as the unique key.
- Updates existing products (name, category, description, price, stock, rating, availability, image_url)
- Inserts new products
- Avoids duplicates and never deletes unrelated user data or drops tables
- Rebuilds in-memory BST, AVL, and PriceIndex structures
- Updates frontend mockData.ts with synchronized records
- Notifies live backend server if running
"""

import json
import os
import sys
import urllib.request
import urllib.error

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath('.'))

from backend.database.connection import get_engine, create_tables, get_db_session
from backend.database.models import Product
from backend.database.seed_data import SEED_PRODUCTS
from backend.services.product_service import ProductService
from sqlalchemy import select


def sync_catalogue():
    print("=" * 60)
    print("ShopSphere Safe Catalogue Synchronizer")
    print("=" * 60)
    print(f"Loaded {len(SEED_PRODUCTS)} products from backend/database/seed_data.py")

    engine = get_engine()
    create_tables(engine)
    service = ProductService(engine=engine, auto_rebuild=False)

    # 1. Perform safe upsert without dropping or deleting tables
    stats = service.sync_from_seed(SEED_PRODUCTS)
    print("\n[Database Sync Summary]")
    print(f"  - Products Created   : {stats['created']}")
    print(f"  - Products Updated   : {stats['updated']}")
    print(f"  - Products Unchanged : {stats['unchanged']}")
    print(f"  - Total Indexed      : {stats['total_indexed']}")

    print("\n[In-Memory Search Indexes]")
    print(f"  - Product ID BST Size    : {service.id_bst.size()}")
    print(f"  - Product ID AVL Size    : {service.id_avl.size()} (Balanced: {service.id_avl.is_avl_balanced()})")
    print(f"  - Product Name AVL Size  : {service.name_avl.size()}")
    print(f"  - Price Index Items      : {service.price_index.total_product_count()}")

    # 2. Synchronize frontend/src/services/mockData.ts for offline/cold-start consistency
    mock_data_path = os.path.join("frontend", "src", "services", "mockData.ts")
    with get_db_session(engine) as session:
        db_products = list(session.scalars(select(Product).order_by(Product.id.asc())).all())
        session.expunge_all()

    frontend_records = []
    for p in db_products:
        frontend_records.append({
            "id": p.id,
            "sku": p.sku,
            "name": p.name,
            "normalized_name": p.normalized_name,
            "category": p.category,
            "description": p.description,
            "price": p.price_rupees,
            "price_paise": p.price_paise,
            "stock_quantity": p.stock_quantity,
            "is_available": p.is_available,
            "rating": p.rating,
            "rating_count": p.rating_count,
            "image_url": p.image_url,
            "created_at": p.created_at.isoformat() if p.created_at else "2026-01-15T08:00:00Z",
            "updated_at": p.updated_at.isoformat() if p.updated_at else "2026-02-20T10:30:00Z",
        })

    mock_ts_content = (
        "import type { Product } from '../types/product';\n\n"
        f"/**\n * Curated fallback catalogue containing {len(frontend_records)} SKUs.\n"
        " * Automatically synchronized with backend SQLite seed catalogue.\n */\n"
        f"export const INITIAL_PRODUCTS: Product[] = {json.dumps(frontend_records, indent=2)};\n"
    )

    with open(mock_data_path, "w", encoding="utf-8") as f:
        f.write(mock_ts_content)
    print(f"\n[Frontend Mock Synchronizer]")
    print(f"  - Synchronized {len(frontend_records)} products into {mock_data_path}")

    # 3. Notify running backend server if alive (try port 8001 first, then 8000)
    notified = False
    for port in [8001, 8000]:
        try:
            req = urllib.request.Request(
                f"http://127.0.0.1:{port}/api/adsa/sync",
                data=b"{}",
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=1.5) as resp:
                if resp.status == 200:
                    print(f"\n[Running Server Notification]")
                    print(f"  - Successfully notified active backend (http://127.0.0.1:{port}) to reload in-memory indexes.")
                    notified = True
                    break
        except Exception:
            continue

    if not notified:
        print("\n[Running Server Notification]")
        print("  - Backend server is not running on port 8001 or 8000; indexes will load on next startup.")

    print("\nSynchronization complete. All 50 products are up to date.")


if __name__ == "__main__":
    sync_catalogue()
