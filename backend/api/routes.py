"""FastAPI route handlers for ShopSphere product catalogue and ADSA diagnostics."""

from __future__ import annotations
import random
import time
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from backend.algorithms.bst import BinarySearchTree
from backend.algorithms.avl import AVLTree
from backend.database.models import Product
from backend.services.product_service import ProductService
from backend.algorithms.benchmark_engine import run_rigorous_benchmark
from .schemas import (
    BenchmarkMetricsSchema,
    BenchmarkRequest,
    BenchmarkResponse,
    HealthResponse,
    OperationTraceRequest,
    OperationTraceResponseSchema,
    ProductCreate,
    ProductFilterRequest,
    ProductResponse,
    ProductUpdate,
    SearchResponseSchema,
    TreeStructureResponseSchema,
)

router = APIRouter()


def get_service(request: Request) -> ProductService:
    """Dependency provider returning singleton ProductService instance."""
    if not hasattr(request.app.state, "product_service"):
        # Fallback initialization if accessed outside normal lifespan
        request.app.state.product_service = ProductService()
    return request.app.state.product_service


# -----------------------------------------------------------------------------
# Health & Status
# -----------------------------------------------------------------------------

@router.get("/health", response_model=HealthResponse, tags=["Health"])
def get_health(service: ProductService = Depends(get_service)) -> HealthResponse:
    """Return backend health, SQLite readiness, and in-memory index diagnostics."""
    diagnostics = service.get_index_diagnostics()
    return HealthResponse(
        status="ok",
        service="ShopSphere Backend API",
        engine="FastAPI + SQLAlchemy 2.0 + SQLite",
        total_products=service.id_avl.size(),
        diagnostics=diagnostics,
    )


# -----------------------------------------------------------------------------
# Categories
# -----------------------------------------------------------------------------

@router.get("/categories", response_model=List[str], tags=["Categories"])
def get_categories(service: ProductService = Depends(get_service)) -> List[str]:
    """Return distinct categories available in the product catalogue."""
    categories: set[str] = {"All Categories"}
    for _, product in service.id_avl.inorder():
        if product.category:
            categories.add(product.category.strip())
    # Return All Categories first, followed by alphabetically sorted categories
    cat_list = sorted([c for c in categories if c != "All Categories"])
    return ["All Categories"] + cat_list


# -----------------------------------------------------------------------------
# Product Range Query (Placed BEFORE /products/{product_id} to prevent path conflict)
# -----------------------------------------------------------------------------

@router.get("/products/range", response_model=List[ProductResponse], tags=["Products"])
def get_products_in_range(
    min_price: Optional[float] = Query(None, description="Minimum price in rupees"),
    max_price: Optional[float] = Query(None, description="Maximum price in rupees"),
    min_paise: Optional[int] = Query(None, description="Minimum price in paise"),
    max_paise: Optional[int] = Query(None, description="Maximum price in paise"),
    service: ProductService = Depends(get_service),
) -> List[ProductResponse]:
    """Retrieve products within an inclusive price range using balanced PriceIndex."""
    # Convert rupees to paise if provided
    lower_paise: Optional[int] = min_paise
    if lower_paise is None and min_price is not None:
        if min_price < 0:
            raise HTTPException(status_code=400, detail="Minimum price cannot be negative")
        lower_paise = int(round(min_price * 100))

    upper_paise: Optional[int] = max_paise
    if upper_paise is None and max_price is not None:
        if max_price < 0:
            raise HTTPException(status_code=400, detail="Maximum price cannot be negative")
        upper_paise = int(round(max_price * 100))

    if lower_paise is not None and upper_paise is not None and lower_paise > upper_paise:
        return []

    products = service.search_by_price_range(lower_paise, upper_paise)
    return [ProductResponse.model_validate(p.to_dict()) for p in products]


# -----------------------------------------------------------------------------
# Product Search (POST /api/products/search and alias /api/search)
# -----------------------------------------------------------------------------

