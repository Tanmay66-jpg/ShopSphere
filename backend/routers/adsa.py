"""ADSA Live Backend Working Router for ShopSphere.

Provides read-only diagnostic and demonstration endpoints exposing how
the live in-memory data structures (Product ID BST, Product ID AVL Tree,
Product Name AVL Tree, and Price Index) operate on the real 50 catalogue
products in the database.
"""

from __future__ import annotations

import time
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func

from backend.database.connection import get_db_session
from backend.database.models import Product
from backend.services.product_service import ProductService
from backend.api.routes import get_service
from backend.algorithms.bst import BinarySearchTree
from backend.algorithms.avl import AVLTree

router = APIRouter(tags=["ADSA Live Working"])


def _format_tree_node(node: Optional[Dict[str, Any]], tree_type: str) -> Optional[Dict[str, Any]]:
    """Format an in-memory tree dictionary into a clean nested JSON structure."""
    if node is None:
        return None

    key = node.get("key")
    val = node.get("value")
    height = node.get("height", 0)
    balance_factor = node.get("balance_factor", 0)

    formatted: Dict[str, Any] = {
        "key": key,
        "height": height,
        "balance_factor": balance_factor,
        "left": _format_tree_node(node.get("left"), tree_type),
        "right": _format_tree_node(node.get("right"), tree_type),
    }

    if hasattr(val, "id"):  # Product model
        formatted["id"] = val.id
        formatted["sku"] = val.sku
        formatted["name"] = val.name
        formatted["category"] = val.category
        formatted["price"] = val.price_rupees
        formatted["label"] = f"#{val.id} {val.sku}"
        formatted["sublabel"] = val.name
    elif isinstance(val, (set, list)):
        product_ids = sorted(list(val))
        formatted["product_ids"] = product_ids
        formatted["count"] = len(product_ids)
        formatted["label"] = str(key)
        formatted["sublabel"] = f"{len(product_ids)} item(s)"
    else:
        formatted["label"] = str(key)
        formatted["sublabel"] = str(val) if val is not None else ""

    return formatted


@router.get("/structures/summary")
def get_structures_summary(
    service: ProductService = Depends(get_service),
) -> Dict[str, Any]:
    """Return live node count, height, and balance status for all in-memory structures."""
    with get_db_session(service.engine) as session:
        sqlite_count = session.scalar(select(func.count(Product.id))) or 0

    bst_size = service.id_bst.size()
    avl_id_size = service.id_avl.size()
    avl_name_size = service.name_avl.size()
    price_total = service.price_index.total_product_count()
    price_distinct = service.price_index.distinct_price_count()

    return {
        "sqlite_product_count": sqlite_count,
        "is_all_synced": (
            sqlite_count == bst_size == avl_id_size == price_total
        ),
        "structures": {
            "bst": {
                "name": "Product ID BST",
                "key_type": "int (product_id)",
                "node_count": bst_size,
                "height": service.id_bst.get_height(),
                "is_balanced": False,
                "matches_sqlite": bst_size == sqlite_count,
                "complexity": "O(h) average O(log n), worst O(n)",
            },
            "avl_id": {
                "name": "Product ID AVL Tree",
                "key_type": "int (product_id)",
                "node_count": avl_id_size,
                "height": service.id_avl.get_height(),
                "is_balanced": service.id_avl.is_avl_balanced(),
                "matches_sqlite": avl_id_size == sqlite_count,
                "complexity": "Strictly O(log n) worst-case",
            },
            "avl_name": {
                "name": "Product Name AVL Tree",
                "key_type": "str (normalized_name)",
                "node_count": avl_name_size,
                "height": service.name_avl.get_height(),
                "is_balanced": service.name_avl.is_avl_balanced(),
                "distinct_keys": avl_name_size,
                "complexity": "Strictly O(log n) exact prefix/name lookup",
            },
            "price_index": {
                "name": "Balanced Price Index",
                "key_type": "int (price_paise)",
                "node_count": price_distinct,
                "total_indexed_products": price_total,
                "height": service.price_index.get_height(),
                "is_balanced": service.price_index.is_balanced(),
                "matches_sqlite": price_total == sqlite_count,
                "complexity": "O(log m + k) range query (m distinct prices, k matching)",
            },
        },
    }


