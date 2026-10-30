"""ShopSphere Algorithms Package.

Exports custom Binary Search Tree (BST) and Self-Balancing AVL Tree implementations.
"""

from .bst import BinarySearchTree, BSTNode, SearchResult, TraceStep
from .avl import AVLTree, AVLNode
from .price_index import PriceIndex

__all__ = [
    "BinarySearchTree",
    "BSTNode",
    "AVLTree",
    "AVLNode",
    "SearchResult",
    "TraceStep",
    "PriceIndex",
]