@router.post("/products/search", response_model=SearchResponseSchema, tags=["Search"])
@router.post("/search", response_model=SearchResponseSchema, tags=["Search"], include_in_schema=False)
def search_products(
    filters: ProductFilterRequest,
    service: ProductService = Depends(get_service),
) -> SearchResponseSchema:
    """Execute multi-mode product search with algorithm path and comparison metrics."""
    t_start = time.perf_counter()
    query_str = (filters.query or "").strip()
    search_by = filters.searchBy or "name"
    tree_type = (filters.tree_type or "avl").lower()

    results: List[Product] = []
    comparisons = 0
    path_trace: List[Any] = []

    # 1. Mode: Product ID / Numeric Key
    if search_by in ("id", "sku") and query_str.isdigit():
        target_id = int(query_str)
        search_outcome = service.search_by_id(target_id, tree_type=tree_type)
        comparisons = search_outcome.comparisons
        path_trace = [step.node_key for step in search_outcome.trace]
        if search_outcome.found and search_outcome.value is not None:
            results = [search_outcome.value]

    # 2. Mode: Price Range or Exact Price
    elif search_by == "price":
        min_p = filters.minPrice
        max_p = filters.maxPrice
        if min_p is not None or max_p is not None:
            min_paise = int(round(min_p * 100)) if min_p is not None else None
            max_paise = int(round(max_p * 100)) if max_p is not None else None
            results = service.search_by_price_range(min_paise, max_paise)
            comparisons = service.price_index.get_height() + len(results)
            path_trace = [p.price_paise for p in results[:10]]
        elif query_str and query_str.replace(".", "", 1).isdigit():
            price_paise = int(round(float(query_str) * 100))
            id_set = service.price_index.search_exact(price_paise)
            results = [service.id_avl.get(pid) for pid in sorted(list(id_set)) if service.id_avl.get(pid)]
            comparisons = service.price_index.get_height()
            path_trace = [price_paise]

    # 3. Mode: Name Search (Default)
    else:
        if query_str:
            results = service.search_by_name(query_str, exact=False)
            comparisons = service.name_avl.size()  # O(k) distinct name tests
            path_trace = [p.id for p in results[:10]]
        else:
            results = [p for _, p in service.id_avl.inorder()]
            comparisons = 1

    # Apply secondary filters: Category
    if filters.category and filters.category not in ("All Categories", "all", ""):
        target_cat = filters.category.strip().casefold()
        results = [p for p in results if p.category.strip().casefold() == target_cat]

    # Apply secondary filters: In-Stock Only
    if filters.inStockOnly:
        results = [p for p in results if p.stock_quantity > 0 and p.is_available]

    # Apply secondary filters: Additional Price Bounds if not in price search mode
    if search_by != "price":
        if filters.minPrice is not None:
            min_paise = int(round(filters.minPrice * 100))
            results = [p for p in results if p.price_paise >= min_paise]
        if filters.maxPrice is not None:
            max_paise = int(round(filters.maxPrice * 100))
            results = [p for p in results if p.price_paise <= max_paise]

    # Apply sorting
    sort_by = (filters.sortBy or "id").lower()
    if sort_by in ("price-asc", "price_asc"):
        results.sort(key=lambda p: p.price_paise)
    elif sort_by in ("price-desc", "price_desc"):
        results.sort(key=lambda p: p.price_paise, reverse=True)
    elif sort_by in ("name-asc", "name_asc", "name"):
        results.sort(key=lambda p: p.name.casefold())
    elif sort_by in ("name-desc", "name_desc"):
        results.sort(key=lambda p: p.name.casefold(), reverse=True)
    elif sort_by in ("rating-desc", "rating"):
        results.sort(key=lambda p: (p.rating, p.rating_count), reverse=True)
    else:
        results.sort(key=lambda p: p.id)

    elapsed_ms = (time.perf_counter() - t_start) * 1000.0

    return SearchResponseSchema(
        results=[ProductResponse.model_validate(p.to_dict()) for p in results],
        total_count=len(results),
        search_key=query_str,
        search_by=search_by,
        comparisons=max(1, comparisons),
        execution_time_ms=round(elapsed_ms, 3),
        path=path_trace,
    )


