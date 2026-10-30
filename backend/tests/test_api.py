"""API Integration Tests using FastAPI TestClient and isolated SQLite database."""

import os
import tempfile
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.product_service import ProductService
from backend.database.connection import drop_tables


@pytest.fixture
def client():
    """Create a TestClient with an isolated temporary SQLite database."""
    temp_dir = tempfile.mkdtemp()
    test_db = os.path.join(temp_dir, "test_api.db")
    db_url = f"sqlite:///{test_db}"

    # Initialize isolated ProductService
    service = ProductService(db_url=db_url)
    app.state.product_service = service

    with TestClient(app) as test_client:
        yield test_client

    # Cleanup
    app.state.product_service = None
    drop_tables(service.engine)
    if os.path.exists(test_db):
        try:
            os.remove(test_db)
        except OSError:
            pass



def test_health_endpoint(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "diagnostics" in data
    assert "total_products" in data


def test_categories_endpoint(client):
    # Create product with custom category
    client.post("/api/products", json={
        "sku": "AUDIO-1",
        "name": "Noise Cancelling Earbuds",
        "category": "Audio Gear",
        "price": 4999.0,
        "stock_quantity": 20,
    })

    res = client.get("/api/categories")
    assert res.status_code == 200
    categories = res.json()
    assert "All Categories" in categories
    assert "Audio Gear" in categories


def test_product_crud_lifecycle(client):
    # 1. Create product
    create_payload = {
        "sku": "KB-RGB-01",
        "name": "Mechanical RGB Keyboard",
        "category": "Electronics",
        "description": "Custom aluminum 75% keyboard",
        "price": 8999.0,
        "stock_quantity": 15,
        "is_available": True,
        "rating": 4.7,
        "rating_count": 54,
    }
    create_res = client.post("/api/products", json=create_payload)
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["id"] > 0
    assert created["sku"] == "KB-RGB-01"
    assert created["price_paise"] == 899900
    assert created["price"] == 8999.0
    product_id = created["id"]

    # 2. Get by ID
    get_res = client.get(f"/api/products/{product_id}")
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Mechanical RGB Keyboard"

    # 3. List products
    list_res = client.get("/api/products")
    assert list_res.status_code == 200
    products = list_res.json()
    assert any(p["id"] == product_id for p in products)

    # 4. Update product
    update_res = client.put(f"/api/products/{product_id}", json={
        "name": "Mechanical RGB Keyboard V2",
        "price": 7999.0,
        "stock_quantity": 10,
    })
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["name"] == "Mechanical RGB Keyboard V2"
    assert updated["price_paise"] == 799900

    # 5. Delete product
    del_res = client.delete(f"/api/products/{product_id}")
    assert del_res.status_code == 200
    assert del_res.json()["deleted_id"] == product_id

    # 6. Verify 404 after deletion
    get_del = client.get(f"/api/products/{product_id}")
    assert get_del.status_code == 404


def test_duplicate_sku_rejection(client):
    payload = {
        "sku": "UNIQUE-SKU",
        "name": "Unique Product",
        "category": "General",
        "price_paise": 100000,
    }
    res1 = client.post("/api/products", json=payload)
    assert res1.status_code == 201

    # Attempt to post duplicate SKU
    res2 = client.post("/api/products", json=payload)
    assert res2.status_code == 409
    assert "already exists" in res2.json()["detail"]


def test_invalid_input_handling(client):
    # Missing required price
    bad_price = client.post("/api/products", json={
        "sku": "NO-PRICE",
        "name": "No Price Item",
        "category": "General",
    })
    assert bad_price.status_code == 422

    # Negative stock
    bad_stock = client.post("/api/products", json={
        "sku": "NEG-STOCK",
        "name": "Bad Stock Item",
        "category": "General",
        "price_paise": 10000,
        "stock_quantity": -5,
    })
    assert bad_stock.status_code == 422

    # Missing non-existent product update
    not_found_update = client.put("/api/products/99999", json={"name": "Ghost"})
    assert not_found_update.status_code == 404

    # Missing non-existent product delete
    not_found_delete = client.delete("/api/products/99999")
    assert not_found_delete.status_code == 404


def test_search_by_name_and_id(client):
    p1 = client.post("/api/products", json={
        "sku": "AUD-01",
        "name": "Sony Studio Headphones",
        "category": "Audio",
        "price": 19999.0,
    }).json()

    p2 = client.post("/api/products", json={
        "sku": "AUD-02",
        "name": "Bose QuietComfort Headphones",
        "category": "Audio",
        "price": 24999.0,
    }).json()

    # Search by unique keyword
    search_unique = client.post("/api/products/search", json={
        "query": "QuietComfort",
        "searchBy": "name",
    })
    assert search_unique.status_code == 200
    unique_data = search_unique.json()
    assert unique_data["total_count"] == 1
    assert unique_data["results"][0]["sku"] == "AUD-02"

    # Search by partial name
    search_name = client.post("/api/products/search", json={
        "query": "Headphones",
        "searchBy": "name",
    })
    assert search_name.status_code == 200
    res_data = search_name.json()
    assert res_data["total_count"] >= 2
    assert res_data["comparisons"] > 0
    assert any(p["sku"] == "AUD-01" for p in res_data["results"])
    assert any(p["sku"] == "AUD-02" for p in res_data["results"])

    # Search by ID with AVL trace
    search_id = client.post("/api/products/search", json={
        "query": str(p1["id"]),
        "searchBy": "id",
        "tree_type": "avl",
    })
    assert search_id.status_code == 200
    id_data = search_id.json()
    assert id_data["total_count"] == 1
    assert id_data["results"][0]["id"] == p1["id"]
    assert len(id_data["path"]) > 0


def test_price_range_query(client):
    for price in [1000, 2500, 5000, 7500, 10000]:
        client.post("/api/products", json={
            "sku": f"PR-{price}",
            "name": f"Item {price}",
            "category": "General",
            "price": float(price),
        })

    # Range [2500, 7500] in INR
    res = client.get("/api/products/range?min_price=2500&max_price=7500")
    assert res.status_code == 200
    items = res.json()
    assert len(items) >= 3
    assert all(2500.0 <= p["price"] <= 7500.0 for p in items)
    assert any(p["sku"] == "PR-2500" for p in items)
    assert any(p["sku"] == "PR-5000" for p in items)
    assert any(p["sku"] == "PR-7500" for p in items)
    assert not any(p["sku"] in ("PR-1000", "PR-10000") for p in items)

    # Empty range
    empty_res = client.get("/api/products/range?min_price=8000&max_price=2000")
    assert empty_res.status_code == 200
    assert empty_res.json() == []



def test_adsa_diagnostic_endpoints(client):
    # Populate a couple of items
    p = client.post("/api/products", json={
        "sku": "ADSA-ITEM",
        "name": "ADSA Demo Item",
        "category": "Education",
        "price": 1499.0,
    }).json()

    # 1. BST Structure
    bst_res = client.get("/api/adsa/tree/bst")
    assert bst_res.status_code == 200
    assert bst_res.json()["tree_type"] == "bst"
    assert bst_res.json()["total_nodes"] >= 1

    # 2. AVL Structure
    avl_res = client.get("/api/adsa/tree/avl")
    assert avl_res.status_code == 200
    assert avl_res.json()["tree_type"] == "avl"
    assert avl_res.json()["is_balanced"] is True

    # 3. Overall Diagnostics
    diag_res = client.get("/api/adsa/diagnostics")
    assert diag_res.status_code == 200
    diag = diag_res.json()
    assert "id_avl" in diag
    assert "price_index" in diag

    # 4. Operation Trace
    trace_res = client.post("/api/adsa/operation-trace", json={
        "tree_type": "avl",
        "target_key": p["id"],
    })
    assert trace_res.status_code == 200
    trace_data = trace_res.json()
    assert trace_data["found"] is True
    assert trace_data["comparisons"] > 0
    assert len(trace_data["path_keys"]) > 0

    # 5. Sync Trees
    sync_res = client.post("/api/adsa/sync")
    assert sync_res.status_code == 200
    assert sync_res.json()["status"] == "synchronized"

    # 6. Benchmark
    bench_res = client.post("/api/benchmark", json={
        "dataset_size": 100,
        "insertion_order": "random",
    })
    assert bench_res.status_code == 200
    bench_data = bench_res.json()
    assert bench_data["dataset_size"] == 100
    assert bench_data["insertion_order"] == "random"
    assert "metrics" in bench_data
    assert len(bench_data["metrics"]) == 4
    assert any(m["operation"] == "insertion" for m in bench_data["metrics"])
    assert any(m["operation"] == "search_hit" for m in bench_data["metrics"])
    assert any(m["operation"] == "search_miss" for m in bench_data["metrics"])
    assert any(m["operation"] == "deletion" for m in bench_data["metrics"])
    assert bench_data["avl_is_balanced"] is True

