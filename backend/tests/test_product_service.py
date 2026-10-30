"""Integration and unit tests for ShopSphere ProductService.

Validates:
- SQLite persistence and transaction integrity.
- Multi-key index synchronization (ID BST, ID AVL, Name AVL, Price Index).
- Duplicate prices and duplicate normalized names.
- Price range queries with pruning.
- Category, availability, and stock filtering.
- Rebuilding in-memory trees on startup / recovery.
- Error handling for invalid data, duplicate SKUs, negative stocks, etc.
- Safe rollback on failed mutations.
"""

import os
import tempfile
import pytest
from backend.services.product_service import ProductService
from backend.database.models import Product
from backend.database.connection import get_engine, drop_tables


@pytest.fixture
def temp_db_service():
    """Create a temporary SQLite database and ProductService instance per test."""
    temp_dir = tempfile.mkdtemp()
    db_path = os.path.join(temp_dir, "test_shopsphere.db")
    db_url = f"sqlite:///{db_path}"

    service = ProductService(db_url=db_url)
    yield service, db_url

    # Cleanup
    drop_tables(service.engine)
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except OSError:
            pass


def test_product_creation_and_persistence(temp_db_service):
    service, _ = temp_db_service

    payload = {
        "sku": "TECH-AP-001",
        "name": "Apple AirPods Pro",
        "category": "Electronics",
        "description": "Active noise cancelling wireless earbuds",
        "price": 24900.0,  # ₹24,900
        "stock_quantity": 15,
        "is_available": True,
        "rating": 4.8,
        "rating_count": 120,
    }

    product = service.create_product(payload)
    assert product.id is not None
    assert product.id > 0
    assert product.sku == "TECH-AP-001"
    assert product.price_paise == 2490000
    assert product.price_rupees == 24900.0
    assert product.normalized_name == "apple airpods pro"

    # Verify indexed in all 4 in-memory trees
    assert service.id_bst.get(product.id) is not None
    assert service.id_avl.get(product.id) is not None
    assert product.id in service.name_avl.get("apple airpods pro")
    assert service.price_index.search_exact(2490000) == {product.id}


def test_recreate_service_and_rebuild_indexes(temp_db_service):
    service1, db_url = temp_db_service

    # Create 3 products
    p1 = service1.create_product({
        "sku": "SKU-001",
        "name": "Mechanical Keyboard",
        "category": "Computers",
        "price_paise": 599900,
        "stock_quantity": 10,
    })
    p2 = service1.create_product({
        "sku": "SKU-002",
        "name": "Gaming Mouse",
        "category": "Computers",
        "price_paise": 299900,
        "stock_quantity": 25,
    })
    p3 = service1.create_product({
        "sku": "SKU-003",
        "name": "Desk Mat",
        "category": "Accessories",
        "price_paise": 99900,
        "stock_quantity": 50,
    })

    # Spin up brand new ProductService on the same SQLite DB
    service2 = ProductService(db_url=db_url)

    # Verify all trees were completely rebuilt from SQLite
    assert service2.id_bst.size() == 3
    assert service2.id_avl.size() == 3
    assert service2.name_avl.size() == 3
    assert service2.price_index.distinct_price_count() == 3

    # Check products retrievable
    loaded_p1 = service2.get_product_by_id(p1.id)
    assert loaded_p1 is not None
    assert loaded_p1.name == "Mechanical Keyboard"
    assert loaded_p1.sku == "SKU-001"


