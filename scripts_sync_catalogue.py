import os
import sys
import shutil

# Verify workspace path
sys.path.insert(0, os.path.abspath('.'))

from backend.database.connection import get_engine, get_db_session, create_tables
from backend.database.models import Product
from backend.database.seed_data import SEED_PRODUCTS
from backend.services.product_service import ProductService
from sqlalchemy import delete

print(f"Loading {len(SEED_PRODUCTS)} products from backend/database/seed_data.py...")

engine = get_engine()
create_tables(engine)

with get_db_session(engine) as session:
    session.execute(delete(Product))
    session.commit()
    print("Cleared stale records from products table.")

service = ProductService(engine=engine, auto_rebuild=False)

for item in SEED_PRODUCTS:
    service.create_product(item)

count = service.rebuild_indexes()
print(f"Successfully synced {count} products to SQLite.")
print(f"BST Size: {service.id_bst.size()}")
print(f"AVL ID Size: {service.id_avl.size()}")
print(f"AVL Name Size: {service.name_avl.size()}")
print(f"Price Index Total Products: {service.price_index.total_product_count()}")
