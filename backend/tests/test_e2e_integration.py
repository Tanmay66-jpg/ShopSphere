"""End-to-End Integration Tests for ShopSphere.

Tests the full lifecycle across:
- FastAPI HTTP API
- SQLite persistent storage
- Custom in-memory BST and AVL Trees
- PriceIndex range queries
- Seeding idempotence and index synchronization
"""

import os
import tempfile
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from backend.database.connection import create_tables, drop_tables, get_db_session, get_engine
from backend.database.models import Product
from backend.database.seed_data import SEED_PRODUCTS
from backend.main import app, lifespan
from backend.services.product_service import ProductService


@pytest.fixture
def isolated_env():
    """Create an isolated test environment with temporary SQLite database and service."""
    temp_dir = tempfile.mkdtemp()
    test_db = os.path.join(temp_dir, "test_e2e.db")
    db_url = f"sqlite:///{test_db}"

    service = ProductService(db_url=db_url)
    app.state.product_service = service

    with TestClient(app) as client:
        yield client, service, test_db

    # Teardown
    app.state.product_service = None
    drop_tables(service.engine)
    if os.path.exists(test_db):
        try:
            os.remove(test_db)
        except OSError:
            pass


# -----------------------------------------------------------------------------
# A. Application Startup, Seeding & Restart Idempotence
# -----------------------------------------------------------------------------

def test_startup_and_seeding_idempotence():
    """Verify application startup seeds catalogue, and restarting does not duplicate data."""
    temp_dir = tempfile.mkdtemp()
    test_db = os.path.join(temp_dir, "test_lifespan.db")
    db_url = f"sqlite:///{test_db}"
    engine = get_engine(db_url)

    # 1. First run with fresh empty database
    app.state.product_service = None
    original_get_engine = __import__("backend.main", fromlist=["get_engine"]).get_engine

    import backend.main
    backend.main.get_engine = lambda: engine

    # Run lifespan startup
    import asyncio

    async def run_lifespan():
        async with lifespan(app):
            pass

    asyncio.run(run_lifespan())

    # Check seeded count
    with get_db_session(engine) as session:
        count_first = len(list(session.scalars(select(Product.id)).all()))
        assert count_first == len(SEED_PRODUCTS)
        assert count_first > 0

    # 2. Simulate application restart on the same database
    app.state.product_service = None
    asyncio.run(run_lifespan())

    # Check that restarting did NOT duplicate products
    with get_db_session(engine) as session:
        count_second = len(list(session.scalars(select(Product.id)).all()))
        assert count_second == count_first, "Restarting application must not duplicate seeded records"

    # Verify in-memory indexes match database exactly
    service = app.state.product_service
    assert service.id_avl.size() == count_first
    assert service.id_bst.size() == count_first
    assert service.id_avl.is_avl_balanced() is True

    # Cleanup
    backend.main.get_engine = original_get_engine
    drop_tables(engine)
    if os.path.exists(test_db):
        try:
            os.remove(test_db)
        except OSError:
            pass