def test_duplicate_prices_handling(temp_db_service):
    service, _ = temp_db_service

    # Create 3 products with the identical price ₹1,499 (149900 paise)
    p1 = service.create_product({
        "sku": "PROD-A",
        "name": "Leather Wallet Black",
        "category": "Fashion",
        "price_paise": 149900,
        "stock_quantity": 5,
    })
    p2 = service.create_product({
        "sku": "PROD-B",
        "name": "Leather Wallet Brown",
        "category": "Fashion",
        "price_paise": 149900,
        "stock_quantity": 8,
    })
    p3 = service.create_product({
        "sku": "PROD-C",
        "name": "Canvas Belt",
        "category": "Fashion",
        "price_paise": 149900,
        "stock_quantity": 12,
    })

    # Exact price search should return all 3 products without collision
    matching_ids = service.price_index.search_exact(149900)
    assert matching_ids == {p1.id, p2.id, p3.id}

    # Range search includes all 3
    results = service.search_by_price_range(100000, 200000)
    result_ids = {p.id for p in results}
    assert result_ids == {p1.id, p2.id, p3.id}


def test_duplicate_normalized_names(temp_db_service):
    service, _ = temp_db_service

    # Two distinct products with identical normalized name "wireless charger stand"
    p1 = service.create_product({
        "sku": "CHG-WHT",
        "name": "Wireless Charger Stand",
        "category": "Mobile",
        "price_paise": 199900,
        "stock_quantity": 15,
    })
    p2 = service.create_product({
        "sku": "CHG-BLK",
        "name": "  wireless   charger   stand  ",  # normalization test
        "category": "Mobile",
        "price_paise": 219900,
        "stock_quantity": 20,
    })

    assert p1.normalized_name == "wireless charger stand"
    assert p2.normalized_name == "wireless charger stand"

    # Exact name search must discover BOTH products
    exact_matches = service.search_by_name("wireless charger stand", exact=True)
    exact_ids = {p.id for p in exact_matches}
    assert exact_ids == {p1.id, p2.id}

    # Partial substring search
    partial_matches = service.search_by_name("charger", exact=False)
    partial_ids = {p.id for p in partial_matches}
    assert partial_ids == {p1.id, p2.id}


def test_update_product_name_and_price(temp_db_service):
    service, _ = temp_db_service

    p = service.create_product({
        "sku": "MON-4K",
        "name": "Dell 27 Inch 4K Monitor",
        "category": "Computers",
        "price_paise": 3499900,
        "stock_quantity": 10,
    })

    # Update name and price
    updated = service.update_product(p.id, {
        "name": "Dell UltraSharp 27 4K Monitor",
        "price_paise": 3299900,
        "stock_quantity": 12,
    })

    assert updated.name == "Dell UltraSharp 27 4K Monitor"
    assert updated.price_paise == 3299900
    assert updated.stock_quantity == 12

    # Verify old name removed from index and new name present
    assert service.search_by_name("Dell 27 Inch 4K Monitor", exact=True) == []
    new_search = service.search_by_name("Dell UltraSharp 27 4K Monitor", exact=True)
    assert len(new_search) == 1
    assert new_search[0].id == p.id

    # Verify old price removed from PriceIndex and new price present
    assert service.price_index.search_exact(3499900) == set()
    assert service.price_index.search_exact(3299900) == {p.id}


def test_delete_product_prunes_indexes(temp_db_service):
    service, _ = temp_db_service

    p = service.create_product({
        "sku": "TAB-01",
        "name": "Apple iPad Air",
        "category": "Tablets",
        "price_paise": 5990000,
        "stock_quantity": 7,
    })

    assert service.delete_product(p.id) is True

    # Deleting non-existent product returns False
    assert service.delete_product(99999) is False

    # Verify deleted from DB
    assert service.get_product_by_id(p.id) is None

    # Verify pruned from all in-memory indexes
    assert service.id_bst.get(p.id) is None
    assert service.id_avl.get(p.id) is None
    assert service.name_avl.get("apple ipad air") is None
    assert service.price_index.search_exact(5990000) == set()