@router.get("/structures/tree/{tree_type}")
def get_structure_tree(
    tree_type: str,
    max_depth: int = Query(7, ge=3, le=10),
    service: ProductService = Depends(get_service),
) -> Dict[str, Any]:
    """Return nested JSON hierarchical tree for live rendering."""
    tree_type = tree_type.lower().strip()
    if tree_type in ("bst", "id-bst"):
        raw_dict = service.id_bst.to_dict(max_depth=max_depth)
        formatted_root = _format_tree_node(raw_dict, "bst")
        return {
            "tree_type": "bst",
            "name": "Product ID BST",
            "total_nodes": service.id_bst.size(),
            "height": service.id_bst.get_height(),
            "is_balanced": False,
            "root": formatted_root,
        }
    elif tree_type in ("avl-id", "avl", "id-avl"):
        raw_dict = service.id_avl.to_dict(max_depth=max_depth)
        formatted_root = _format_tree_node(raw_dict, "avl-id")
        return {
            "tree_type": "avl-id",
            "name": "Product ID AVL Tree",
            "total_nodes": service.id_avl.size(),
            "height": service.id_avl.get_height(),
            "is_balanced": service.id_avl.is_avl_balanced(),
            "root": formatted_root,
        }
    elif tree_type in ("avl-name", "name-avl"):
        raw_dict = service.name_avl.to_dict(max_depth=max_depth)
        formatted_root = _format_tree_node(raw_dict, "avl-name")
        return {
            "tree_type": "avl-name",
            "name": "Product Name AVL Tree",
            "total_nodes": service.name_avl.size(),
            "height": service.name_avl.get_height(),
            "is_balanced": service.name_avl.is_avl_balanced(),
            "root": formatted_root,
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported tree type '{tree_type}'. Supported: bst, avl-id, avl-name",
        )