def test_safe_seed_upsert_mechanism():
    """Verify safe upsert updates existing SKUs, inserts new SKUs, and avoids duplicates."""
    temp_dir = tempfile.mkdtemp()
    test_db = os.path.join(temp_dir, "test_upsert.db")
    db_url = f"sqlite:///{test_db}"
    engine = get_engine(db_url)
    create_tables(engine)

    service = ProductService(engine=engine, auto_rebuild=False)

    # 1. Initial seed with 2 products
    initial_seeds = [
        {
            "sku": "TEST-001",
            "name": "Alpha Item",
            "category": "Electronics",
            "description": "Original description",
            "price_paise": 100000,
            "stock_quantity": 10,
            "is_available": True,
            "rating": 4.5,
            "rating_count": 50,
            "image_url": "/products/TEST-001.webp",
        },
        {
            "sku": "TEST-002",
            "name": "Beta Item",
            "category": "Fashion",
            "description": "Beta original",
            "price_paise": 200000,
            "stock_quantity": 20,
            "is_available": True,
            "rating": 4.0,
            "rating_count": 25,
            "image_url": "/products/TEST-002.webp",
        },
    ]

    stats1 = service.sync_from_seed(initial_seeds)
    assert stats1["created"] == 2
    assert stats1["updated"] == 0
    assert stats1["unchanged"] == 0
    assert service.id_avl.size() == 2

    # Verify ID was assigned
    with get_db_session(engine) as session:
        p1 = session.scalar(select(Product).where(Product.sku == "TEST-001"))
        assert p1 is not None
        p1_id = p1.id
        assert p1.name == "Alpha Item"
        assert p1.price_paise == 100000

    # 2. Update TEST-001, leave TEST-002 unchanged, and introduce TEST-003
    modified_seeds = [
        {
            "sku": "TEST-001",
            "name": "Alpha Item Revised",
            "category": "Electronics",
            "description": "Updated description",
            "price_paise": 150000,
            "stock_quantity": 15,
            "is_available": True,
            "rating": 4.8,
            "rating_count": 100,
            "image_url": "/products/TEST-001-NEW.webp",
        },
        {
            "sku": "TEST-002",
            "name": "Beta Item",
            "category": "Fashion",
            "description": "Beta original",
            "price_paise": 200000,
            "stock_quantity": 20,
            "is_available": True,
            "rating": 4.0,
            "rating_count": 25,
            "image_url": "/products/TEST-002.webp",
        },
        {
            "sku": "TEST-003",
            "name": "Gamma Item",
            "category": "Accessories",
            "description": "Gamma description",
            "price_paise": 300000,
            "stock_quantity": 30,
            "is_available": True,
            "rating": 4.2,
            "rating_count": 10,
            "image_url": "/products/TEST-003.webp",
        },
    ]

    stats2 = service.sync_from_seed(modified_seeds)
    assert stats2["created"] == 1  # TEST-003 inserted
    assert stats2["updated"] == 1  # TEST-001 updated
    assert stats2["unchanged"] == 1  # TEST-002 untouched
    assert service.id_avl.size() == 3

    # Verify TEST-001 preserved its original primary key ID and updated its fields
    with get_db_session(engine) as session:
        p1_recheck = session.scalar(select(Product).where(Product.sku == "TEST-001"))
        assert p1_recheck is not None
        assert p1_recheck.id == p1_id, "Upsert must preserve original product ID"
        assert p1_recheck.name == "Alpha Item Revised"
        assert p1_recheck.price_paise == 150000
        assert p1_recheck.image_url == "/products/TEST-001-NEW.webp"
        assert p1_recheck.rating == 4.8
        assert p1_recheck.rating_count == 100

        total_rows = len(list(session.scalars(select(Product)).all()))
        assert total_rows == 3

    # In-memory indexes verified
    assert service.id_bst.size() == 3
    assert service.id_avl.size() == 3
    assert service.price_index.total_product_count() == 3
    alpha_in_avl = service.id_avl.get(p1_id)
    assert alpha_in_avl is not None
    assert alpha_in_avl.name == "Alpha Item Revised"

    # Cleanup
    drop_tables(engine)
    if os.path.exists(test_db):
        try:
            os.remove(test_db)
        except OSError:
            pass


def test_health_telemetry_endpoint(isolated_env):
    """Verify /api/health returns operational status and accurate diagnostic metrics."""
    client, service, _ = isolated_env
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "diagnostics" in data
    assert "id_bst" in data["diagnostics"]
    assert "id_avl" in data["diagnostics"]
    assert "height" in data["diagnostics"]["id_bst"]
    assert "height" in data["diagnostics"]["id_avl"]
    assert data["diagnostics"]["id_avl"]["is_balanced"] is True


# -----------------------------------------------------------------------------
# B. Product Catalogue CRUD Lifecycle via Actual HTTP Requests
# -----------------------------------------------------------------------------