def test_inclusive_price_range_and_empty_ranges(temp_db_service):
    service, _ = temp_db_service

    prices = [10000, 25000, 50000, 75000, 100000]
    for i, pr in enumerate(prices):
        service.create_product({
            "sku": f"RNG-{i}",
            "name": f"Product {i}",
            "category": "General",
            "price_paise": pr,
            "stock_quantity": 5,
        })

    # Inclusive range [25000, 75000] should match products at 25000, 50000, 75000
    res = service.search_by_price_range(25000, 75000)
    assert [p.price_paise for p in res] == [25000, 50000, 75000]

    # Inverted range [75000, 25000] -> empty
    assert service.search_by_price_range(75000, 25000) == []

    # Out-of-bounds range -> empty
    assert service.search_by_price_range(200000, 300000) == []


def test_category_and_stock_filtering(temp_db_service):
    service, _ = temp_db_service

    service.create_product({
        "sku": "ELEC-1",
        "name": "Smart Watch",
        "category": "Electronics",
        "price_paise": 499900,
        "stock_quantity": 0,
        "is_available": False,
    })
    service.create_product({
        "sku": "ELEC-2",
        "name": "Bluetooth Speaker",
        "category": "Electronics",
        "price_paise": 299900,
        "stock_quantity": 15,
        "is_available": True,
    })
    service.create_product({
        "sku": "FASH-1",
        "name": "Cotton T-Shirt",
        "category": "Fashion",
        "price_paise": 79900,
        "stock_quantity": 30,
        "is_available": True,
    })

    # Category filter
    elec = service.list_products(category="Electronics")
    assert len(elec) == 2

    # In-stock only filter
    in_stock = service.list_products(category="Electronics", in_stock_only=True)
    assert len(in_stock) == 1
    assert in_stock[0].name == "Bluetooth Speaker"

    # Sorting by price descending
    sorted_price = service.list_products(sort_by="price_desc")
    assert [p.price_paise for p in sorted_price] == [499900, 299900, 79900]


def test_validation_and_duplicate_sku(temp_db_service):
    service, _ = temp_db_service

    # Zero or negative price
    with pytest.raises(ValueError, match="positive"):
        service.create_product({
            "sku": "INV-1",
            "name": "Free Item",
            "category": "General",
            "price_paise": 0,
        })

    with pytest.raises(ValueError, match="positive"):
        service.create_product({
            "sku": "INV-2",
            "name": "Negative Price Item",
            "category": "General",
            "price": -10.0,
        })

    # Negative stock
    with pytest.raises(ValueError, match="negative"):
        service.create_product({
            "sku": "INV-3",
            "name": "Ghost Stock Item",
            "category": "General",
            "price_paise": 10000,
            "stock_quantity": -5,
        })

    # Empty name
    with pytest.raises(ValueError, match="name"):
        service.create_product({
            "sku": "INV-4",
            "name": "   ",
            "category": "General",
            "price_paise": 10000,
        })

    # Duplicate SKU collision
    service.create_product({
        "sku": "DUP-SKU",
        "name": "Original Item",
        "category": "General",
        "price_paise": 10000,
    })

    with pytest.raises(ValueError, match="already exists"):
        service.create_product({
            "sku": "DUP-SKU",
            "name": "Colliding SKU Item",
            "category": "General",
            "price_paise": 20000,
        })


def test_search_by_id_trace(temp_db_service):
    service, _ = temp_db_service

    products = []
    for i in [50, 25, 75, 10, 30, 60, 90]:
        p = service.create_product({
            "sku": f"SKU-{i}",
            "name": f"Item {i}",
            "category": "General",
            "price_paise": i * 1000,
        })
        products.append(p)

    target_id = products[4].id

    # Search in AVL
    avl_res = service.search_by_id(target_id, tree_type="avl")
    assert avl_res.found is True
    assert avl_res.comparisons > 0
    assert len(avl_res.trace) > 0
    assert avl_res.value is not None
    assert avl_res.value.id == target_id

    # Search in BST
    bst_res = service.search_by_id(target_id, tree_type="bst")
    assert bst_res.found is True
    assert bst_res.comparisons > 0
    assert bst_res.value is not None
    assert bst_res.value.id == target_id

    # Search non-existent ID
    not_found = service.search_by_id(99999, tree_type="avl")
    assert not_found.found is False