# -----------------------------------------------------------------------------
# Products Listing & CRUD
# -----------------------------------------------------------------------------

@router.get("/products", response_model=List[ProductResponse], tags=["Products"])
def list_products(
    category: Optional[str] = Query(None, description="Filter by category"),
    is_available: Optional[bool] = Query(None, description="Filter by availability"),
    in_stock_only: bool = Query(False, description="Filter in-stock products"),
    min_price: Optional[float] = Query(None, description="Minimum price in INR"),
    max_price: Optional[float] = Query(None, description="Maximum price in INR"),
    sort_by: str = Query("id_asc", description="Sort order"),
    limit: Optional[int] = Query(None, ge=1, le=1000, description="Pagination limit"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    service: ProductService = Depends(get_service),
) -> List[ProductResponse]:
    """Retrieve list of products with multi-attribute filtering, sorting, and pagination."""
    min_paise = int(round(min_price * 100)) if min_price is not None else None
    max_paise = int(round(max_price * 100)) if max_price is not None else None

    products = service.list_products(
        category=category,
        is_available=is_available,
        in_stock_only=in_stock_only,
        min_price_paise=min_paise,
        max_price_paise=max_paise,
        sort_by=sort_by,
    )

    if offset > 0:
        products = products[offset:]
    if limit is not None:
        products = products[:limit]

    return [ProductResponse.model_validate(p.to_dict()) for p in products]


@router.get("/products/{product_id}", response_model=ProductResponse, tags=["Products"])
def get_product(
    product_id: int,
    service: ProductService = Depends(get_service),
) -> ProductResponse:
    """Retrieve a single product by primary integer ID."""
    product = service.get_product_by_id(product_id)
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {product_id} not found",
        )
    return ProductResponse.model_validate(product.to_dict())


@router.post(
    "/products",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Products"],
)
def create_product(
    payload: ProductCreate,
    service: ProductService = Depends(get_service),
) -> ProductResponse:
    """Create a new product, persist to SQLite, and update in-memory search trees."""
    try:
        product = service.create_product(payload.model_dump())
        return ProductResponse.model_validate(product.to_dict())
    except ValueError as e:
        err_msg = str(e)
        if "already exists" in err_msg:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=err_msg)
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=err_msg)


@router.put("/products/{product_id}", response_model=ProductResponse, tags=["Products"])
def update_product(
    product_id: int,
    payload: ProductUpdate,
    service: ProductService = Depends(get_service),
) -> ProductResponse:
    """Update product attributes in SQLite and synchronize all tree indexes."""
    try:
        updated = service.update_product(product_id, payload.model_dump(exclude_unset=True))
        return ProductResponse.model_validate(updated.to_dict())
    except ValueError as e:
        err_msg = str(e)
        if "not found" in err_msg:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err_msg)
        if "already exists" in err_msg:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=err_msg)
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=err_msg)


@router.delete("/products/{product_id}", tags=["Products"])
def delete_product(
    product_id: int,
    service: ProductService = Depends(get_service),
) -> Dict[str, Any]:
    """Delete a product from persistent SQLite storage and prune from all tree indexes."""
    deleted = service.delete_product(product_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {product_id} not found",
        )
    return {"message": "Product deleted successfully", "deleted_id": product_id}


