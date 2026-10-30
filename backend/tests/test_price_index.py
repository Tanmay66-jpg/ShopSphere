"""Unit tests for Custom Balanced Price Range Index (PriceIndex)."""

import pytest
from backend.algorithms.price_index import PriceIndex


def test_price_index_empty():
    idx = PriceIndex()
    assert idx.distinct_price_count() == 0
    assert idx.total_product_count() == 0
    assert idx.get_height() == -1
    assert idx.is_balanced() is True
    assert idx.search_exact(1000) == set()
    assert idx.find_range(100, 2000) == []
    assert idx.find_product_ids_in_range(100, 2000) == []


def test_price_index_insert_and_duplicate_prices():
    idx = PriceIndex()

    # Insert 3 products sharing exact same price: 149900 paise (₹1,499)
    assert idx.insert(149900, 101) is True
    assert idx.insert(149900, 102) is True
    assert idx.insert(149900, 103) is True

    # Re-inserting existing product at same price returns False
    assert idx.insert(149900, 101) is False

    assert idx.distinct_price_count() == 1
    assert idx.total_product_count() == 3

    exact_matches = idx.search_exact(149900)
    assert exact_matches == {101, 102, 103}


def test_price_index_range_search_inclusive():
    idx = PriceIndex()

    # Insert various prices
    # ₹500, ₹1000, ₹1500, ₹2000, ₹2500
    idx.insert(50000, 1)
    idx.insert(100000, 2)
    idx.insert(100000, 3)  # duplicate price
    idx.insert(150000, 4)
    idx.insert(200000, 5)
    idx.insert(250000, 6)

    # Range [₹1000, ₹2000] inclusive -> IDs: 2, 3, 4, 5
    ids = idx.find_product_ids_in_range(100000, 200000)
    assert ids == [2, 3, 4, 5]

    # Boundary test: exact single price range [₹1500, ₹1500]
    ids_single = idx.find_product_ids_in_range(150000, 150000)
    assert ids_single == [4]

    # Open-ended min only: >= ₹1500
    ids_min_only = idx.find_product_ids_in_range(min_price_paise=150000)
    assert ids_min_only == [4, 5, 6]

    # Open-ended max only: <= ₹1000
    ids_max_only = idx.find_product_ids_in_range(max_price_paise=100000)
    assert ids_max_only == [1, 2, 3]


def test_price_index_empty_and_inverted_range():
    idx = PriceIndex()
    idx.insert(100000, 1)
    idx.insert(200000, 2)

    # Inverted range [2000, 1000] -> empty
    assert idx.find_product_ids_in_range(200000, 100000) == []

    # Non-overlapping range
    assert idx.find_product_ids_in_range(300000, 400000) == []


def test_price_index_removal_and_node_pruning():
    idx = PriceIndex()
    idx.insert(100000, 1)
    idx.insert(100000, 2)
    idx.insert(200000, 3)

    assert idx.distinct_price_count() == 2
    assert idx.total_product_count() == 3

    # Remove 1 from 100000: price node should persist because product 2 remains
    assert idx.remove(100000, 1) is True
    assert idx.distinct_price_count() == 2
    assert idx.total_product_count() == 2
    assert idx.search_exact(100000) == {2}

    # Remove non-existent product
    assert idx.remove(100000, 999) is False
    assert idx.remove(999999, 1) is False

    # Remove product 2 from 100000: set becomes empty, price node pruned from AVL tree
    assert idx.remove(100000, 2) is True
    assert idx.distinct_price_count() == 1
    assert idx.total_product_count() == 1
    assert idx.search_exact(100000) == set()
    assert idx.is_balanced() is True


def test_price_index_update_product_price():
    idx = PriceIndex()
    idx.insert(50000, 10)  # ₹500
    idx.insert(80000, 20)  # ₹800

    # Move product 10 from ₹500 to ₹1200
    assert idx.update_product_price(10, 50000, 120000) is True
    assert idx.search_exact(50000) == set()
    assert idx.search_exact(120000) == {10}
    assert idx.distinct_price_count() == 2

    # Moving with same price is a no-op returning True
    assert idx.update_product_price(10, 120000, 120000) is True


def test_price_index_balance_under_large_churn():
    idx = PriceIndex()

    # Insert 100 distinct prices with multiple duplicate products
    for price in range(1000, 101000, 1000):
        idx.insert(price, price // 1000)
        idx.insert(price, (price // 1000) + 1000)  # duplicate price

    assert idx.distinct_price_count() == 100
    assert idx.total_product_count() == 200
    assert idx.is_balanced() is True

    # Range query
    range_results = idx.find_product_ids_in_range(20000, 30000)
    assert len(range_results) == 22  # 11 distinct prices * 2 products each

    # Delete half the prices
    for price in range(1000, 51000, 1000):
        idx.remove(price, price // 1000)
        idx.remove(price, (price // 1000) + 1000)

    assert idx.distinct_price_count() == 50
    assert idx.total_product_count() == 100
    assert idx.is_balanced() is True