def test_diagnostics(temp_db_service):
    service, _ = temp_db_service
    service.create_product({
        "sku": "DIAG-1",
        "name": "Diagnostics Item",
        "category": "Diagnostics",
        "price_paise": 10000,
        "stock_quantity": 5,
    })

    diag = service.get_index_diagnostics()
    assert diag["id_bst"]["size"] == 1
    assert diag["id_avl"]["size"] == 1
    assert diag["id_avl"]["is_balanced"] is True
    assert diag["name_avl"]["size"] == 1
    assert diag["price_index"]["distinct_prices"] == 1
    assert diag["price_index"]["total_products"] == 1


def test_failed_mutation_preserves_consistency(temp_db_service):
    service, _ = temp_db_service

    p = service.create_product({
        "sku": "STABLE-1",
        "name": "Stable Item",
        "category": "Core",
        "price_paise": 100000,
        "stock_quantity": 10,
    })

    initial_bst_size = service.id_bst.size()
    initial_avl_size = service.id_avl.size()

    # Attempt to create an invalid product with negative stock
    with pytest.raises(ValueError):
        service.create_product({
            "sku": "INVALID-1",
            "name": "Bad Item",
            "category": "Core",
            "price_paise": 50000,
            "stock_quantity": -10,
        })

    # In-memory indexes must not be polluted
    assert service.id_bst.size() == initial_bst_size
    assert service.id_avl.size() == initial_avl_size
    assert service.id_avl.get(p.id) is not None

    # Attempt to update existing product with negative price
    with pytest.raises(ValueError):
        service.update_product(p.id, {"price_paise": -500})

    # Original product in memory remains intact
    unaltered = service.get_product_by_id(p.id)
    assert unaltered is not None
    assert unaltered.price_paise == 100000


def test_all_sorting_orders(temp_db_service):
    service, _ = temp_db_service

    service.create_product({
        "sku": "S-B",
        "name": "Beta Product",
        "category": "General",
        "price_paise": 50000,
        "rating": 4.2,
    })
    service.create_product({
        "sku": "S-A",
        "name": "Alpha Product",
        "category": "General",
        "price_paise": 20000,
        "rating": 4.9,
    })
    service.create_product({
        "sku": "S-C",
        "name": "Gamma Product",
        "category": "General",
        "price_paise": 90000,
        "rating": 3.8,
    })

    # Sort name asc
    names_asc = [p.name for p in service.list_products(sort_by="name_asc")]
    assert names_asc == ["Alpha Product", "Beta Product", "Gamma Product"]

    # Sort name desc
    names_desc = [p.name for p in service.list_products(sort_by="name_desc")]
    assert names_desc == ["Gamma Product", "Beta Product", "Alpha Product"]

    # Sort price asc
    prices_asc = [p.price_paise for p in service.list_products(sort_by="price_asc")]
    assert prices_asc == [20000, 50000, 90000]

    # Sort price desc
    prices_desc = [p.price_paise for p in service.list_products(sort_by="price_desc")]
    assert prices_desc == [90000, 50000, 20000]

    # Sort rating desc
    ratings_desc = [p.rating for p in service.list_products(sort_by="rating_desc")]
    assert ratings_desc == [4.9, 4.2, 3.8]


def test_empty_and_whitespace_name_queries(temp_db_service):
    service, _ = temp_db_service
    service.create_product({
        "sku": "ITEM-1",
        "name": "Standard Item",
        "category": "General",
        "price_paise": 10000,
    })

    assert service.search_by_name("") == []
    assert service.search_by_name("   ") == []
    assert service.search_by_name("", exact=True) == []
    assert service.search_by_name("   ", exact=True) == []

