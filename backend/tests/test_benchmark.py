import math
import pytest
from fastapi.testclient import TestClient

from backend.algorithms.benchmark_engine import (
    compute_theoretical_bounds,
    generate_benchmark_dataset,
    get_theoretical_complexity_matrix,
    run_rigorous_benchmark,
)
from backend.api.schemas import BenchmarkRequest
from backend.main import app


@pytest.fixture
def client():
    """TestClient for FastAPI app."""
    return TestClient(app)


# -----------------------------------------------------------------------------
# 1. Dataset Generation and Reproducibility Tests
# -----------------------------------------------------------------------------

def test_dataset_reproducibility():
    """Identical seeds must produce identical key sequences."""
    keys_1 = generate_benchmark_dataset(1000, "random", seed=42)
    keys_2 = generate_benchmark_dataset(1000, "random", seed=42)
    keys_diff_seed = generate_benchmark_dataset(1000, "random", seed=99)

    assert keys_1 == keys_2
    assert keys_1 != keys_diff_seed
    assert len(keys_1) == 1000
    assert len(set(keys_1)) == 1000


def test_supported_insertion_orders():
    """Test ascending, descending, and random ordering sequences."""
    asc = generate_benchmark_dataset(100, "ascending")
    assert asc == list(range(1, 101))
    assert asc[0] == 1 and asc[-1] == 100

    desc = generate_benchmark_dataset(100, "descending")
    assert desc == list(range(100, 0, -1))
    assert desc[0] == 100 and desc[-1] == 1

    rand = generate_benchmark_dataset(100, "random", seed=123)
    assert len(rand) == 100
    assert set(rand) == set(range(1, 101))
    assert rand != asc
    assert rand != desc


def test_all_supported_dataset_sizes():
    """Verify all required dataset sizes (100, 1000, 5000, 10000) generate correctly."""
    for size in (100, 1000, 5000, 10000):
        keys = generate_benchmark_dataset(size, "random", seed=42)
        assert len(keys) == size
        assert len(set(keys)) == size


def test_invalid_dataset_configurations():
    """Invalid dataset sizes and orders must raise ValueError."""
    with pytest.raises(ValueError, match="Unsupported dataset size"):
        generate_benchmark_dataset(50, "random")

    with pytest.raises(ValueError, match="Unsupported dataset size"):
        generate_benchmark_dataset(20000, "random")

    with pytest.raises(ValueError, match="Unsupported insertion order"):
        generate_benchmark_dataset(100, "zigzag")  # type: ignore


# -----------------------------------------------------------------------------
# 2. Benchmarking Engine Core Metrics Tests
# -----------------------------------------------------------------------------

def test_random_benchmark_metrics():
    """Verify metrics for random dataset with repetitions and timing validation."""
    req = BenchmarkRequest(
        dataset_size=100,
        insertion_order="random",
        repetitions=3,
        seed=42,
    )
    res = run_rigorous_benchmark(req)

    assert res.dataset_size == 100
    assert res.insertion_order == "random"
    assert res.random_seed == 42
    assert res.repetitions == 3
    assert res.warmup_runs == 1
    assert res.timing_unit == "ms"
    assert res.per_op_unit == "μs"
    assert res.timing_statistic == "median"

    # Invariants and heights
    assert res.avl_is_balanced is True
    assert res.bst_height > 0
    assert res.avl_height > 0
    assert res.avl_height <= res.avl_theoretical_height

    # Timings must be strictly positive
    assert res.bst_insert_time_ms > 0
    assert res.avl_insert_time_ms > 0
    assert res.bst_search_hit_time_ms >= 0
    assert res.avl_search_hit_time_ms >= 0
    assert res.bst_search_miss_time_ms >= 0
    assert res.avl_search_miss_time_ms >= 0
    assert res.bst_delete_time_ms >= 0
    assert res.avl_delete_time_ms >= 0

    # Search hit vs miss status
    assert res.search_hit_found is True
    assert res.search_miss_found is False
    assert res.deletion_found is True
    assert res.bst_search_hit_comparisons > 0
    assert res.avl_search_hit_comparisons > 0
    assert res.bst_search_miss_comparisons > 0
    assert res.avl_search_miss_comparisons > 0

    # Metrics list contains all 4 operations
    assert len(res.metrics) == 4
    ops = {m.operation for m in res.metrics}
    assert ops == {"insertion", "search_hit", "search_miss", "deletion"}


