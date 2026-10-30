import sqlite3
import os
import sys

# Add backend to path to import SEED_PRODUCTS
sys.path.insert(0, os.path.abspath('.'))
from backend.database.seed_data import SEED_PRODUCTS

conn = sqlite3.connect('shopsphere.db')
cursor = conn.cursor()
cursor.execute("SELECT sku, image_url, is_available FROM products ORDER BY id")
db_products = {row[0]: (row[1], row[2]) for row in cursor.fetchall()}

seed_dict = {p['sku']: p for p in SEED_PRODUCTS}

print(f"Total in seed_data: {len(SEED_PRODUCTS)}")
print(f"Total in DB: {len(db_products)}")

# Check public/products files
products_dir = os.path.join('frontend', 'public', 'products')
public_dir = os.path.join('frontend', 'public')

print("\n--- SAMPLE COMPARISON (First 20 products) ---")
print(f"{'SKU':<10} | {'Seed URL':<45} | {'DB URL':<45} | {'File Exists'}")
print("-" * 120)

for p in SEED_PRODUCTS[:20]:
    sku = p['sku']
    seed_img = p.get('image_url', '')
    db_img, _ = db_products.get(sku, ('NOT_IN_DB', None))
    
    # check if file exists
    target_path = os.path.join(public_dir, seed_img.lstrip('/')) if seed_img.startswith('/') else ''
    exists = os.path.exists(target_path) if target_path else False
    
    print(f"{sku:<10} | {seed_img[:43]:<45} | {db_img[:43]:<45} | {exists}")

# Check files present in public
print("\n--- Files in frontend/public matching SS ---")
for f in os.listdir(public_dir):
    if f.startswith('SS'):
        print(f"  {f} ({os.path.getsize(os.path.join(public_dir, f))} bytes)")