def test_complete_crud_lifecycle_via_http(isolated_env):
    """Test full CRUD lifecycle: Create -> Read -> List -> Update -> Confirm -> Delete -> Verify 404."""
    client, service, _ = isolated_env

    # 1. Create a product
    payload = {
        "sku": "DEV-E2E-001",
        "name": "Precision Mechanical Dial Indicator",
        "category": "Industrial Tools",
        "description": "High accuracy 0.01mm dial gauge",
        "price": 3499.50,
        "stock_quantity": 25,
        "is_available": True,
        "rating": 4.9,
        "rating_count": 88,
    }
    create_res = client.post("/api/products", json=payload)
    assert create_res.status_code == 201
    created = create_res.json()
    product_id = created["id"]
    assert product_id > 0
    assert created["sku"] == "DEV-E2E-001"
    assert created["price_paise"] == 349950
    assert created["price"] == 3499.50

    # 2. Retrieve by ID
    get_res = client.get(f"/api/products/{product_id}")
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Precision Mechanical Dial Indicator"

    # 3. Retrieve through catalogue listing
    list_res = client.get("/api/products?limit=50")
    assert list_res.status_code == 200
    products = list_res.json()
    assert any(p["id"] == product_id for p in products)

    # 4. Update name, price, category, stock
    update_payload = {
        "name": "Digital Micro-Precision Indicator V2",
        "price": 4199.00,
        "category": "Precision Metrology",
        "stock_quantity": 12,
    }
    update_res = client.put(f"/api/products/{product_id}", json=update_payload)
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["name"] == "Digital Micro-Precision Indicator V2"
    assert updated["price_paise"] == 419900
    assert updated["category"] == "Precision Metrology"
    assert updated["stock_quantity"] == 12

    # 5. Confirm updated information in subsequent read
    confirm_res = client.get(f"/api/products/{product_id}")
    assert confirm_res.status_code == 200
    assert confirm_res.json()["name"] == "Digital Micro-Precision Indicator V2"
    assert confirm_res.json()["price_paise"] == 419900

    # 6. Delete product
    delete_res = client.delete(f"/api/products/{product_id}")
    assert delete_res.status_code == 200
    assert delete_res.json()["deleted_id"] == product_id

    # 7. Confirm product is no longer returned in catalogue
    list_after_res = client.get("/api/products")
    assert not any(p["id"] == product_id for p in list_after_res.json())

    # 8. Confirm retrieving deleted product returns 404 Not Found
    get_after_res = client.get(f"/api/products/{product_id}")
    assert get_after_res.status_code == 404
    assert "not found" in get_after_res.json()["detail"].lower()


def test_crud_error_handling_and_validation(isolated_env):
    """Test validation errors for invalid data, duplicate SKU, missing IDs, and invalid prices."""
    client, service, _ = isolated_env

    # 1. Missing name / empty name
    res = client.post("/api/products", json={
        "sku": "VAL-1",
        "name": "   ",
        "category": "Tools",
        "price": 100.0,
    })
    assert res.status_code == 422

    # 2. Missing price
    res = client.post("/api/products", json={
        "sku": "VAL-2",
        "name": "Valid Name",
        "category": "Tools",
    })
    assert res.status_code == 422

    # 3. Negative price
    res = client.post("/api/products", json={
        "sku": "VAL-3",
        "name": "Negative Price Item",
        "category": "Tools",
        "price": -50.0,
    })
    assert res.status_code == 422

    # 4. Duplicate SKU rejection
    client.post("/api/products", json={
        "sku": "UNIQUE-SKU-99",
        "name": "First Product",
        "category": "Gadgets",
        "price": 500.0,
    })
    dup_res = client.post("/api/products", json={
        "sku": "UNIQUE-SKU-99",
        "name": "Second Product with same SKU",
        "category": "Gadgets",
        "price": 600.0,
    })
    assert dup_res.status_code == 409
    assert "already exists" in dup_res.json()["detail"]

    # 5. Nonexistent product update returns 404
    up_res = client.put("/api/products/999999", json={"name": "Ghost Update"})
    assert up_res.status_code == 404

    # 6. Nonexistent product delete returns 404
    del_res = client.delete("/api/products/999999")
    assert del_res.status_code == 404


# -----------------------------------------------------------------------------
# C. BST and AVL Synchronization & Consistency
# -----------------------------------------------------------------------------

