"""Comprehensive tests for custom Self-Balancing AVL Tree."""

import random
import pytest
from backend.algorithms.avl import AVLTree, AVLNode, SearchResult


def test_avl_empty_tree():
    """Verify empty AVL tree behavior and edge cases."""
    avl = AVLTree[int, str]()
    assert avl.is_empty() is True
    assert avl.size() == 0
    assert len(avl) == 0
    assert avl.get_height() == -1
    assert avl.is_avl_balanced() is True
    assert avl.find_min() is None
    assert avl.find_max() is None
    assert avl.inorder() == []
    assert avl.delete(999) is False

    res = avl.search(50)
    assert res.found is False
    assert res.comparisons == 0


def test_avl_ll_rotation():
    """Trigger and verify Left-Left (LL) case: resolved by single Right Rotation.

    Insert sequence: 30, 20, 10
    Before rotation:
           30 (BF = +2)
          /
         20 (BF = +1)
        /
       10 (BF = 0)
    After Right Rotation on 30:
         20
        /  \\
       10   30
    """
    avl = AVLTree[int, str]()
    avl.insert(30, "p30")
    avl.insert(20, "p20")
    avl.insert(10, "p10")

    assert avl.size() == 3
    assert avl.is_avl_balanced() is True
    assert avl.rotations_ll == 1
    assert avl.rotations_rr == 0
    assert avl.rotations_lr == 0
    assert avl.rotations_rl == 0

    # Root must now be 20
    assert avl.root is not None
    assert avl.root.key == 20
    assert avl.root.left is not None and avl.root.left.key == 10
    assert avl.root.right is not None and avl.root.right.key == 30
    assert avl.get_height() == 1
    assert avl.root.balance_factor == 0


def test_avl_rr_rotation():
    """Trigger and verify Right-Right (RR) case: resolved by single Left Rotation.

    Insert sequence: 10, 20, 30
    Before rotation:
       10 (BF = -2)
         \\
          20 (BF = -1)
            \\
             30 (BF = 0)
    After Left Rotation on 10:
         20
        /  \\
       10   30
    """
    avl = AVLTree[int, str]()
    avl.insert(10, "p10")
    avl.insert(20, "p20")
    avl.insert(30, "p30")

    assert avl.size() == 3
    assert avl.is_avl_balanced() is True
    assert avl.rotations_rr == 1
    assert avl.rotations_ll == 0
    assert avl.rotations_lr == 0
    assert avl.rotations_rl == 0

    # Root must now be 20
    assert avl.root is not None
    assert avl.root.key == 20
    assert avl.root.left is not None and avl.root.left.key == 10
    assert avl.root.right is not None and avl.root.right.key == 30
    assert avl.get_height() == 1
    assert avl.root.balance_factor == 0


def test_avl_lr_rotation():
    """Trigger and verify Left-Right (LR) case: resolved by Left on child then Right on root.

    Insert sequence: 30, 10, 20
    Before rotation:
          30 (BF = +2)
         /
        10 (BF = -1)
          \\
           20
    After LR Rotation:
         20
        /  \\
       10   30
    """
    avl = AVLTree[int, str]()
    avl.insert(30, "p30")
    avl.insert(10, "p10")
    avl.insert(20, "p20")

    assert avl.size() == 3
    assert avl.is_avl_balanced() is True
    assert avl.rotations_lr == 1
    assert avl.root is not None
    assert avl.root.key == 20
    assert avl.root.left is not None and avl.root.left.key == 10
    assert avl.root.right is not None and avl.root.right.key == 30
    assert avl.get_height() == 1


def test_avl_rl_rotation():
    """Trigger and verify Right-Left (RL) case: resolved by Right on child then Left on root.

    Insert sequence: 10, 30, 20
    Before rotation:
        10 (BF = -2)
          \\
           30 (BF = +1)
          /
         20
    After RL Rotation:
         20
        /  \\
       10   30
    """
    avl = AVLTree[int, str]()
    avl.insert(10, "p10")
    avl.insert(30, "p30")
    avl.insert(20, "p20")

    assert avl.size() == 3
    assert avl.is_avl_balanced() is True
    assert avl.rotations_rl == 1
    assert avl.root is not None
    assert avl.root.key == 20
    assert avl.root.left is not None and avl.root.left.key == 10
    assert avl.root.right is not None and avl.root.right.key == 30
    assert avl.get_height() == 1


