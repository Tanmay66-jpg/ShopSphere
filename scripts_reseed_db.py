import os
import sys
import shutil

# 1. Extra backup before modifying shopsphere.db
backup_file = os.path.join('BACKUP_DO_NOT_EDIT', 'shopsphere_pre_reseed.db')
shutil.copy2('shopsphere.db', backup_file)
print(f"Created pre-reseed backup: {backup_file}")

sys.path.insert(0, os.path.abspath('.'))
from backend.database.connection import get_engine, get_db_session, create_tables
from backend.database.models import Product
from backend.database.seed_data import SEED_PRODUCTS
from backend.services.product_service import ProductService
from sqlalchemy import select, delete

engine = get_engine()
create_tables(engine)

# Wipe stale rows and reseed cleanly with the 50 products
with get_db_session(engine) as session:
    session.execute(delete(Product))
    session.commit()
    print("Cleared existing products table.")

# Use ProductService to populate and build BST, AVL, price index
service = ProductService(engine=engine, auto_rebuild=False)

for p in SEED_PRODUCTS:
    service.create_product(p)

count = service.rebuild_indexes()
print(f"Successfully re-seeded {count} products into SQLite and rebuilt all in-memory indexes.")
print(f"BST size: {service.id_bst.size()}, AVL size: {service.id_avl.size()}, Price index total: {service.price_index.size()}")