def test_bst_avl_index_synchronization_on_mutation(isolated_env):
    """Confirm index updates, deletion pruning, duplicate price buckets, and case normalization."""
    client, service, _ = isolated_env

    # 1. Create product
    res = client.post("/api/products", json={
        "sku": "SYNC-01",
        "name": "HyperSync Headset Pro",
        "category": "Audio",
        "price": 2500.0,
    })
    p1_id = res.json()["id"]

    # In-memory trees must have the product
    assert service.id_bst.get(p1_id) is not None
    assert service.id_avl.get(p1_id) is not None
    assert p1_id in service.name_avl.get("hypersync headset pro")
    assert p1_id in service.price_index.search_exact(250000)

    # 2. Update name and price
    client.put(f"/api/products/{p1_id}", json={
        "name": "HyperSync Ultra ANC",
        "price": 3200.0,
    })

    # Stale name must NOT return the product
    old_name_bucket = service.name_avl.get("hypersync headset pro")
    assert old_name_bucket is None or p1_id not in old_name_bucket

    # New name must return the product
    new_name_bucket = service.name_avl.get("hypersync ultra anc")
    assert new_name_bucket is not None and p1_id in new_name_bucket

    # Old price must NOT contain product
    assert p1_id not in service.price_index.search_exact(250000)
    # New price must contain product
    assert p1_id in service.price_index.search_exact(320000)

    # 3. Create a second product with IDENTICAL price (tests price bucket collision handling)
    res2 = client.post("/api/products", json={
        "sku": "SYNC-02",
        "name": "Budget Studio Monitor",
        "category": "Audio",
        "price": 3200.0,
    })
    p2_id = res2.json()["id"]

    price_bucket = service.price_index.search_exact(320000)
    assert p1_id in price_bucket and p2_id in price_bucket
    assert len(price_bucket) == 2

    # 4. Delete first product
    client.delete(f"/api/products/{p1_id}")

    # Index pruning confirmation
    assert service.id_bst.get(p1_id) is None
    assert service.id_avl.get(p1_id) is None
    deleted_name_bucket = service.name_avl.get("hypersync ultra anc")
    assert deleted_name_bucket is None or p1_id not in deleted_name_bucket
    assert p1_id not in service.price_index.search_exact(320000)
    # Second product must still remain in price bucket
    assert p2_id in service.price_index.search_exact(320000)

    # 5. Invariant check
    assert service.id_avl.is_avl_balanced() is True


def test_repeated_manual_sync_does_not_duplicate_nodes(isolated_env):
    """Confirm /api/adsa/sync is idempotent and preserves exact node counts."""
    client, service, _ = isolated_env

    # Seed 5 items
    for i in range(1, 6):
        client.post("/api/products", json={
            "sku": f"IDEM-{i}",
            "name": f"Product Item {i}",
            "category": "Gadgets",
            "price": float(i * 100),
        })

    initial_size = service.id_avl.size()
    assert initial_size == 5

    # Run sync multiple times
    for _ in range(3):
        sync_res = client.post("/api/adsa/sync")
        assert sync_res.status_code == 200
        assert sync_res.json()["node_count"] == 5

    assert service.id_avl.size() == 5
    assert service.id_bst.size() == 5
    assert service.id_avl.is_avl_balanced() is True


# -----------------------------------------------------------------------------
# D. Search API Multi-Mode Operations
# -----------------------------------------------------------------------------

def test_search_api_modes_and_filters(isolated_env):
    """Test exact/partial name search, ID lookup, price range, and sorting filters."""
    client, service, _ = isolated_env

    client.post("/api/products", json={
        "sku": "SRCH-1",
        "name": "Wireless Ergonomic Mouse",
        "category": "Peripherals",
        "price": 1499.0,
        "stock_quantity": 50,
    })
    client.post("/api/products", json={
        "sku": "SRCH-2",
        "name": "Gaming Optical Mouse RGB",
        "category": "Peripherals",
        "price": 2999.0,
        "stock_quantity": 0,  # Out of stock
    })
    client.post("/api/products", json={
        "sku": "SRCH-3",
        "name": "Noise Cancelling Headphones",
        "category": "Audio",
        "price": 7999.0,
        "stock_quantity": 10,
    })

    # 1. Substring name match
    res = client.post("/api/products/search", json={"query": "mouse", "searchBy": "name"})
    assert res.status_code == 200
    data = res.json()
    assert data["total_count"] == 2
    assert all("mouse" in p["name"].lower() for p in data["results"])
    assert data["comparisons"] > 0
    assert data["execution_time_ms"] >= 0

    # 2. Case normalization match
    res_case = client.post("/api/products/search", json={"query": "ErGoNoMiC", "searchBy": "name"})
    assert res_case.status_code == 200
    assert res_case.json()["total_count"] == 1
    assert res_case.json()["results"][0]["sku"] == "SRCH-1"

    # 3. Category + InStock filter
    res_filter = client.post("/api/products/search", json={
        "query": "mouse",
        "category": "Peripherals",
        "inStockOnly": True,
    })
    assert res_filter.status_code == 200
    assert res_filter.json()["total_count"] == 1
    assert res_filter.json()["results"][0]["sku"] == "SRCH-1"

    # 4. Price range search
    res_price = client.post("/api/products/search", json={
        "searchBy": "price",
        "minPrice": 1000.0,
        "maxPrice": 3500.0,
    })
    assert res_price.status_code == 200
    assert res_price.json()["total_count"] == 2
    assert all(1000.0 <= p["price"] <= 3500.0 for p in res_price.json()["results"])

    # 5. Inverted price range returns empty list
    res_inv = client.post("/api/products/search", json={
        "searchBy": "price",
        "minPrice": 5000.0,
        "maxPrice": 1000.0,
    })
    assert res_inv.status_code == 200
    assert res_inv.json()["total_count"] == 0


