"""Custom Binary Search Tree (BST) implementation for ShopSphere.

This module provides a pure, genuine Python implementation of an Unbalanced
Binary Search Tree suitable for academic algorithm demonstration and comparative
performance benchmarking against AVL trees.

Height Convention:
    - An empty tree has height -1.
    - A leaf node (node with no children) has height 0.
    - For any internal node: height = 1 + max(height(left), height(right)).

Worst-case Complexity Analysis:
    - Search: Average O(log n), Worst-case O(n) when keys are inserted in sorted order.
    - Insertion: Average O(log n), Worst-case O(n) under skewed conditions.
    - Deletion: Average O(log n), Worst-case O(n).
    - Traversals (Inorder, Preorder, Postorder): O(n).
    - Tree Height: O(log n) balanced, O(n) skewed.

Note:
    To avoid Python recursion limit crashes (RecursionError) when inserting
    or searching large skewed sequences (e.g. 5,000 to 10,000 sorted keys),
    all core operations are implemented iteratively with explicit stacks.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Generic, List, Literal, Optional, Tuple, TypeVar

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


class BSTNode(Generic[K, V]):
    """A node in the Binary Search Tree."""

    __slots__ = ("key", "value", "left", "right", "height")

    def __init__(self, key: K, value: Optional[V] = None) -> None:
        self.key: K = key
        self.value: Optional[V] = value
        self.left: Optional[BSTNode[K, V]] = None
        self.right: Optional[BSTNode[K, V]] = None
        self.height: int = 0

    def update_height(self) -> None:
        """Recalculate node height based on children heights."""
        left_h = self.left.height if self.left is not None else -1
        right_h = self.right.height if self.right is not None else -1
        self.height = 1 + max(left_h, right_h)

    def to_dict(self, max_depth: int = 6, current_depth: int = 0) -> Optional[dict[str, Any]]:
        """Serialize node and subtrees into a dictionary for JSON/visualization APIs."""
        if current_depth > max_depth:
            return None
        return {
            "key": self.key,
            "value": self.value,
            "height": self.height,
            "balance_factor": (self.left.height if self.left else -1) - (self.right.height if self.right else -1),
            "left": self.left.to_dict(max_depth, current_depth + 1) if self.left else None,
            "right": self.right.to_dict(max_depth, current_depth + 1) if self.right else None,
        }

    def __repr__(self) -> str:
        return f"BSTNode(key={self.key!r}, height={self.height})"


class BinarySearchTree(Generic[K, V]):
    """Custom Unbalanced Binary Search Tree.

    Does NOT perform automatic balancing, intentionally allowing demonstration
    of degenerate O(n) skew when keys are inserted in sorted order.
    """

    def __init__(self) -> None:
        self.root: Optional[BSTNode[K, V]] = None
        self._size: int = 0

    def is_empty(self) -> bool:
        """Return True if the tree has no nodes."""
        return self.root is None

    def size(self) -> int:
        """Return total number of nodes in the tree."""
        return self._size

    def __len__(self) -> int:
        return self._size

    def get_height(self) -> int:
        """Return tree height.

        Height Convention:
            Empty tree = -1
            Single node = 0
        """
        return self.root.height if self.root is not None else -1

    def insert(self, key: K, value: Optional[V] = None) -> bool:
        """Insert a key-value pair into the BST iteratively.

        Duplicate key behavior:
            If key already exists, updates its value and returns False (no new node).
            If key is new, inserts a new leaf node, updates heights along the path,
            increments size, and returns True.
        """
        if self.root is None:
            self.root = BSTNode(key, value)
            self._size = 1
            return True

        current = self.root
        path: List[BSTNode[K, V]] = []

        while current is not None:
            path.append(current)
            if key == current.key:
                # Key already exists: update payload and maintain tree structure
                current.value = value
                return False
            elif key < current.key:
                if current.left is None:
                    current.left = BSTNode(key, value)
                    self._size += 1
                    break
                current = current.left
            else:
                if current.right is None:
                    current.right = BSTNode(key, value)
                    self._size += 1
                    break
                current = current.right

        # Update node heights iteratively bottom-up along the insertion path
        for node in reversed(path):
            node.update_height()

        return True

    def search(self, key: K) -> SearchResult[V]:
        """Search for a key in the BST, recording comparison counts and path trace.

        Returns:
            SearchResult containing found flag, value payload, comparisons count,
            and complete trace of visited nodes.
        """
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
        """Return (key, value) of the minimum key, or None if empty."""
        if self.root is None:
            return None
        current = self.root
        while current.left is not None:
            current = current.left
        return current.key, current.value

    def find_max(self) -> Optional[Tuple[K, Optional[V]]]:
        """Return (key, value) of the maximum key, or None if empty."""
        if self.root is None:
            return None
        current = self.root
        while current.right is not None:
            current = current.right
        return current.key, current.value

    def delete(self, key: K) -> bool:
        """Delete a key from the BST iteratively, handling all three deletion cases:

        Case 1: Leaf node (0 children) -> detach from parent.
        Case 2: Node with 1 child -> replace node with its child.
        Case 3: Node with 2 children -> replace with inorder successor (min of right
                subtree), then delete successor node from right subtree.

        Returns:
            True if key was found and deleted, False otherwise.
        """
        if self.root is None:
            return False

        # Step 1: Find target node and record path from root for height updates
        parent: Optional[BSTNode[K, V]] = None
        current: Optional[BSTNode[K, V]] = self.root
        path: List[BSTNode[K, V]] = []

        while current is not None and current.key != key:
            path.append(current)
            parent = current
            if key < current.key:
                current = current.left
            else:
                current = current.right

        if current is None:
            return False  # Key not found in tree

        # Case 3: Node has two children
        if current.left is not None and current.right is not None:
            # Find inorder successor: minimum node in right subtree
            path.append(current)
            succ_parent = current
            successor = current.right
            while successor.left is not None:
                path.append(successor)
                succ_parent = successor
                successor = successor.left

            # Copy successor key and value to current
            current.key = successor.key
            current.value = successor.value

            # Successor has at most a right child. Splice successor out.
            if succ_parent.left == successor:
                succ_parent.left = successor.right
            else:
                succ_parent.right = successor.right
        else:
            # Case 1 (leaf) or Case 2 (one child)
            child = current.left if current.left is not None else current.right

            if parent is None:
                # Deleting the root node
                self.root = child
            elif parent.left == current:
                parent.left = child
            else:
                parent.right = child

        self._size -= 1

        # Step 2: Update heights bottom-up along the affected path
        for node in reversed(path):
            node.update_height()

        return True

    def inorder(self) -> List[Tuple[K, Optional[V]]]:
        """Return list of (key, value) pairs in sorted order using iterative traversal."""
        result: List[Tuple[K, Optional[V]]] = []
        stack: List[BSTNode[K, V]] = []
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
        """Return list of (key, value) pairs in preorder using iterative traversal."""
        if self.root is None:
            return []

        result: List[Tuple[K, Optional[V]]] = []
        stack: List[BSTNode[K, V]] = [self.root]

        while stack:
            node = stack.pop()
            result.append((node.key, node.value))
            if node.right is not None:
                stack.append(node.right)
            if node.left is not None:
                stack.append(node.left)

        return result

    def postorder(self) -> List[Tuple[K, Optional[V]]]:
        """Return list of (key, value) pairs in postorder using iterative traversal."""
        if self.root is None:
            return []

        stack1: List[BSTNode[K, V]] = [self.root]
        stack2: List[BSTNode[K, V]] = []

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
        """Return all keys in sorted inorder."""
        return [k for k, _ in self.inorder()]

    def values(self) -> List[Optional[V]]:
        """Return all values in inorder."""
        return [v for _, v in self.inorder()]

    def clear(self) -> None:
        """Clear all nodes from the tree."""
        self.root = None
        self._size = 0

    def to_dict(self, max_depth: int = 6) -> Optional[dict[str, Any]]:
        """Serialize tree root for API visualization."""
        if self.root is None:
            return None
        return self.root.to_dict(max_depth=max_depth)
