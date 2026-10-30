"""Automated exporter from ShopSphere_Product_Catalogue_120_SKUs_Updated.xlsx to seed_data.py and mockData.ts."""

import openpyxl
import json
import re

def export_seed_data():
    wb = openpyxl.load_workbook("ShopSphere_Product_Catalogue_120_SKUs_Updated.xlsx")
    ws = wb["Product_Catalogue"]
    headers = [c for c in next(ws.iter_rows(values_only=True))]
    rows = [dict(zip(headers, r)) for r in ws.iter_rows(min_row=2, values_only=True)]

    backend_products = []
    frontend_products = []

    for r in rows:
        sku = r["SKU"]
        product_id = int(r["Product_ID"])
        name = str(r["Product_Name"]).strip()
        normalized_name = " ".join(name.casefold().split())
        category = str(r["Main_Category"]).strip()
        description = str(r["Short_Description"]).strip()
        price_inr = float(r["Price_INR"])
        price_paise = int(round(price_inr * 100))
        stock_quantity = int(r["Stock_Quantity"])
        is_available = str(r["Availability"]).strip().lower() == "in stock"
        rating = round(float(r["Rating"]), 1)
        rating_count = int(r["Review_Count"])
        image_url = str(r["Image_URL"]).strip()

        backend_products.append({
            "sku": sku,
            "name": name,
            "category": category,
            "description": description,
            "price_paise": price_paise,
            "stock_quantity": stock_quantity,
            "is_available": is_available,
            "rating": rating,
            "rating_count": rating_count,
            "image_url": image_url,
        })

        frontend_products.append({
            "id": product_id,
            "sku": sku,
            "name": name,
            "normalized_name": normalized_name,
            "category": category,
            "description": description,
            "price": price_inr,
            "price_paise": price_paise,
            "stock_quantity": stock_quantity,
            "is_available": is_available,
            "rating": rating,
            "rating_count": rating_count,
            "image_url": image_url,
            "created_at": "2026-01-15T08:00:00Z",
            "updated_at": "2026-02-20T10:30:00Z",
        })

    # Write backend/database/seed_data.py
    seed_py_content = f'''"""Default seed catalogue data for ShopSphere.

Contains 120 curated SKUs across Electronics, Fashion, Home & Living, and Accessories.
Generated from ShopSphere_Product_Catalogue_120_SKUs_Updated.xlsx.
"""

from typing import Any, Dict, List

SEED_PRODUCTS: List[Dict[str, Any]] = {json.dumps(backend_products, indent=4).replace(': true', ': True').replace(': false', ': False').replace(': null', ': None')}
'''
    with open("backend/database/seed_data.py", "w", encoding="utf-8") as f:
        f.write(seed_py_content)
    print("Wrote backend/database/seed_data.py with", len(backend_products), "products.")

    # Write frontend/src/services/mockData.ts
    mock_ts_content = f'''import type {{ Product }} from '../types/product';

/**
 * Initial offline fallback catalogue containing 120 curated SKUs.
 * Synchronized with backend SQLite seed catalogue.
 */
export const INITIAL_PRODUCTS: Product[] = {json.dumps(frontend_products, indent=2)};
'''
    with open("frontend/src/services/mockData.ts", "w", encoding="utf-8") as f:
        f.write(mock_ts_content)
    print("Wrote frontend/src/services/mockData.ts with", len(frontend_products), "products.")

if __name__ == "__main__":
    export_seed_data()