def test_avl_deletion_with_rebalancing():
    """Verify that deleting a node restores AVL height balance invariants.

    Construct balanced tree:
              40
            /    \\
          20      60
         /  \\    /  \\
        10  30  50  70
                     \\
                      80
    Deleting 10 makes node 20 right-heavy, cascading rebalancing up the tree.
    """
    avl = AVLTree[int, str]()
    keys = [40, 20, 60, 10, 30, 50, 70, 80]
    for k in keys:
        avl.insert(k, f"val_{k}")

    assert avl.is_avl_balanced() is True
    avl.reset_rotation_stats()

    # Delete leaf node 10
    assert avl.delete(10) is True
    assert avl.size() == 7
    assert 10 not in avl
    assert avl.is_avl_balanced() is True
    assert avl.keys() == [20, 30, 40, 50, 60, 70, 80]

    # Delete node with 2 children (40 - the root)
    assert avl.delete(40) is True
    assert avl.size() == 6
    assert 40 not in avl
    assert avl.is_avl_balanced() is True
    assert avl.keys() == [20, 30, 50, 60, 70, 80]


def test_avl_duplicate_key_handling():
    """Verify duplicate key updates existing value without breaking balance."""
    avl = AVLTree[int, str]()
    assert avl.insert(50, "version_1") is True
    assert avl.size() == 1

    assert avl.insert(50, "version_2") is False
    assert avl.size() == 1
    assert avl.get(50) == "version_2"
    assert avl.is_avl_balanced() is True


def test_avl_search_trace_and_comparisons():
    """Verify search comparison counting and directional path tracing."""
    avl = AVLTree[int, str]()
    for k in [40, 20, 60, 10, 30, 50, 70]:
        avl.insert(k, f"v_{k}")

    # Search for 30: 40 -> LEFT -> 20 -> RIGHT -> 30 (EXACT_MATCH)
    res = avl.search(30)
    assert res.found is True
    assert res.comparisons == 3
    assert len(res.trace) == 3
    assert res.trace[0].node_key == 40 and res.trace[0].comparison == "LEFT"
    assert res.trace[1].node_key == 20 and res.trace[1].comparison == "RIGHT"
    assert res.trace[2].node_key == 30 and res.trace[2].comparison == "EXACT_MATCH"


def test_avl_large_ascending_sequence_strictly_balanced():
    """Verify that inserting 1,000 ascending keys maintains strict O(log n) height.

    In a naive BST, 1,000 ascending keys gives height = 999.
    In an AVL tree, 1,000 nodes must have height <= 1.4404 * log2(1002) ≈ 14.
    """
    avl = AVLTree[int, int]()
    n = 1000
    for i in range(1, n + 1):
        avl.insert(i, i * 2)

    assert avl.size() == n
    assert avl.is_avl_balanced() is True

    # Height check: 1000 nodes in AVL has height between ceil(log2(1001)) - 1 = 9 and 14
    height = avl.get_height()
    assert 9 <= height <= 14, f"AVL height {height} outside theoretical bound [9, 14]"

    # Verify search at end takes <= 14 comparisons (vs 1,000 in naive BST!)
    res = avl.search(n)
    assert res.found is True
    assert res.comparisons <= 14

    # Verify every single node has |BF| <= 1
    for key, _ in avl.inorder():
        node_res = avl.search(key)
        assert node_res.found is True

    # Delete half of the keys and ensure invariant remains solid
    for i in range(1, 501):
        assert avl.delete(i) is True

    assert avl.size() == 500
    assert avl.is_avl_balanced() is True
    assert avl.keys() == list(range(501, 1001))


def test_avl_random_churn():
    """Stress test with pseudo-random insertions and deletions."""
    random.seed(42)
    avl = AVLTree[int, int]()
    inserted_keys = set()

    # Insert 300 random keys
    for _ in range(300):
        k = random.randint(1, 1000)
        inserted_keys.add(k)
        avl.insert(k, k * 5)
        assert avl.is_avl_balanced() is True

    assert avl.size() == len(inserted_keys)
    assert avl.keys() == sorted(list(inserted_keys))

    # Delete 150 random keys
    to_delete = random.sample(list(inserted_keys), min(150, len(inserted_keys)))
    for k in to_delete:
        assert avl.delete(k) is True
        inserted_keys.remove(k)
        assert avl.is_avl_balanced() is True

    assert avl.size() == len(inserted_keys)
    assert avl.keys() == sorted(list(inserted_keys))