# -----------------------------------------------------------------------------
# E. Benchmark API Verification
# -----------------------------------------------------------------------------

def test_benchmark_api_live_execution(isolated_env):
    """Verify benchmark endpoint produces real measured data and respects schema."""
    client, _, _ = isolated_env

    for n in (100, 1000):
        res = client.post("/api/benchmark", json={
            "dataset_size": n,
            "insertion_order": "random",
            "repetitions": 2,
            "seed": 42,
        })
        assert res.status_code == 200
        data = res.json()
        assert data["dataset_size"] == n
        assert data["avl_is_balanced"] is True
        assert data["bst_height"] > 0
        assert data["avl_height"] > 0
        assert data["bst_insert_time_ms"] > 0
        assert data["avl_insert_time_ms"] > 0
        assert len(data["metrics"]) == 4
        assert len(data["theoretical_complexity"]) == 2
        assert "interpretation" in data


# -----------------------------------------------------------------------------
# F. Frontend Navigation Backend Contracts & Route Resolution Tests
# -----------------------------------------------------------------------------

def test_navigation_product_detail_exact_id(isolated_env):
    """Verify that clicking a product retrieves that exact product by ID."""
    client, service, _ = isolated_env

    # Insert test product
    created = service.create_product({
        "sku": "NAV-TEST-1",
        "name": "Precision Wireless Mouse",
        "category": "Peripherals",
        "price_paise": 299900,
        "stock_quantity": 25,
        "description": "Ergonomic test mouse for navigation verification",
    })

    # Retrieve by exact ID
    res = client.get(f"/api/products/{created.id}")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == created.id
    assert data["name"] == "Precision Wireless Mouse"
    assert data["sku"] == "NAV-TEST-1"
    assert data["category"] == "Peripherals"
    assert data["price"] == 2999.0
    assert data["stock_quantity"] == 25


def test_navigation_invalid_and_missing_product_ids(isolated_env):
    """Verify that invalid or deleted product IDs return 404 for graceful frontend recovery."""
    client, _, _ = isolated_env

    # 1. Nonexistent high ID
    res_missing = client.get("/api/products/99999")
    assert res_missing.status_code == 404
    assert "not found" in res_missing.json()["detail"].lower()

    # 2. Zero ID
    res_zero = client.get("/api/products/0")
    assert res_zero.status_code == 404

    # 3. Negative ID
    res_neg = client.get("/api/products/-1")
    assert res_neg.status_code == 404


def test_navigation_category_filtering(isolated_env):
    """Verify that clicking a category link filters products correctly."""
    client, service, _ = isolated_env

    service.create_product({
        "sku": "CAT-ELEC-1",
        "name": "Noise Cancelling Headphones",
        "category": "Electronics",
        "price_paise": 799900,
        "stock_quantity": 10,
    })
    service.create_product({
        "sku": "CAT-FASH-1",
        "name": "Merino Wool Beanie",
        "category": "Fashion",
        "price_paise": 149900,
        "stock_quantity": 15,
    })

    # Test category listing
    res_cats = client.get("/api/categories")
    assert res_cats.status_code == 200
    cats = res_cats.json()
    assert "All Categories" in cats
    assert "Electronics" in cats
    assert "Fashion" in cats

    # Test filtering by Electronics
    res_elec = client.get("/api/products?category=Electronics")
    assert res_elec.status_code == 200
    elec_items = res_elec.json()
    assert len(elec_items) == 1
    assert elec_items[0]["sku"] == "CAT-ELEC-1"
    assert elec_items[0]["category"] == "Electronics"

    # Test filtering by Fashion
    res_fash = client.get("/api/products?category=Fashion")
    assert res_fash.status_code == 200
    fash_items = res_fash.json()
    assert len(fash_items) == 1
    assert fash_items[0]["sku"] == "CAT-FASH-1"
    assert fash_items[0]["category"] == "Fashion"