@router.get("/search/trace")
def get_search_trace(
    type: str = Query("id", pattern="^(id|name|price)$"),
    query: str = Query(..., min_length=1),
    service: ProductService = Depends(get_service),
) -> Dict[str, Any]:
    """Run real search on live data structures and return step-by-step trace."""
    t0 = time.perf_counter_ns()

    if type == "id":
        if not query.isdigit():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Query for type 'id' must be a valid integer ID.",
            )
        target_id = int(query)

        # Run on BST and AVL for step-by-step trace
        bst_res = service.id_bst.search(target_id)
        avl_res = service.id_avl.search(target_id)
        elapsed_ns = time.perf_counter_ns() - t0

        product = service.id_avl.get(target_id)
        prod_data = None
        if product is not None:
            prod_data = {
                "id": product.id,
                "sku": product.sku,
                "name": product.name,
                "category": product.category,
                "price": product.price_rupees,
            }

        def serialize_trace(trace_steps: list) -> list:
            res = []
            for s in trace_steps:
                direction = "match" if s.comparison == "EXACT_MATCH" else ("left" if s.comparison == "LEFT" else ("right" if s.comparison == "RIGHT" else "none"))
                res.append({
                    "node_key": s.node_key,
                    "depth": s.depth,
                    "comparison": s.comparison,
                    "direction": direction,
                })
            return res

        return {
            "type": "id",
            "query": target_id,
            "found": avl_res.found,
            "elapsed_us": round(elapsed_ns / 1000.0, 2),
            "result": prod_data,
            "bst_trace": {
                "comparisons": bst_res.comparisons,
                "steps": serialize_trace(bst_res.trace),
            },
            "avl_trace": {
                "comparisons": avl_res.comparisons,
                "steps": serialize_trace(avl_res.trace),
            },
        }

    elif type == "name":
        norm_query = Product.normalize_name(query)
        res = service.name_avl.search(norm_query)
        elapsed_ns = time.perf_counter_ns() - t0

        matching_products = []
        if res.found:
            matching_ids = service.name_avl.get(norm_query) or set()
            for pid in matching_ids:
                p = service.id_avl.get(pid)
                if p:
                    matching_products.append({
                        "id": p.id,
                        "sku": p.sku,
                        "name": p.name,
                        "price": p.price_rupees,
                    })

        steps = []
        for s in res.trace:
            direction = "match" if s.comparison == "EXACT_MATCH" else ("left" if s.comparison == "LEFT" else ("right" if s.comparison == "RIGHT" else "none"))
            steps.append({
                "node_key": s.node_key,
                "depth": s.depth,
                "comparison": s.comparison,
                "direction": direction,
            })

        return {
            "type": "name",
            "query": query,
            "normalized_query": norm_query,
            "found": res.found,
            "comparisons": res.comparisons,
            "elapsed_us": round(elapsed_ns / 1000.0, 2),
            "matching_products": matching_products,
            "steps": steps,
        }

    else:  # type == 'price'
        # Query format: min_rupees-max_rupees, e.g. "1000-5000"
        try:
            parts = [float(x.strip()) for x in query.split("-")]
            min_r = parts[0]
            max_r = parts[1] if len(parts) > 1 else parts[0]
            if min_r > max_r:
                min_r, max_r = max_r, min_r
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Price query must be in format 'min-max', e.g. '1000-5000'",
            )

        min_paise = int(round(min_r * 100))
        max_paise = int(round(max_r * 100))

        matching_ids = service.price_index.find_product_ids_in_range(min_paise, max_paise)
        elapsed_ns = time.perf_counter_ns() - t0

        products = []
        for pid in matching_ids:
            p = service.id_avl.get(pid)
            if p:
                products.append({
                    "id": p.id,
                    "sku": p.sku,
                    "name": p.name,
                    "price": p.price_rupees,
                })

        return {
            "type": "price",
            "query": f"₹{min_r:,.0f} - ₹{max_r:,.0f}",
            "min_rupees": min_r,
            "max_rupees": max_r,
            "count": len(products),
            "elapsed_us": round(elapsed_ns / 1000.0, 2),
            "matching_products": products,
        }


