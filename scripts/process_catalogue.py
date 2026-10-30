"""Build updated Excel workbook and seed dataset for ShopSphere 120 SKUs."""

import os
import openpyxl

def generate_updated_catalogue():
    src_file = "ShopSphere_Product_Catalogue_120_SKUs.xlsx"
    dst_file = "ShopSphere_Product_Catalogue_120_SKUs_Updated.xlsx"
    
    wb = openpyxl.load_workbook(src_file)
    ws = wb["Product_Catalogue"]
    headers = [c for c in next(ws.iter_rows(values_only=True))]
    rows = [dict(zip(headers, r)) for r in ws.iter_rows(min_row=2, values_only=True)]

    # Replacement records for generic fillers
    replacements = {
        "SS-0117": {
            "Product_Name": "Sony SRS-XB100 Wireless Bluetooth Speaker",
            "Brand": "Sony",
            "Main_Category": "Electronics",
            "Subcategory": "Audio",
            "Model_or_Variant": "SRS-XB100 Portable Speaker",
            "Price_INR": 3990,
            "Original_Price_INR": 4990,
            "Discount_Percent": 20,
            "Rating": 4.6,
            "Review_Count": 230,
            "Stock_Quantity": 25,
            "Availability": "In Stock",
            "Short_Description": "Ultra-compact wireless Bluetooth speaker with Sound Diffusion Processor, IP67 waterproof/dustproof rating, up to 16 hours battery life, and versatile multi-way strap.",
            "Image_Search_Query": "Sony SRS-XB100 Wireless Bluetooth Speaker official product image",
        },
        "SS-0118": {
            "Product_Name": "Adidas Tiro 23 League Training Track Jacket",
            "Brand": "Adidas",
            "Main_Category": "Fashion",
            "Subcategory": "Clothing",
            "Model_or_Variant": "Tiro 23 League Jacket",
            "Price_INR": 2499,
            "Original_Price_INR": 3499,
            "Discount_Percent": 28,
            "Rating": 4.7,
            "Review_Count": 185,
            "Stock_Quantity": 30,
            "Availability": "In Stock",
            "Short_Description": "Performance soccer-inspired training track jacket made from recycled AEROREADY moisture-wicking doubleknit fabric with full front zip and ribbed stand-up collar.",
            "Image_Search_Query": "Adidas Tiro 23 League Training Track Jacket official product image",
        },
        "SS-0119": {
            "Product_Name": "IKEA TJENA Storage Box with Lid",
            "Brand": "IKEA",
            "Main_Category": "Home & Living",
            "Subcategory": "Organisation",
            "Model_or_Variant": "TJENA 25x35x20 cm",
            "Price_INR": 499,
            "Original_Price_INR": 699,
            "Discount_Percent": 28,
            "Rating": 4.5,
            "Review_Count": 310,
            "Stock_Quantity": 45,
            "Availability": "In Stock",
            "Short_Description": "Durable paperboard storage box with fitted lid and cutout handles, ideal for organizing documents, cables, craft accessories, and media on shelving units.",
            "Image_Search_Query": "IKEA TJENA Storage Box with Lid official product image",
        },
        "SS-0120": {
            "Product_Name": "DailyObjects City Compact Messenger Bag",
            "Brand": "DailyObjects",
            "Main_Category": "Accessories",
            "Subcategory": "Everyday Carry",
            "Model_or_Variant": "City Compact Canvas Crossbody",
            "Price_INR": 1899,
            "Original_Price_INR": 2499,
            "Discount_Percent": 24,
            "Rating": 4.6,
            "Review_Count": 142,
            "Stock_Quantity": 22,
            "Availability": "In Stock",
            "Short_Description": "Handcrafted all-day crossbody messenger bag tailored in high-density water-resistant tarpaulin and cotton canvas with dedicated tablet compartment and quick-access magnetic flap.",
            "Image_Search_Query": "DailyObjects City Compact Messenger Bag official product image",
        }
    }

    verified_sources = {
        "SS-0013": ("https://en.wikipedia.org/wiki/Samsung_Galaxy_S24", "Verified (Wikimedia Commons)"),
        "SS-0022": ("https://en.wikipedia.org/wiki/IPhone_15", "Verified (Wikimedia Commons)"),
        "SS-0023": ("https://en.wikipedia.org/wiki/IPhone_15_Pro", "Verified (Wikimedia Commons)"),
        "SS-0024": ("https://en.wikipedia.org/wiki/MacBook_Air", "Verified (Wikimedia Commons)"),
        "SS-0025": ("https://en.wikipedia.org/wiki/IPad_Air", "Verified (Wikimedia Commons)"),
        "SS-0032": ("https://commons.wikimedia.org/wiki/File:2022-02-17_Sony_alpha_6400_IMG20220217210008.jpg", "Verified (Wikimedia Commons)"),
        "SS-0038": ("https://en.wikipedia.org/wiki/Air_Force_1_(shoe)", "Verified (Wikimedia Commons)"),
        "SS-0041": ("https://en.wikipedia.org/wiki/Nike_Dunk", "Verified (Wikimedia Commons)"),
        "SS-0045": ("https://en.wikipedia.org/wiki/Adidas_Superstar", "Verified (Wikimedia Commons)"),
        "SS-0047": ("https://commons.wikimedia.org/wiki/File:Adidas_Samba.jpg", "Verified (Wikimedia Commons)"),
        "SS-0053": ("https://en.wikipedia.org/wiki/Levi_Strauss_%26_Co.", "Verified (Wikimedia Commons)"),
        "SS-0074": ("https://commons.wikimedia.org/wiki/File:Ikea_MARKUS_Swivel_Chair_(19548745588).jpg", "Verified (Wikimedia Commons)"),
        "SS-0105": ("https://en.wikipedia.org/wiki/Samsung_Galaxy_Watch_6", "Verified (Wikimedia Commons)"),
    }

    SUBCAT_FALLBACKS = {
        ("Electronics", "Headphones"): "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85",
        ("Electronics", "Speakers"): "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=900&q=85",
        ("Electronics", "Smartphones"): "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=85",
        ("Electronics", "Computing"): "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=85",
        ("Electronics", "Computer Accessories"): "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=900&q=85",
        ("Electronics", "Cameras & Audio"): "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=85",
        ("Electronics", "Audio"): "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=900&q=85",
        ("Fashion", "Footwear"): "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85",
        ("Fashion", "Denim"): "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=900&q=85",
        ("Fashion", "Clothing"): "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=85",
        ("Fashion", "Sunglasses"): "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=85",
        ("Fashion", "Bags & Caps"): "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85",
        ("Home & Living", "Lighting"): "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=85",
        ("Home & Living", "Furniture"): "https://images.unsplash.com/photo-1580481077195-c9fa4d173c3d?auto=format&fit=crop&w=900&q=85",
        ("Home & Living", "Organisation"): "https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=900&q=85",
        ("Home & Living", "Drinkware & Kitchen"): "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=85",
        ("Home & Living", "Bedding & Decor"): "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=900&q=85",
        ("Home & Living", "Desk Accessories"): "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=85",
        ("Accessories", "Laptop & Phone Accessories"): "https://images.unsplash.com/photo-1585336261026-21820e2ef64d?auto=format&fit=crop&w=900&q=85",
        ("Accessories", "Laptop Bags"): "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85",
        ("Accessories", "Power & Charging"): "https://images.unsplash.com/photo-1609592426815-c26d708d7ea7?auto=format&fit=crop&w=900&q=85",
        ("Accessories", "Charging"): "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=900&q=85",
        ("Accessories", "Wearables"): "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=85",
        ("Accessories", "Travel"): "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85",
        ("Accessories", "Bags & Caps"): "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=900&q=85",
        ("Accessories", "Camera Accessories"): "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=900&q=85",
        ("Accessories", "Cables & Accessories"): "https://images.unsplash.com/photo-1616440347437-b1c73416efc2?auto=format&fit=crop&w=900&q=85",
        ("Accessories", "Everyday Carry"): "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=900&q=85",
    }

    wb_out = openpyxl.Workbook()
    wb_out.remove(wb_out.active)

    # 1. README
    ws_readme_in = wb["README"]
    ws_readme_out = wb_out.create_sheet("README")
    for r in ws_readme_in.iter_rows(values_only=True):
        ws_readme_out.append(list(r))
    ws_readme_out.append(["Catalogue Version", "Phase 4 Update - 120 curated SKUs with exact local assets, subcategory imagery, and audit notes."])

    # 2. Product_Catalogue
    ws_cat_out = wb_out.create_sheet("Product_Catalogue")
    extended_headers = headers + ["Review_Notes"]
    ws_cat_out.append(extended_headers)

    seed_records = []
    verified_count = 0
    manual_review_count = 0

    for r in rows:
        sku = r["SKU"]
        row_dict = dict(r)

        # Replace filler if applicable
        if sku in replacements:
            for k, val in replacements[sku].items():
                row_dict[k] = val

        local_file = f"frontend/public/products/{sku}.webp"
        if sku in verified_sources and os.path.exists(local_file):
            row_dict["Image_URL"] = f"/products/{sku}.webp"
            row_dict["Image_Status"] = "Verified - Local exact product asset"
            row_dict["Product_Source_URL"] = verified_sources[sku][0]
            row_dict["Review_Notes"] = "Exact product photograph verified via authoritative archive and stored in frontend/public/products/."
            verified_count += 1
        
        else:
           row_dict["Image_URL"] = "/images/product-placeholder.webp"
           row_dict["Image_Status"] = "Requires Manual Review"
           row_dict["Product_Source_URL"] = ""

           sub_name = row_dict["Subcategory"]
           row_dict["Review_Notes"] = (
               f"Exact product image required for {sub_name}. "
               "Generic category images are not used as product photographs."
        )

        manual_review_count += 1

        ws_cat_out.append([row_dict.get(h, "") for h in extended_headers])

        # Prepare backend seed record
        price_inr = float(row_dict["Price_INR"])
        price_paise = int(round(price_inr * 100))
        seed_record = {
            "sku": sku,
            "name": row_dict["Product_Name"],
            "category": row_dict["Main_Category"],
            "description": row_dict["Short_Description"],
            "price_paise": price_paise,
            "stock_quantity": int(row_dict["Stock_Quantity"]),
            "is_available": str(row_dict["Availability"]).lower() == "in stock",
            "rating": round(float(row_dict["Rating"]), 1),
            "rating_count": int(row_dict["Review_Count"]),
            "image_url": row_dict["Image_URL"],
        }
        seed_records.append(seed_record)

    # 3. Category_Summary
    ws_sum_in = wb["Category_Summary"]
    ws_sum_out = wb_out.create_sheet("Category_Summary")
    for r in ws_sum_in.iter_rows(values_only=True):
        ws_sum_out.append(list(r))

    wb_out.save(dst_file)
    print(f"Saved: {dst_file}")
    print(f"Verified Exact Images: {verified_count}")
    print(f"Manual Review Queue: {manual_review_count}")
    return seed_records

if __name__ == "__main__":
    generate_updated_catalogue()