def test_skewed_ascending_benchmark_height_degradation():
    """Ascending insertion must cause naive BST to degrade into height N - 1,

    while AVL maintains strict O(log N) balanced height.
    """
    req = BenchmarkRequest(
        dataset_size=1000,
        insertion_order="ascending",
        repetitions=2,
        seed=42,
    )
    res = run_rigorous_benchmark(req)

    # In ascending insertion, naive BST degenerates completely
    assert res.bst_height == 999  # N - 1
    assert res.bst_theoretical_height == 999

    # AVL strictly maintains height <= 1.44 log2(N + 2)
    assert res.avl_height <= res.avl_theoretical_height
    assert res.avl_height <= 14
    assert res.avl_is_balanced is True
    assert res.avl_rotations["total"] > 0
    assert res.avl_rotations["RR"] > 0  # Ascending creates right-heavy, fixed by RR / Left rotations

    # Search comparison counts: BST search must take hundreds of comparisons, AVL takes <= 14
    assert res.bst_search_hit_comparisons > res.avl_search_hit_comparisons
    assert res.bst_search_hit_comparisons >= 400
    assert res.avl_search_hit_comparisons <= 14


def test_skewed_descending_benchmark_height_degradation():
    """Descending insertion must degrade naive BST to height N - 1 and LL rotations on AVL."""
    req = BenchmarkRequest(
        dataset_size=1000,
        insertion_order="descending",
        repetitions=2,
        seed=42,
    )
    res = run_rigorous_benchmark(req)

    assert res.bst_height == 999
    assert res.avl_height <= res.avl_theoretical_height
    assert res.avl_is_balanced is True
    assert res.avl_rotations["LL"] > 0  # Descending creates left-heavy, fixed by LL / Right rotations


def test_theoretical_bounds_clean_separation():
    """Theoretical complexity bounds must be cleanly separated from measured empirical heights."""
    bst_bound, avl_bound = compute_theoretical_bounds(10000, "ascending")
    assert bst_bound == 9999
    assert avl_bound == int(1.4404 * math.log2(10002) - 0.328)

    matrix = get_theoretical_complexity_matrix()
    assert len(matrix) == 2
    bst_meta = next(m for m in matrix if "BST" in m.structure)
    avl_meta = next(m for m in matrix if "AVL" in m.structure)
    assert bst_meta.search_worst == "O(n)"
    assert avl_meta.search_worst == "O(log n)"


def test_raw_samples_inclusion():
    """When include_raw_samples is True, individual sample arrays must be returned."""
    req = BenchmarkRequest(
        dataset_size=100,
        insertion_order="random",
        repetitions=3,
        include_raw_samples=True,
    )
    res = run_rigorous_benchmark(req)
    assert res.raw_samples is not None
    assert "bst_insert_ms" in res.raw_samples
    assert len(res.raw_samples["bst_insert_ms"]) == 3
    assert "avl_insert_ms" in res.raw_samples
    assert len(res.raw_samples["avl_insert_ms"]) == 3


# -----------------------------------------------------------------------------
# 3. HTTP API Endpoint Tests
# -----------------------------------------------------------------------------

def test_api_benchmark_success(client: TestClient):
    """Test POST /api/benchmark standard payload."""
    payload = {
        "dataset_size": 1000,
        "insertion_order": "random",
        "repetitions": 3,
        "seed": 77,
    }
    response = client.post("/api/benchmark", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["dataset_size"] == 1000
    assert data["insertion_order"] == "random"
    assert data["random_seed"] == 77
    assert data["timing_unit"] == "ms"
    assert data["per_op_unit"] == "μs"
    assert data["avl_is_balanced"] is True
    assert "metrics" in data
    assert len(data["metrics"]) == 4
    assert "theoretical_complexity" in data
    assert "interpretation" in data


def test_api_benchmark_unsupported_size_rejected(client: TestClient):
    """Dataset size not in {100, 1000, 5000, 10000} must be rejected with 422."""
    response = client.post("/api/benchmark", json={
        "dataset_size": 250,
        "insertion_order": "random",
    })
    assert response.status_code == 422
    assert "Unsupported dataset size" in response.text


def test_api_benchmark_invalid_order_rejected(client: TestClient):
    """Invalid insertion order string must be rejected with 422."""
    response = client.post("/api/benchmark", json={
        "dataset_size": 1000,
        "insertion_order": "invalid_order",
    })
    assert response.status_code == 422


def test_api_benchmark_invalid_target_key_rejected(client: TestClient):
    """Negative target key must be rejected with 422."""
    response = client.post("/api/benchmark", json={
        "dataset_size": 100,
        "insertion_order": "random",
        "target_key": -5,
    })
    assert response.status_code == 422
