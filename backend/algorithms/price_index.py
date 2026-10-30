"""Custom Balanced Price Range Index for ShopSphere.

This module provides a multi-product balanced price index built upon the custom
AVL Tree implementation.

Architectural Design:
    In an e-commerce catalogue, multiple products frequently share identical price points
    (e.g., several accessories priced at ₹1,499). A naive BST or AVL tree mapping keys
    directly to single product references would either overwrite duplicate prices or
    fail unique key constraints.

    The PriceIndex solves this by indexing `price_paise: int` as the primary balanced
    AVL key, with each node holding a Set[int] of product IDs matching that exact price.

Theoretical Complexity:
    - Insert (price, product_id): O(log k) where k is the number of distinct price points,
      plus O(1) set insertion.
    - Remove (price, product_id): O(log k) lookup + O(1) set removal. When the last product
      at a given price is deleted, the price node is deleted and rebalanced in O(log k).
    - Exact Price Query: O(log k).
    - Range Query [min_price, max_price]: O(log k + m) where m is the number of distinct
      price nodes falling within the range, achieved via subtree branch pruning.
"""

from __future__ import annotations
from typing import Any, Dict, List, Optional, Set, Tuple
from .avl import AVLTree, AVLNode


class PriceIndex:
    """Balanced multi-product price index using AVL tree backbone."""

    def __init__(self) -> None:
        # Key: price_paise (int), Value: Set[int] (set of product IDs)
        self._tree: AVLTree[int, Set[int]] = AVLTree[int, Set[int]]()
        self._total_products: int = 0

    def insert(self, price_paise: int, product_id: int) -> bool:
        """Insert a product ID under a given price in paise.

        If the price already exists in the tree, appends product_id to the existing set.
        If the price is new, creates a new AVL node and rebalances.

        Returns:
            True if product_id was newly added, False if it was already present.
        """
        if price_paise <= 0:
            raise ValueError(f"Price in paise must be positive, got {price_paise}")
        if product_id <= 0:
            raise ValueError(f"Product ID must be positive, got {product_id}")

        existing_set = self._tree.get(price_paise)
        if existing_set is not None:
            if product_id in existing_set:
                return False
            existing_set.add(product_id)
            self._total_products += 1
            return True
        else:
            new_set: Set[int] = {product_id}
            self._tree.insert(price_paise, new_set)
            self._total_products += 1
            return True

    def remove(self, price_paise: int, product_id: int) -> bool:
        """Remove a product ID from a given price point.

        If the set of product IDs at this price becomes empty, the price node
        is automatically deleted from the AVL tree and rebalanced.

        Returns:
            True if product was found and removed, False otherwise.
        """
        existing_set = self._tree.get(price_paise)
        if existing_set is None or product_id not in existing_set:
            return False

        existing_set.remove(product_id)
        self._total_products -= 1

        # If no more products share this price point, delete the tree node
        if len(existing_set) == 0:
            self._tree.delete(price_paise)

        return True

    def update_product_price(
        self, product_id: int, old_price_paise: int, new_price_paise: int
    ) -> bool:
        """Atomically move a product ID from old price point to new price point."""
        if old_price_paise == new_price_paise:
            return True
        removed = self.remove(old_price_paise, product_id)
        if not removed:
            return False
        return self.insert(new_price_paise, product_id)

    def search_exact(self, price_paise: int) -> Set[int]:
        """Return copy of set of all product IDs sharing exact price, or empty set."""
        res = self._tree.get(price_paise)
        return res.copy() if res is not None else set()

    def find_range(
        self,
        min_price_paise: Optional[int] = None,
        max_price_paise: Optional[int] = None,
    ) -> List[Tuple[int, Set[int]]]:
        """Return list of (price_paise, set_of_product_ids) within inclusive range.

        Complexity: O(log k + m) where k is distinct prices and m is prices in range.
        Subtrees outside [min_price, max_price] are pruned without traversal.
        """
        results: List[Tuple[int, Set[int]]] = []
        if self._tree.root is None:
            return results

        # Stack-based branch-pruned range search
        stack: List[AVLNode[int, Set[int]]] = []
        current: Optional[AVLNode[int, Set[int]]] = self._tree.root

        while current is not None or stack:
            while current is not None:
                # If current key is greater than min_price, left subtree may contain keys in range
                if min_price_paise is None or current.key >= min_price_paise:
                    stack.append(current)
                    current = current.left
                else:
                    # current.key < min_price, so entire left subtree is strictly < min_price
                    # Skip left subtree and branch right
                    current = current.right

            if not stack:
                break

            node = stack.pop()

            # Check if current node is in range
            in_min = min_price_paise is None or node.key >= min_price_paise
            in_max = max_price_paise is None or node.key <= max_price_paise

            if in_min and in_max:
                assert node.value is not None
                results.append((node.key, node.value.copy()))

            # If current key is less than max_price, right subtree may contain keys in range
            if max_price_paise is None or node.key <= max_price_paise:
                current = node.right
            else:
                current = None

        return results

    def find_product_ids_in_range(
        self,
        min_price_paise: Optional[int] = None,
        max_price_paise: Optional[int] = None,
    ) -> List[int]:
        """Return flattened list of product IDs whose prices fall in inclusive range."""
        range_entries = self.find_range(min_price_paise, max_price_paise)
        product_ids: List[int] = []
        for _, id_set in range_entries:
            product_ids.extend(sorted(list(id_set)))
        return product_ids

    def distinct_price_count(self) -> int:
        """Return number of distinct price points currently in tree."""
        return self._tree.size()

    def total_product_count(self) -> int:
        """Return total number of product assignments indexed."""
        return self._total_products

    def get_height(self) -> int:
        """Return underlying AVL tree height."""
        return self._tree.get_height()

    def is_balanced(self) -> bool:
        """Verify that underlying AVL tree strictly maintains |BF| <= 1."""
        return self._tree.is_avl_balanced()

    def clear(self) -> None:
        """Clear all entries from index."""
        self._tree.clear()
        self._total_products = 0

    def to_dict(self, max_depth: int = 6) -> Optional[dict[str, Any]]:
        """Serialize index for diagnostics."""
        return self._tree.to_dict(max_depth=max_depth)
