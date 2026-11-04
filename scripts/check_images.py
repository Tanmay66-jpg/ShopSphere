"""ShopSphere Product Image Mapping and SKU Integrity Checker.

Run this script any time to verify:
1. Total active products in database and seed catalogue
2. Products with existing image files on disk
3. Products missing image files on disk
4. Any duplicate / shared image files between different products
5. Any image files on disk whose filename does not match a valid SKU
"""

import os
import sys
import sqlite3

def check_images():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) if os.path.basename(os.getcwd()) != 'ADSA PROJECT' else os.getcwd()
    db_path = os.path.join(base_dir, 'shopsphere.db')
    products_dir = os.path.join(base_dir, 'frontend', 'public', 'products')

    if not os.path.exists(db_path):
        print(f"Error: SQLite database not found at {db_path}")
        sys.exit(1)

    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute("SELECT sku, name, category, image_url FROM products ORDER BY sku")
    products = c.fetchall()

    total_products = len(products)
    print("========================================================")
    print("      SHOPSPHERE CATALOGUE IMAGE INTEGRITY REPORT       ")
    print("========================================================")
    print(f"Total Active Products in DB: {total_products}")

    with_images = []
    missing_images = []
    image_to_skus = {}
    valid_skus = set()

    for sku, name, cat, img_url in products:
        valid_skus.add(sku)
        img_url = (img_url or '').strip()
        rel_path = img_url.lstrip('/')
        disk_path = os.path.join(base_dir, 'frontend', 'public', rel_path.replace('/', os.sep)) if img_url else ''

        if disk_path and os.path.exists(disk_path):
            with_images.append((sku, name, img_url))
            image_to_skus.setdefault(img_url, []).append(sku)
        else:
            missing_images.append((sku, name, img_url))

    print(f"Products with verified image file on disk: {len(with_images)} / {total_products}")
    print(f"Products missing image file on disk:        {len(missing_images)} / {total_products}")

    # 1. Check for shared / duplicate image files
    shared_images = {url: skus for url, skus in image_to_skus.items() if len(skus) > 1}
    print("--------------------------------------------------------")
    if shared_images:
        print(f"WARNING: {len(shared_images)} image file(s) shared across multiple products:")
        for url, skus in shared_images.items():
            print(f"  - {url} shared by SKUs: {skus}")
    else:
        print("PASS: No shared image files found (every product has a unique image URL).")

    # 2. Check for disk files that do not match any active SKU
    unmatched_files = []
    if os.path.exists(products_dir):
        for f in os.listdir(products_dir):
            if f.endswith('.webp') or f.endswith('.png') or f.endswith('.jpg'):
                file_sku = os.path.splitext(f)[0]
                if file_sku not in valid_skus:
                    unmatched_files.append(f)

    print("--------------------------------------------------------")
    if unmatched_files:
        print(f"WARNING: {len(unmatched_files)} file(s) in frontend/public/products/ do not match active SKUs:")
        for f in unmatched_files:
            print(f"  - {f}")
    else:
        print("PASS: All files in frontend/public/products/ match valid active product SKUs.")

    # 3. List missing products if any
    if missing_images:
        print("--------------------------------------------------------")
        print("List of products that need an image file:")
        for sku, name, _ in missing_images:
            print(f"  - {sku}: {name} -> frontend/public/products/{sku}.webp")
    print("========================================================")

if __name__ == '__main__':
    check_images()