def _clean_tree_dict(node: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Clean tree node dictionary for Pydantic/JSON serialization."""
    if node is None:
        return None

    clean_node = dict(node)
    val = clean_node.get("value")
    if hasattr(val, "name"):
        clean_node["label"] = f"#{val.id} - {val.name[:18]}"
        clean_node["value"] = {
            "id": val.id,
            "name": val.name,
            "sku": val.sku,
            "price": val.price_rupees,
        }
    elif isinstance(val, (set, list)):
        clean_node["value"] = sorted(list(val))
    elif val is not None and not isinstance(val, (int, float, str, bool, dict, list)):
        clean_node["value"] = str(val)

    if clean_node.get("left") is not None:
        clean_node["left"] = _clean_tree_dict(clean_node["left"])
    if clean_node.get("right") is not None:
        clean_node["right"] = _clean_tree_dict(clean_node["right"])

    return clean_node


# -----------------------------------------------------------------------------
# ADSA Performance Lab & Diagnostics
# -----------------------------------------------------------------------------

@router.get("/adsa/tree/bst", response_model=TreeStructureResponseSchema, tags=["ADSA"])
def get_bst_tree(
    max_nodes: int = Query(50, ge=5, le=500),
    service: ProductService = Depends(get_service),
) -> TreeStructureResponseSchema:
    """Return JSON hierarchical tree structure of the Unbalanced BST for visual rendering."""
    max_depth = 6 if max_nodes <= 64 else 8
    root_dict = _clean_tree_dict(service.id_bst.to_dict(max_depth=max_depth))
    return TreeStructureResponseSchema(
        tree_type="bst",
        root=root_dict,
        total_nodes=service.id_bst.size(),
        height=service.id_bst.get_height(),
        is_balanced=False,
    )


@router.get("/adsa/tree/avl", response_model=TreeStructureResponseSchema, tags=["ADSA"])
def get_avl_tree(
    max_nodes: int = Query(50, ge=5, le=500),
    service: ProductService = Depends(get_service),
) -> TreeStructureResponseSchema:
    """Return JSON hierarchical tree structure of the Self-Balancing AVL for visual rendering."""
    max_depth = 6 if max_nodes <= 64 else 8
    root_dict = _clean_tree_dict(service.id_avl.to_dict(max_depth=max_depth))
    return TreeStructureResponseSchema(
        tree_type="avl",
        root=root_dict,
        total_nodes=service.id_avl.size(),
        height=service.id_avl.get_height(),
        is_balanced=service.id_avl.is_avl_balanced(),
    )


@router.get("/adsa/diagnostics", tags=["ADSA"])
@router.get("/adsa/tree-diagnostics", tags=["ADSA"], include_in_schema=False)
def get_adsa_diagnostics(service: ProductService = Depends(get_service)) -> Dict[str, Any]:
    """Return comprehensive diagnostics for BST, AVL, and Price Index structures."""
    return service.get_index_diagnostics()


@router.post("/adsa/operation-trace", response_model=OperationTraceResponseSchema, tags=["ADSA"])
def trace_operation(
    req: OperationTraceRequest,
    service: ProductService = Depends(get_service),
) -> OperationTraceResponseSchema:
    """Execute live key search on selected tree, returning step-by-step traversal trace."""
    t_start = time.perf_counter()
    target_key = int(req.target_key) if str(req.target_key).isdigit() else 0

    if req.tree_type == "bst":
        res = service.id_bst.search(target_key)
        snapshot = _clean_tree_dict(service.id_bst.to_dict(max_depth=5))
    else:
        res = service.id_avl.search(target_key)
        snapshot = _clean_tree_dict(service.id_avl.to_dict(max_depth=5))

    elapsed_ms = (time.perf_counter() - t_start) * 1000.0


    return OperationTraceResponseSchema(
        tree_type=req.tree_type,
        target_key=req.target_key,
        found=res.found,
        comparisons=res.comparisons,
        execution_time_ms=round(elapsed_ms, 3),
        path_keys=[step.node_key for step in res.trace],
        tree_snapshot=snapshot,
    )


@router.post("/adsa/sync", tags=["ADSA"])
def sync_trees(service: ProductService = Depends(get_service)) -> Dict[str, Any]:
    """Manually trigger full synchronization of all in-memory trees from SQLite."""
    t_start = time.perf_counter()
    count = service.rebuild_indexes()
    elapsed_ms = (time.perf_counter() - t_start) * 1000.0
    return {
        "status": "synchronized",
        "node_count": count,
        "sync_time_ms": round(elapsed_ms, 2),
    }


@router.post("/benchmark", response_model=BenchmarkResponse, tags=["ADSA"])
def run_benchmark(
    req: BenchmarkRequest,
) -> BenchmarkResponse:
    """Run rigorous benchmark comparison between custom BST and AVL on synthetic datasets."""
    try:
        return run_rigorous_benchmark(req)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )

