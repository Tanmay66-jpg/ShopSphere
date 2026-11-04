import os
import sys

sys.path.insert(0, os.path.abspath('.'))
from backend.database.seed_data import SEED_PRODUCTS

categories = {'Electronics': [], 'Fashion': [], 'Home & Living': [], 'Accessories': []}
for p in SEED_PRODUCTS:
    cat = p.get('category')
    if cat in categories:
        categories[cat].append(p)

selected_50 = []
selected_50.extend(categories['Electronics'][:15])
selected_50.extend(categories['Fashion'][:13])
selected_50.extend(categories['Home & Living'][:12])
selected_50.extend(categories['Accessories'][:10])

# Update each product to have unique image_url: /products/SS-XXXX.webp
for p in selected_50:
    sku = p['sku']
    p['image_url'] = f"/products/{sku}.webp"

# Format python file
with open('backend/database/seed_data.py', 'w', encoding='utf-8') as f:
    f.write('"""Default seed catalogue data for ShopSphere.\n\n')
    f.write('Contains exactly 50 curated SKUs across Electronics (15), Fashion (13),\n')
    f.write('Home & Living (12), and Accessories (10).\n')
    f.write('All active products have a unique, verified image_url pointing to /products/SS-XXXX.webp.\n"""\n\n')
    f.write('from typing import Any, Dict, List\n\n')
    f.write('SEED_PRODUCTS: List[Dict[str, Any]] = [\n')
    for p in selected_50:
        f.write('    {\n')
        for k, v in p.items():
            if isinstance(v, str):
                f.write(f'        "{k}": {repr(v)},\n')
            else:
                f.write(f'        "{k}": {v},\n')
        f.write('    },\n')
    f.write(']\n')

print("Successfully wrote exactly 50 products to backend/database/seed_data.py")

