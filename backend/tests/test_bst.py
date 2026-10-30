"""Comprehensive tests for custom Binary Search Tree (BST)."""

import pytest
from backend.algorithms.bst import BinarySearchTree, BSTNode, SearchResult


def test_bst_empty_tree():
    """Verify empty tree initialization and edge cases."""
    bst = BinarySearchTree[int, str]()
    assert bst.is_empty() is True
    assert bst.size() == 0
    assert len(bst) == 0
    assert bst.get_height() == -1
    assert bst.find_min() is None
    assert bst.find_max() is None
    assert bst.inorder() == []
    assert bst.preorder() == []
    assert bst.postorder() == []
    assert bst.keys() == []
    assert bst.values() == []
    assert bst.delete(100) is False

    res = bst.search(42)
    assert res.found is False
    assert res.comparisons == 0
    assert len(res.trace) == 0


def test_bst_single_node():
    """Verify single node tree behavior and height convention (height = 0)."""
    bst = BinarySearchTree[int, str]()
    assert bst.insert(50, "root_product") is True
    assert bst.is_empty() is False
    assert bst.size() == 1
    assert len(bst) == 1
    assert bst.get_height() == 0
    assert bst.find_min() == (50, "root_product")
    assert bst.find_max() == (50, "root_product")

    # Search hit
    res = bst.search(50)
    assert res.found is True
    assert res.value == "root_product"
    assert res.comparisons == 1
    assert len(res.trace) == 1
    assert res.trace[0].comparison == "EXACT_MATCH"

    # Search miss
    res_miss = bst.search(25)
    assert res_miss.found is False
    assert res_miss.comparisons == 1
    assert len(res_miss.trace) == 2
    assert res_miss.trace[0].comparison == "LEFT"
    assert res_miss.trace[1].comparison == "NOT_FOUND"


def test_bst_insert_multiple_and_inorder_sorted():
    """Verify insertions preserve sorted order in inorder traversal."""
    bst = BinarySearchTree[int, str]()
    keys = [50, 30, 70, 20, 40, 60, 80]
    for k in keys:
        assert bst.insert(k, f"prod_{k}") is True

    assert bst.size() == 7
    assert bst.get_height() == 2
    assert bst.keys() == [20, 30, 40, 50, 60, 70, 80]
    assert bst.find_min() == (20, "prod_20")
    assert bst.find_max() == (80, "prod_80")

    # Preorder and Postorder checks
    assert [k for k, _ in bst.preorder()] == [50, 30, 20, 40, 70, 60, 80]
    assert [k for k, _ in bst.postorder()] == [20, 40, 30, 60, 80, 70, 50]


def test_bst_duplicate_key_handling():
    """Verify duplicate keys update existing value without creating duplicate nodes."""
    bst = BinarySearchTree[int, str]()
    assert bst.insert(100, "original_v1") is True
    assert bst.size() == 1

    # Insert same key with new value
    assert bst.insert(100, "updated_v2") is False
    assert bst.size() == 1
    assert bst.get(100) == "updated_v2"
    assert bst.keys() == [100]


def test_bst_deletion_leaf_node():
    """Case 1: Deletion of a leaf node (0 children)."""
    bst = BinarySearchTree[int, str]()
    for k in [50, 30, 70, 20]:
        bst.insert(k, f"v_{k}")

    # Delete leaf node 20
    assert bst.delete(20) is True
    assert bst.size() == 3
    assert 20 not in bst
    assert bst.keys() == [30, 50, 70]
    # Height should adjust
    assert bst.get_height() == 1


def test_bst_deletion_single_child_node():
    """Case 2: Deletion of a node with one child (left or right)."""
    bst = BinarySearchTree[int, str]()
    for k in [50, 30, 70, 20, 60]:
        bst.insert(k, f"v_{k}")

    # Node 30 has only one child (20)
    assert bst.delete(30) is True
    assert bst.size() == 4
    assert 30 not in bst
    assert bst.keys() == [20, 50, 60, 70]
    assert bst.get(20) == "v_20"

    # Node 70 has only one child (60)
    assert bst.delete(70) is True
    assert bst.size() == 3
    assert 70 not in bst
    assert bst.keys() == [20, 50, 60]


def test_bst_deletion_two_children_node():
    """Case 3: Deletion of a node with two children (inorder successor replacement)."""
    bst = BinarySearchTree[int, str]()
    for k in [50, 30, 70, 20, 40, 60, 80]:
        bst.insert(k, f"v_{k}")

    # Node 30 has two children (20 and 40). Inorder successor is 40.
    assert bst.delete(30) is True
    assert bst.size() == 6
    assert 30 not in bst
    assert bst.keys() == [20, 40, 50, 60, 70, 80]
    assert bst.get(40) == "v_40"


def test_bst_deletion_root_node():
    """Verify deleting the root node across various child configurations."""
    # Root with two children
    bst = BinarySearchTree[int, str]()
    for k in [50, 30, 70, 20, 40]:
        bst.insert(k, f"v_{k}")

    assert bst.delete(50) is True
    assert bst.size() == 4
    assert 50 not in bst
    assert bst.keys() == [20, 30, 40, 70]

    # Delete down to empty tree
    assert bst.delete(70) is True
    assert bst.delete(40) is True
    assert bst.delete(20) is True
    assert bst.delete(30) is True
    assert bst.size() == 0
    assert bst.is_empty() is True
    assert bst.root is None
    assert bst.get_height() == -1


def test_bst_search_trace_and_comparison_counts():
    """Verify exact comparison counts and step-by-step path trace."""
    bst = BinarySearchTree[int, str]()
    for k in [50, 25, 75, 10, 30]:
        bst.insert(k, f"v_{k}")

    # Search for 30: 50 -> LEFT -> 25 -> RIGHT -> 30 -> EXACT_MATCH
    res = bst.search(30)
    assert res.found is True
    assert res.comparisons == 3
    assert len(res.trace) == 3
    assert res.trace[0].node_key == 50 and res.trace[0].comparison == "LEFT" and res.trace[0].depth == 0
    assert res.trace[1].node_key == 25 and res.trace[1].comparison == "RIGHT" and res.trace[1].depth == 1
    assert res.trace[2].node_key == 30 and res.trace[2].comparison == "EXACT_MATCH" and res.trace[2].depth == 2


def test_bst_large_skewed_ascending_sequence_without_recursion_overflow():
    """Verify that BST supports deep O(n) skewed sequences without RecursionError.

    Inserting 2,000 sequentially ascending keys produces an unbalanced right-skewed
    chain of depth 1,999. Iterative operations must handle this cleanly.
    """
    bst = BinarySearchTree[int, int]()
    n = 2000
    for i in range(1, n + 1):
        bst.insert(i, i * 10)

    assert bst.size() == n
    assert bst.get_height() == n - 1  # 1999 levels deep
    assert bst.find_min() == (1, 10)
    assert bst.find_max() == (n, n * 10)

    # Search at the very bottom
    res = bst.search(n)
    assert res.found is True
    assert res.comparisons == n
    assert res.value == n * 10

    # Inorder traversal of entire large skewed chain
    keys = bst.keys()
    assert len(keys) == n
    assert keys == list(range(1, n + 1))

    # Delete bottom node
    assert bst.delete(n) is True
    assert bst.size() == n - 1
    assert bst.get_height() == n - 2
