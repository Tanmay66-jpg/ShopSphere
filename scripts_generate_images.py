import os
import shutil
import sys
from PIL import Image, ImageDraw, ImageFont

# Add project root to sys.path
sys.path.insert(0, os.path.abspath('.'))
from backend.database.seed_data import SEED_PRODUCTS

target_dir = os.path.join('frontend', 'public', 'products')
os.makedirs(target_dir, exist_ok=True)
public_dir = os.path.join('frontend', 'public')

# 1. First, copy the existing 10 real product photos properly named
for i in range(1, 11):
    src_name = f"SS - {i:03d}.webp" if i != 10 else "SS - 0010.webp"
    src_file = os.path.join(public_dir, src_name)
    dst_file = os.path.join(target_dir, f"SS-{i:04d}.webp")
    if os.path.exists(src_file):
        shutil.copy2(src_file, dst_file)
        print(f"Copied real photo: {src_name} -> SS-{i:04d}.webp ({os.path.getsize(dst_file)} bytes)")

# 2. Select the exactly 50 products:
# Electronics: 15 (SS-0001 to SS-0015)
# Fashion: 13 (SS-0038 to SS-0050)
# Home & Living: 12 (SS-0067 to SS-0078)
# Accessories: 10 (SS-0093 to SS-0102)

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

print(f"\nProcessing images for {len(selected_50)} products...")

# Palette for neutral editorial placeholders
# Warm ivory / sand backgrounds, ink tones
bg_colors = {
    'Electronics': (240, 238, 233),
    'Fashion': (238, 235, 230),
    'Home & Living': (236, 238, 235),
    'Accessories': (238, 236, 238),
}

for p in selected_50:
    sku = p['sku']
    cat = p['category']
    name = p['name']
    dest_path = os.path.join(target_dir, f"{sku}.webp")
    
    # If not already present from the 10 real photos, generate a beautiful, clean editorial 4:5 image
    if not os.path.exists(dest_path):
        img = Image.new('RGB', (800, 1000), color=bg_colors.get(cat, (245, 241, 234)))
        draw = ImageDraw.Draw(img)
        
        # Draw elegant hairline frame
        draw.rectangle([(30, 30), (770, 970)], outline=(217, 212, 204), width=2)
        
        # Draw category mark
        # Category in uppercase
        draw.text((400, 380), cat.upper(), fill=(138, 130, 120), anchor="mm")
        
        # Product SKU monogram
        initial = name[0].upper()
        draw.text((400, 480), initial, fill=(45, 90, 61), anchor="mm")
        
        # SKU code
        draw.text((400, 560), sku, fill=(92, 90, 86), anchor="mm")
        
        # Name preview (truncated if long)
        display_name = (name[:35] + '...') if len(name) > 35 else name
        draw.text((400, 620), display_name, fill=(27, 27, 27), anchor="mm")
        
        img.save(dest_path, 'WEBP', quality=85)
        print(f"Generated tailored image: {sku}.webp")

print(f"\nTotal files in {target_dir}: {len(os.listdir(target_dir))}")

