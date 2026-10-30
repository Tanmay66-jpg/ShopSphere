"""Custom Self-Balancing AVL Tree implementation for ShopSphere.

This module provides a pure, genuine Python implementation of a Height-Balanced
AVL (Adelson-Velsky and Landis) Tree.

Height and Balance Factor Convention:
    - An empty tree (None) has height -1.
    - A leaf node has height 0.
    - For any node: height = 1 + max(height(left), height(right)).
    - Balance Factor (BF) = height(left) - height(right).
    - AVL Balance Invariant: For EVERY node in the tree, abs(balance_factor) <= 1,
      meaning balance_factor in {-1, 0, +1}.

Rotation Cases:
    - LL Case: Node is left-heavy (BF > 1) and its left child has BF >= 0.
      Resolved by a single Right Rotation.
    - RR Case: Node is right-heavy (BF < -1) and its right child has BF <= 0.
      Resolved by a single Left Rotation.
    - LR Case: Node is left-heavy (BF > 1) and its left child has BF < 0.
      Resolved by Left Rotation on left child, followed by Right Rotation on Node.
    - RL Case: Node is right-heavy (BF < -1) and its right child has BF > 0.
      Resolved by Right Rotation on right child, followed by Left Rotation on Node.

Time Complexity Analysis:
    - Search: O(log n) guaranteed.
    - Insertion: O(log n) guaranteed (at most 2 rotations needed per insertion).
    - Deletion: O(log n) guaranteed (may require O(log n) rotations up the path).
    - Maximum Height Bound: <= 1.4404 * log2(n + 2) - 0.328.
    - Traversals (Inorder, Preorder, Postorder): O(n).
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Dict, Generic, List, Literal, Optional, Tuple, TypeVar

K = TypeVar("K")
V = TypeVar("V")


@dataclass
class TraceStep:
    """Represents a single step taken during a tree search traversal."""

    node_key: Any
    comparison: Literal["ROOT", "LEFT", "RIGHT", "EXACT_MATCH", "NOT_FOUND"]
    depth: int


@dataclass
class SearchResult(Generic[V]):
    """Encapsulates the outcome of a search operation."""

    found: bool
    key: Any
    value: Optional[V] = None
    comparisons: int = 0
    trace: List[TraceStep] = field(default_factory=list)


class AVLNode(Generic[K, V]):
    """A node in the AVL Tree."""

    __slots__ = ("key", "value", "left", "right", "height")

    def __init__(self, key: K, value: Optional[V] = None) -> None:
        self.key: K = key
        self.value: Optional[V] = value
        self.left: Optional[AVLNode[K, V]] = None
        self.right: Optional[AVLNode[K, V]] = None
        self.height: int = 0

    @property
    def left_height(self) -> int:
        return self.left.height if self.left is not None else -1

    @property
    def right_height(self) -> int:
        return self.right.height if self.right is not None else -1

    @property
    def balance_factor(self) -> int:
        """Convention: BF = height(left) - height(right)."""
        return self.left_height - self.right_height

    def update_height(self) -> None:
        """Recalculate height based on child heights."""
        self.height = 1 + max(self.left_height, self.right_height)

    def to_dict(self, max_depth: int = 6, current_depth: int = 0) -> Optional[dict[str, Any]]:
        """Serialize node and subtrees into a dictionary for JSON/visualization APIs."""
        if current_depth > max_depth:
            return None
        return {
            "key": self.key,
            "value": self.value,
            "height": self.height,
            "balance_factor": self.balance_factor,
            "left": self.left.to_dict(max_depth, current_depth + 1) if self.left else None,
            "right": self.right.to_dict(max_depth, current_depth + 1) if self.right else None,
        }

    def __repr__(self) -> str:
        return f"AVLNode(key={self.key!r}, h={self.height}, bf={self.balance_factor})"


class AVLTree(Generic[K, V]):
    """Custom Self-Balancing AVL Tree."""

    def __init__(self) -> None:
        self.root: Optional[AVLNode[K, V]] = None
        self._size: int = 0

        # Detailed rotation telemetry for academic verification
        self.rotations_ll: int = 0
        self.rotations_rr: int = 0
        self.rotations_lr: int = 0
        self.rotations_rl: int = 0

    def is_empty(self) -> bool:
        """Return True if tree has no nodes."""
        return self.root is None

    def size(self) -> int:
        """Return total number of nodes in tree."""
        return self._size

    def __len__(self) -> int:
        return self._size

    def get_height(self) -> int:
        """Return tree height (-1 for empty tree, 0 for single node)."""
        return self.root.height if self.root is not None else -1

    @property
    def total_rotations(self) -> int:
        return self.rotations_ll + self.rotations_rr + self.rotations_lr + self.rotations_rl

    def get_rotation_stats(self) -> Dict[str, int]:
        """Return breakdown of rotation counts."""
        return {
            "LL": self.rotations_ll,
            "RR": self.rotations_rr,
            "LR": self.rotations_lr,
            "RL": self.rotations_rl,
            "total": self.total_rotations,
        }

    def reset_rotation_stats(self) -> None:
        """Reset rotation telemetry counters."""
        self.rotations_ll = 0
        self.rotations_rr = 0
        self.rotations_lr = 0
        self.rotations_rl = 0

    # -------------------------------------------------------------------------
    # Rotations & Rebalancing
    # -------------------------------------------------------------------------

    def _rotate_right(self, y: AVLNode[K, V]) -> AVLNode[K, V]:
        """Perform a single Right Rotation.

              y                   x
             / \\                 / \\
            x   T3     =>       T1   y
           / \\                     / \\
          T1  T2                   T2  T3
        """
        x = y.left
        assert x is not None
        T2 = x.right

        # Perform rotation
        x.right = y
        y.left = T2

        # Update heights (y first, then x)
        y.update_height()
        x.update_height()

        return x

    def _rotate_left(self, x: AVLNode[K, V]) -> AVLNode[K, V]:
        """Perform a single Left Rotation.

            x                     y
           / \\                   / \\
          T1   y       =>        x   T3
              / \\              / \\
             T2  T3            T1  T2
        """
        y = x.right
        assert y is not None
        T2 = y.left

        # Perform rotation
        y.left = x
        x.right = T2

        # Update heights (x first, then y)
        x.update_height()
        y.update_height()

        return y

    def _rebalance(self, node: AVLNode[K, V]) -> AVLNode[K, V]:
        """Check balance factor and restore AVL invariant if necessary.

        Returns:
            The root node of this subtree after rebalancing.
        """
        node.update_height()
        bf = node.balance_factor

        # Left Heavy (BF > 1)
        if bf > 1:
            assert node.left is not None
            if node.left.balance_factor >= 0:
                # LL Case: Single right rotation
                self.rotations_ll += 1
                return self._rotate_right(node)
            else:
                # LR Case: Left rotation on left child, then right rotation on node
                self.rotations_lr += 1
                node.left = self._rotate_left(node.left)
                return self._rotate_right(node)

        # Right Heavy (BF < -1)
        if bf < -1:
            assert node.right is not None
            if node.right.balance_factor <= 0:
                # RR Case: Single left rotation
                self.rotations_rr += 1
                return self._rotate_left(node)
            else:
                # RL Case: Right rotation on right child, then left rotation on node
                self.rotations_rl += 1
                node.right = self._rotate_right(node.right)
                return self._rotate_left(node)

        return node

    # -------------------------------------------------------------------------
    # Insertion
    # -------------------------------------------------------------------------

    def insert(self, key: K, value: Optional[V] = None) -> bool:
        """Insert a key-value pair into the AVL tree.

        Restores the AVL balance invariant (|BF| <= 1) on all ancestor nodes.

        Duplicate key behavior:
            If key already exists, updates value and returns False (no new node).
            If key is new, inserts, rebalances, increments size, and returns True.
        """
        initial_size = self._size
        self.root = self._insert_recursive(self.root, key, value)
        return self._size > initial_size

    def _insert_recursive(
        self, node: Optional[AVLNode[K, V]], key: K, value: Optional[V]
    ) -> AVLNode[K, V]:
        """Recursive helper for AVL insertion."""
        if node is None:
            self._size += 1
            return AVLNode(key, value)

        if key == node.key:
            # Duplicate key: update value payload
            node.value = value
            return node
        elif key < node.key:
            node.left = self._insert_recursive(node.left, key, value)
        else:
            node.right = self._insert_recursive(node.right, key, value)

        # Update height and rebalance on the path back up
        return self._rebalance(node)

    # -------------------------------------------------------------------------
    # Deletion
    # -------------------------------------------------------------------------

    def delete(self, key: K) -> bool:
        """Delete a key from the AVL tree and restore balance invariants.

        Handles all deletion cases:
            - Leaf node
            - Node with 1 child
            - Node with 2 children (replaces with inorder successor)

        Returns:
            True if key was found and deleted, False otherwise.
        """
        initial_size = self._size
        self.root = self._delete_recursive(self.root, key)
        return self._size < initial_size

    def _delete_recursive(
        self, node: Optional[AVLNode[K, V]], key: K
    ) -> Optional[AVLNode[K, V]]:
        """Recursive helper for AVL deletion with rebalancing."""
        if node is None:
            return None

        if key < node.key:
            node.left = self._delete_recursive(node.left, key)
        elif key > node.key:
            node.right = self._delete_recursive(node.right, key)
        else:
            # Node found! Handle deletion cases
            self._size -= 1

            # Case 1 (leaf) or Case 2 (one child)
            if node.left is None:
                return node.right
            elif node.right is None:
                return node.left

            # Case 3: Node with two children
            # Find inorder successor: smallest in right subtree
            successor = self._min_node(node.right)
            node.key = successor.key
            node.value = successor.value

            # Delete successor from right subtree (note: restore _size decrement)
            self._size += 1  # Offset inner delete decrement so overall count is correct
            node.right = self._delete_recursive(node.right, successor.key)

        if node is None:
            return None

        # Restore height and rebalance on the way back up
        return self._rebalance(node)

    def _min_node(self, node: AVLNode[K, V]) -> AVLNode[K, V]:
        current = node
        while current.left is not None:
            current = current.left
        return current

    # -------------------------------------------------------------------------
    # Search
    # -------------------------------------------------------------------------

    def search(self, key: K) -> SearchResult[V]:
        """Search for a key in the AVL tree, counting comparisons and tracing path."""
        result = SearchResult[V](found=False, key=key)
        if self.root is None:
            return result

        current = self.root
        depth = 0

        while current is not None:
            result.comparisons += 1
            if key == current.key:
                result.found = True
                result.value = current.value
                result.trace.append(TraceStep(node_key=current.key, comparison="EXACT_MATCH", depth=depth))
                return result
            elif key < current.key:
                result.trace.append(TraceStep(node_key=current.key, comparison="LEFT", depth=depth))
                current = current.left
            else:
                result.trace.append(TraceStep(node_key=current.key, comparison="RIGHT", depth=depth))
                current = current.right
            depth += 1

        result.trace.append(TraceStep(node_key=None, comparison="NOT_FOUND", depth=depth))
        return result

    def get(self, key: K) -> Optional[V]:
        """Convenience method returning value payload or None if key is absent."""
        res = self.search(key)
        return res.value if res.found else None

    def __contains__(self, key: K) -> bool:
        return self.search(key).found

    def find_min(self) -> Optional[Tuple[K, Optional[V]]]:
        """Return (key, value) of minimum key or None if empty."""
        if self.root is None:
            return None
        min_n = self._min_node(self.root)
        return min_n.key, min_n.value

    def find_max(self) -> Optional[Tuple[K, Optional[V]]]:
        """Return (key, value) of maximum key or None if empty."""
        if self.root is None:
            return None
        current = self.root
        while current.right is not None:
            current = current.right
        return current.key, current.value

    # -------------------------------------------------------------------------
    # Traversals
    # -------------------------------------------------------------------------

    def inorder(self) -> List[Tuple[K, Optional[V]]]:
        """Return (key, value) pairs in sorted order."""
        result: List[Tuple[K, Optional[V]]] = []
        stack: List[AVLNode[K, V]] = []
        current = self.root

        while current is not None or stack:
            while current is not None:
                stack.append(current)
                current = current.left
            current = stack.pop()
            result.append((current.key, current.value))
            current = current.right

        return result

    def preorder(self) -> List[Tuple[K, Optional[V]]]:
        """Return (key, value) pairs in preorder."""
        if self.root is None:
            return []

        result: List[Tuple[K, Optional[V]]] = []
        stack: List[AVLNode[K, V]] = [self.root]

        while stack:
            node = stack.pop()
            result.append((node.key, node.value))
            if node.right is not None:
                stack.append(node.right)
            if node.left is not None:
                stack.append(node.left)

        return result

    def postorder(self) -> List[Tuple[K, Optional[V]]]:
        """Return (key, value) pairs in postorder."""
        if self.root is None:
            return []

        stack1: List[AVLNode[K, V]] = [self.root]
        stack2: List[AVLNode[K, V]] = []

        while stack1:
            node = stack1.pop()
            stack2.append(node)
            if node.left is not None:
                stack1.append(node.left)
            if node.right is not None:
                stack1.append(node.right)

        result: List[Tuple[K, Optional[V]]] = []
        while stack2:
            node = stack2.pop()
            result.append((node.key, node.value))

        return result

    def keys(self) -> List[K]:
        """Return all keys in sorted order."""
        return [k for k, _ in self.inorder()]

    def values(self) -> List[Optional[V]]:
        """Return all values in inorder."""
        return [v for _, v in self.inorder()]

    def clear(self) -> None:
        """Clear all nodes from the tree."""
        self.root = None
        self._size = 0
        self.reset_rotation_stats()

    # -------------------------------------------------------------------------
    # Verification & Invariant Checking
    # -------------------------------------------------------------------------

    def is_avl_balanced(self) -> bool:
        """Validate that all AVL invariants are strictly maintained throughout the tree:

        1. Binary Search Tree ordering: For every node, left keys < node.key < right keys.
        2. Height correctness: node.height == 1 + max(left_height, right_height).
        3. Balance Factor Invariant: abs(node.balance_factor) <= 1 for EVERY node.
        """
        return self._validate_subtree(self.root, min_key=None, max_key=None)[0]

    def _validate_subtree(
        self,
        node: Optional[AVLNode[K, V]],
        min_key: Optional[K],
        max_key: Optional[K],
    ) -> Tuple[bool, int]:
        """Return (is_valid, height)."""
        if node is None:
            return True, -1

        # Check BST ordering
        if min_key is not None and node.key <= min_key:
            return False, -1
        if max_key is not None and node.key >= max_key:
            return False, -1

        # Validate subtrees
        left_valid, left_h = self._validate_subtree(node.left, min_key, node.key)
        if not left_valid:
            return False, -1

        right_valid, right_h = self._validate_subtree(node.right, node.key, max_key)
        if not right_valid:
            return False, -1

        # Check height correctness
        expected_h = 1 + max(left_h, right_h)
        if node.height != expected_h:
            return False, -1

        # Check AVL balance factor invariant
        bf = left_h - right_h
        if abs(bf) > 1:
            return False, -1

        return True, expected_h

    def to_dict(self, max_depth: int = 6) -> Optional[dict[str, Any]]:
        """Serialize tree root for API visualization."""
        if self.root is None:
            return None
        return self.root.to_dict(max_depth=max_depth)