@router.get("/compare")
def compare_search_methods(
    query: str = Query(..., min_length=1),
    service: ProductService = Depends(get_service),
) -> Dict[str, Any]:
    """Execute simultaneous lookup using Linear Scan, BST, and AVL on the real database products."""
    all_products = [p for _, p in service.id_avl.inorder()]
    total_n = len(all_products)

    # Determine if query is an integer ID or a product name / SKU
    is_id = query.isdigit()
    target_id = int(query) if is_id else -1
    target_str = query.strip().lower()

    # 1. Linear Scan
    t0 = time.perf_counter_ns()
    linear_comparisons = 0
    linear_found = False
    linear_matched_product = None

    for p in all_products:
        linear_comparisons += 1
        if is_id and p.id == target_id:
            linear_found = True
            linear_matched_product = p
            break
        elif (not is_id) and (target_str in p.name.lower() or target_str == p.sku.lower()):
            linear_found = True
            linear_matched_product = p
            break

    linear_time_ns = time.perf_counter_ns() - t0

    # 2. BST Search
    t1 = time.perf_counter_ns()
    if is_id:
        bst_res = service.id_bst.search(target_id)
        bst_comparisons = bst_res.comparisons
        bst_found = bst_res.found
    else:
        # If searching by name in BST: simulated linear scan over BST keys
        bst_comparisons = linear_comparisons
        bst_found = linear_found
    bst_time_ns = time.perf_counter_ns() - t1

    # 3. AVL Search
    t2 = time.perf_counter_ns()
    if is_id:
        avl_res = service.id_avl.search(target_id)
        avl_comparisons = avl_res.comparisons
        avl_found = avl_res.found
    else:
        norm_name = Product.normalize_name(query)
        name_res = service.name_avl.search(norm_name)
        avl_comparisons = name_res.comparisons
        avl_found = name_res.found
    avl_time_ns = time.perf_counter_ns() - t2

    return {
        "query": query,
        "is_id_search": is_id,
        "catalogue_size": total_n,
        "matched_product": {
            "id": linear_matched_product.id,
            "sku": linear_matched_product.sku,
            "name": linear_matched_product.name,
            "price": linear_matched_product.price_rupees,
        } if linear_matched_product else None,
        "methods": {
            "linear_scan": {
                "name": "Linear Scan (Unindexed / Array)",
                "comparisons": linear_comparisons,
                "time_us": round(linear_time_ns / 1000.0, 2),
                "time_ns": linear_time_ns,
                "complexity": "O(n)",
                "found": linear_found,
            },
            "bst": {
                "name": "Binary Search Tree (Unbalanced)",
                "comparisons": bst_comparisons,
                "time_us": round(bst_time_ns / 1000.0, 2),
                "time_ns": bst_time_ns,
                "complexity": "O(h)",
                "found": bst_found,
            },
            "avl": {
                "name": "Self-Balancing AVL Tree",
                "comparisons": avl_comparisons,
                "time_us": round(avl_time_ns / 1000.0, 2),
                "time_ns": avl_time_ns,
                "complexity": "O(log n)",
                "found": avl_found,
            },
        },
    }


@router.get("/insertion-order")
def get_insertion_order_demo(
    service: ProductService = Depends(get_service),
) -> Dict[str, Any]:
    """Compute how inserting the 50 products in SKU/ID order degrades BST vs AVL."""
    # Use real products from database
    products = [p for _, p in service.id_avl.inorder()]
    total_n = len(products)

    # 1. Sequential Insertion (Sorted by ID: 1, 2, ..., 50)
    seq_bst: BinarySearchTree[int, str] = BinarySearchTree[int, str]()
    seq_avl: AVLTree[int, str] = AVLTree[int, str]()

    for p in products:
        seq_bst.insert(p.id, p.sku)
        seq_avl.insert(p.id, p.sku)

    # 2. Random Permutation Simulation
    import random
    rnd = random.Random(42)
    shuffled_ids = [p.id for p in products]
    rnd.shuffle(shuffled_ids)

    rand_bst: BinarySearchTree[int, str] = BinarySearchTree[int, str]()
    rand_avl: AVLTree[int, str] = AVLTree[int, str]()

    for pid in shuffled_ids:
        rand_bst.insert(pid, str(pid))
        rand_avl.insert(pid, str(pid))

    rotations = seq_avl.get_rotation_stats()

    return {
        "product_count": total_n,
        "sequential_insertion": {
            "order": "Ascending Product ID (1 to 50)",
            "bst_height": seq_bst.get_height(),
            "bst_is_degenerate": seq_bst.get_height() == total_n,
            "avl_height": seq_avl.get_height(),
            "avl_is_balanced": seq_avl.is_avl_balanced(),
            "avl_rotations": rotations,
            "explanation": (
                f"Inserting {total_n} sorted items degrades an unassisted BST to a linked list "
                f"of height {seq_bst.get_height()} (O(N) search). The AVL tree executes "
                f"{rotations.get('total', 0)} automatic rotations to maintain strict balance "
                f"at height {seq_avl.get_height()} (O(log N) search)."
            ),
        },
        "random_insertion": {
            "order": "Randomized Product Order",
            "bst_height": rand_bst.get_height(),
            "avl_height": rand_avl.get_height(),
            "explanation": (
                f"With randomized data, BST achieves height {rand_bst.get_height()}, but AVL "
                f"guarantees optimal height {rand_avl.get_height()} regardless of input sequence."
            ),
        },
    }
