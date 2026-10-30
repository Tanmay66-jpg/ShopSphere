"""Pydantic schemas for ShopSphere FastAPI backend."""

from __future__ import annotations
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class ProductResponse(BaseModel):
    """Serialized product representation matching frontend Product interface."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    sku: str
    name: str
    normalized_name: str
    category: str
    description: str
    price: float
    price_paise: int
    stock_quantity: int
    is_available: bool
    image_url: str
    rating: float = 4.8
    rating_count: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None



class ProductCreate(BaseModel):
    """Payload schema for creating a new product."""

    sku: str = Field(..., min_length=1, max_length=64, description="Unique product SKU")
    name: str = Field(..., min_length=1, max_length=255, description="Product display name")
    category: str = Field(..., min_length=1, max_length=100, description="Product category")
    description: Optional[str] = Field("", max_length=2000)
    price: Optional[float] = Field(None, gt=0, description="Price in INR rupees")
    price_paise: Optional[int] = Field(None, gt=0, description="Explicit price in paise")
    stock_quantity: int = Field(0, ge=0, description="Stock inventory quantity")
    is_available: Optional[bool] = None
    image_url: Optional[str] = Field("", max_length=1000)
    rating: Optional[float] = Field(4.5, ge=0.0, le=5.0)
    rating_count: Optional[int] = Field(0, ge=0)

    @model_validator(mode="after")
    def validate_price_present(self) -> ProductCreate:
        if self.price is None and self.price_paise is None:
            raise ValueError("Either 'price' (in rupees) or 'price_paise' must be provided")
        return self


class ProductUpdate(BaseModel):
    """Payload schema for updating an existing product."""

    sku: Optional[str] = Field(None, min_length=1, max_length=64)
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=2000)
    price: Optional[float] = Field(None, gt=0)
    price_paise: Optional[int] = Field(None, gt=0)
    stock_quantity: Optional[int] = Field(None, ge=0)
    is_available: Optional[bool] = None
    image_url: Optional[str] = Field(None, max_length=1000)
    rating: Optional[float] = Field(None, ge=0.0, le=5.0)
    rating_count: Optional[int] = Field(None, ge=0)


class ProductFilterRequest(BaseModel):
    """Filter parameters for product search."""

    query: Optional[str] = ""
    searchBy: Optional[Literal["name", "id", "price", "sku"]] = "name"
    category: Optional[str] = "All Categories"
    minPrice: Optional[float] = None
    maxPrice: Optional[float] = None
    inStockOnly: Optional[bool] = False
    sortBy: Optional[str] = "id"
    tree_type: Optional[Literal["bst", "avl"]] = "avl"


class SearchResponseSchema(BaseModel):
    """Search results with algorithmic diagnostics."""

    results: List[ProductResponse]
    total_count: int
    search_key: str
    search_by: str
    comparisons: int
    execution_time_ms: float
    path: List[Any]


class HealthResponse(BaseModel):
    """Application readiness and health telemetry."""

    status: str
    service: str
    engine: str
    total_products: int
    diagnostics: Dict[str, Any]


class OperationTraceRequest(BaseModel):
    """Request payload for stepping through a tree search trace."""

    tree_type: Literal["bst", "avl"] = "avl"
    target_key: int | str
    max_nodes: Optional[int] = 50


class OperationTraceResponseSchema(BaseModel):
    """Detailed algorithmic trace of a tree search operation."""

    tree_type: str
    target_key: int | str
    found: bool
    comparisons: int
    execution_time_ms: float
    path_keys: List[Any]
    tree_snapshot: Optional[Dict[str, Any]] = None


class TreeStructureResponseSchema(BaseModel):
    """Hierarchical tree representation for ADSA Performance Lab."""

    tree_type: str
    root: Optional[Dict[str, Any]] = None
    total_nodes: int
    height: int
    is_balanced: bool


class BenchmarkRequest(BaseModel):
    """Request parameters for ADSA Performance Lab benchmark execution."""

    dataset_size: int = Field(1000, description="Dataset size: 100, 1000, 5000, 10000")
    insertion_order: Literal["random", "ascending", "descending"] = "random"
    repetitions: Optional[int] = Field(3, ge=1, le=10, description="Repetitions for statistical accuracy")
    iterations: Optional[int] = Field(None, description="Backwards compatibility alias for repetitions")
    seed: Optional[int] = Field(42, description="Deterministic random seed for reproducibility")
    target_key: Optional[int] = Field(None, description="Probe search key")
    include_raw_samples: Optional[bool] = Field(False, description="Include raw individual timing samples")

    @field_validator("dataset_size")
    @classmethod
    def validate_dataset_size(cls, v: int) -> int:
        if v not in {100, 1000, 5000, 10000}:
            raise ValueError(
                f"Unsupported dataset size: {v}. Supported sizes are: 100, 1000, 5000, 10000."
            )
        return v


class BenchmarkMetricsSchema(BaseModel):
    """Metrics comparing BST vs AVL performance for a single benchmark operation."""

    operation: Literal["search_hit", "search_miss", "insertion", "deletion"]
    dataset_size: int
    insertion_order: Literal["random", "ascending", "descending"]
    bst_time_ms: float
    avl_time_ms: float
    bst_per_op_us: float = 0.0
    avl_per_op_us: float = 0.0
    bst_comparisons: int
    avl_comparisons: int
    bst_height: int
    avl_height: int
    bst_max_theoretical_height: int
    avl_max_theoretical_height: int
    bst_min_time_ms: float = 0.0
    avl_min_time_ms: float = 0.0
    bst_median_time_ms: float = 0.0
    avl_median_time_ms: float = 0.0


class TheoreticalComplexityItem(BaseModel):
    """Theoretical asymptotic bounds for educational comparison."""

    structure: str
    search_avg: str
    search_worst: str
    insert_avg: str
    insert_worst: str
    delete_avg: str
    delete_worst: str
    height_avg: str
    height_worst: str
    balancing_invariant: str
    notes: str


class BenchmarkResponse(BaseModel):
    """Comprehensive benchmark report with rigorous timings, telemetry and complexity analysis."""

    dataset_size: int
    insertion_order: Literal["random", "ascending", "descending"]
    random_seed: int
    repetitions: int
    warmup_runs: int
    timing_unit: str = "ms"
    per_op_unit: str = "μs"
    timing_statistic: str = "median"
    timing_statistic_explanation: str

    bst_height: int
    avl_height: int
    bst_theoretical_height: int
    avl_theoretical_height: int
    avl_is_balanced: bool
    avl_rotations: Dict[str, int]

    search_target: int
    search_hit_found: bool
    search_miss_target: int
    search_miss_found: bool
    deletion_target: int
    deletion_found: bool

    bst_insert_time_ms: float
    avl_insert_time_ms: float
    bst_insert_per_op_us: float
    avl_insert_per_op_us: float

    bst_search_hit_time_ms: float
    avl_search_hit_time_ms: float
    bst_search_hit_per_op_us: float
    avl_search_hit_per_op_us: float
    bst_search_hit_comparisons: int
    avl_search_hit_comparisons: int

    bst_search_miss_time_ms: float
    avl_search_miss_time_ms: float
    bst_search_miss_per_op_us: float
    avl_search_miss_per_op_us: float
    bst_search_miss_comparisons: int
    avl_search_miss_comparisons: int

    bst_delete_time_ms: float
    avl_delete_time_ms: float
    bst_delete_per_op_us: float
    avl_delete_per_op_us: float
    bst_delete_comparisons: int
    avl_delete_comparisons: int

    metrics: List[BenchmarkMetricsSchema]
    theoretical_complexity: List[TheoreticalComplexityItem]
    interpretation: str
    raw_samples: Optional[Dict[str, Any]] = None

