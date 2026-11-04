"""Centralized Product Service for ShopSphere.

Manages persistent SQLite storage alongside multi-key in-memory search indexes:
1. BST indexed by product ID (demonstration of unbalanced tree).
2. AVL Tree indexed by product ID (O(log n) balanced lookup).
3. AVL Tree indexed by normalized product name (multi-item buckets for duplicate names).
4. PriceIndex indexed by price_paise (AVL-backed inclusive range search).

Consistency Strategy:
    - SQLite database is the persistent single source of truth.
    - All mutations (create, update, delete) are committed to SQLite first.
    - On commit success, in-memory tree indexes are updated incrementally.
    - If any error occurs during in-memory index synchronization, a full
      `rebuild_indexes()` is triggered from SQLite to prevent memory drift.
"""

from __future__ import annotations
import logging
from typing import Any, Dict, List, Optional, Set, Tuple
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from backend.algorithms.bst import BinarySearchTree, SearchResult as BSTSearchResult
from backend.algorithms.avl import AVLTree, SearchResult as AVLSearchResult
from backend.algorithms.price_index import PriceIndex
from backend.database.models import Product
from backend.database.connection import (
    create_tables,
    get_engine,
    get_session_factory,
    get_db_session,
)

logger = logging.getLogger("shopsphere.product_service")


class ProductService:
    """Centralized product management with multi-key tree indexing."""

    def __init__(
        self,
        engine=None,
        db_url: Optional[str] = None,
        auto_rebuild: bool = True,
    ) -> None:
        """Initialize product service with database engine and tree indexes.

        Args:
            engine: Optional SQLAlchemy engine.
            db_url: Optional custom SQLite DB URL.
            auto_rebuild: If True, populates tree indexes from DB at startup.
        """
        self.engine = engine or get_engine(db_url)
        create_tables(self.engine)
        self.session_factory = get_session_factory(self.engine)

        # 1. BST indexed by product ID
        self.id_bst: BinarySearchTree[int, Product] = BinarySearchTree[int, Product]()

        # 2. AVL tree indexed by product ID
        self.id_avl: AVLTree[int, Product] = AVLTree[int, Product]()

        # 3. AVL tree indexed by normalized product name (Value: Set[int] product IDs)
        # Handles duplicate product names without overwriting
        self.name_avl: AVLTree[str, Set[int]] = AVLTree[str, Set[int]]()

        # 4. Balanced price index (Key: price_paise, Value: Set[int] product IDs)
        self.price_index: PriceIndex = PriceIndex()

        if auto_rebuild:
            self.rebuild_indexes()

    # --------------------------------------------------------------------------
    # Consistency & Index Rebuilding
    # --------------------------------------------------------------------------

    def rebuild_indexes(self) -> int:
        """Rebuild all in-memory indexes from persistent SQLite records.

        Guarantees 100% synchronization between SQLite state and in-memory trees.
        Returns the number of products indexed.
        """
        self.id_bst.clear()
        self.id_avl.clear()
        self.name_avl.clear()
        self.price_index.clear()

        with get_db_session(self.engine) as session:
            stmt = select(Product).order_by(Product.id.asc())
            products = list(session.scalars(stmt).all())
            session.expunge_all()

            for product in products:
                # 1. Index in ID BST
                self.id_bst.insert(product.id, product)

                # 2. Index in ID AVL
                self.id_avl.insert(product.id, product)

                # 3. Index in Name AVL (set of IDs per normalized name)
                norm_name = product.normalized_name
                name_bucket = self.name_avl.get(norm_name)
                if name_bucket is not None:
                    name_bucket.add(product.id)
                else:
                    self.name_avl.insert(norm_name, {product.id})

                # 4. Index in Price Index
                self.price_index.insert(product.price_paise, product.id)

            return len(products)

    def sync_from_seed(self, seed_products: List[Dict[str, Any]]) -> Dict[str, int]:
        """Safely synchronise catalogue database with seed_products using SKU as unique key.

        Upsert Semantics:
        - When SKU exists: updates name, category, description, price_paise, stock_quantity,
          rating, rating_count, is_available, and image_url.
        - When SKU does not exist: inserts a new Product record.
        - Preserves existing database records and any unrelated user data.
        - Avoids duplicate records and never performs destructive drops or deletes.
        - Rebuilds in-memory BST, AVL trees, and PriceIndex after commit.

        Returns:
            Dict with counts of 'created', 'updated', 'unchanged', and 'total_indexed'.
        """
        created = 0
        updated = 0
        unchanged = 0

        with get_db_session(self.engine) as session:
            stmt = select(Product)
            existing_by_sku: Dict[str, Product] = {
                p.sku: p for p in session.scalars(stmt).all()
            }

            for item in seed_products:
                sku = str(item.get("sku", "")).strip()
                if not sku:
                    logger.warning("Skipping seed item with missing or empty SKU: %s", item)
                    continue

                name = str(item.get("name", "")).strip()
                if not name:
                    logger.warning("Skipping seed SKU '%s' with empty name", sku)
                    continue

                norm_name = Product.normalize_name(name)
                category = str(item.get("category", "")).strip()
                description = str(item.get("description", "")).strip()
                price_paise = self._parse_price_paise(item, is_update=False)
                if price_paise is None or price_paise <= 0:
                    logger.warning("Skipping seed SKU '%s' with invalid price: %s", sku, item.get("price_paise"))
                    continue

                stock_quantity = int(item.get("stock_quantity", 0))
                raw_avail = item.get("is_available")
                is_available = bool(raw_avail) if raw_avail is not None else (stock_quantity > 0)
                image_url = str(item.get("image_url", "")).strip()
                rating = float(item.get("rating", 4.5))
                rating_count = int(item.get("rating_count", 0))

                existing = existing_by_sku.get(sku)
                if existing is not None:
                    # Check whether any field was modified
                    changed = (
                        existing.name != name
                        or existing.normalized_name != norm_name
                        or existing.category != category
                        or existing.description != description
                        or existing.price_paise != price_paise
                        or existing.stock_quantity != stock_quantity
                        or existing.is_available != is_available
                        or existing.image_url != image_url
                        or abs(existing.rating - rating) > 1e-4
                        or existing.rating_count != rating_count
                    )
                    if changed:
                        existing.name = name
                        existing.normalized_name = norm_name
                        existing.category = category
                        existing.description = description
                        existing.price_paise = price_paise
                        existing.stock_quantity = stock_quantity
                        existing.is_available = is_available
                        existing.image_url = image_url
                        existing.rating = rating
                        existing.rating_count = rating_count
                        updated += 1
                    else:
                        unchanged += 1
                else:
                    new_product = Product(
                        sku=sku,
                        name=name,
                        normalized_name=norm_name,
                        category=category,
                        description=description,
                        price_paise=price_paise,
                        stock_quantity=stock_quantity,
                        is_available=is_available,
                        image_url=image_url,
                        rating=rating,
                        rating_count=rating_count,
                    )
                    session.add(new_product)
                    existing_by_sku[sku] = new_product
                    created += 1

            session.commit()

        total_indexed = self.rebuild_indexes()
        logger.info(
            "Synchronised seed catalogue: %d created, %d updated, %d unchanged (Total indexed: %d)",
            created,
            updated,
            unchanged,
            total_indexed,
        )
        return {
            "created": created,
            "updated": updated,
            "unchanged": unchanged,
            "total_indexed": total_indexed,
        }


    # --------------------------------------------------------------------------
    # Validation Helpers
    # --------------------------------------------------------------------------

    @staticmethod
    def _parse_price_paise(data: Dict[str, Any], is_update: bool = False) -> Optional[int]:
        """Extract and validate price_paise from input dictionary.

        Accepts either explicit `price_paise` (int) or decimal `price` in rupees.
        Floating point arithmetic is strictly converted at the boundary.
        """
        if "price_paise" in data and data["price_paise"] is not None:
            price_paise = int(data["price_paise"])
            if price_paise <= 0:
                raise ValueError(f"Price in paise must be positive (>0), got {price_paise}")
            return price_paise

        if "price" in data and data["price"] is not None:
            raw_price = float(data["price"])
            if raw_price <= 0:
                raise ValueError(f"Price must be positive (>0), got {raw_price}")
            return int(round(raw_price * 100))

        if not is_update:
            raise ValueError("Price (or price_paise) must be provided")

        return None

    def _validate_payload(self, data: Dict[str, Any], is_update: bool = False) -> None:
        """Validate input payload fields and constraints."""
        if not is_update:
            if not data.get("name") or not str(data["name"]).strip():
                raise ValueError("Product name cannot be empty")
            if not data.get("sku") or not str(data["sku"]).strip():
                raise ValueError("Product SKU cannot be empty")
            if not data.get("category") or not str(data["category"]).strip():
                raise ValueError("Product category cannot be empty")

        if "stock_quantity" in data and data["stock_quantity"] is not None:
            stock = int(data["stock_quantity"])
            if stock < 0:
                raise ValueError(f"Stock quantity cannot be negative, got {stock}")

        if "rating" in data and data["rating"] is not None:
            rating = float(data["rating"])
            if not (0.0 <= rating <= 5.0):
                raise ValueError(f"Rating must be between 0.0 and 5.0, got {rating}")

    # --------------------------------------------------------------------------
    # CRUD Operations
    # --------------------------------------------------------------------------

    def create_product(self, product_data: Dict[str, Any]) -> Product:
        """Create a new product, persist to SQLite, and update all search indexes.

        Raises:
            ValueError: On invalid data or duplicate SKU.
        """
        self._validate_payload(product_data, is_update=False)
        price_paise = self._parse_price_paise(product_data, is_update=False)
        assert price_paise is not None

        sku = str(product_data["sku"]).strip()
        name = str(product_data["name"]).strip()
        normalized_name = Product.normalize_name(name)
        category = str(product_data["category"]).strip()
        description = str(product_data.get("description", "")).strip()
        stock_quantity = int(product_data.get("stock_quantity", 0))
        raw_avail = product_data.get("is_available")
        is_available = bool(raw_avail) if raw_avail is not None else (stock_quantity > 0)
        image_url = str(product_data.get("image_url", "")).strip()
        rating = float(product_data.get("rating", 4.5))
        rating_count = int(product_data.get("rating_count", 0))

        # 1. Persist to SQLite
        with get_db_session(self.engine) as session:
            # Check unique SKU
            existing = session.scalar(select(Product).where(Product.sku == sku))
            if existing is not None:
                raise ValueError(f"Product with SKU '{sku}' already exists (ID: {existing.id})")

            product = Product(
                sku=sku,
                name=name,
                normalized_name=normalized_name,
                category=category,
                description=description,
                price_paise=price_paise,
                stock_quantity=stock_quantity,
                is_available=is_available,
                image_url=image_url,
                rating=rating,
                rating_count=rating_count,
            )
            session.add(product)
            session.flush()
            # Detach instance for in-memory indexing
            session.refresh(product)
            session.expunge(product)

        # 2. Update In-Memory Indexes Safely
        try:
            self.id_bst.insert(product.id, product)
            self.id_avl.insert(product.id, product)

            # Name AVL index
            name_bucket = self.name_avl.get(normalized_name)
            if name_bucket is not None:
                name_bucket.add(product.id)
            else:
                self.name_avl.insert(normalized_name, {product.id})

            # Price index
            self.price_index.insert(product.price_paise, product.id)
        except Exception as e:
            logger.error("Error during in-memory index sync; triggering full rebuild: %s", e)
            self.rebuild_indexes()
            raise

        return product

    def get_product_by_id(self, product_id: int) -> Optional[Product]:
        """Fetch product by integer ID using balanced AVL index.

        Complexity: O(log n).
        Falls back to SQLite lookup if missing from index (e.g. out-of-band edit).
        """
        # Try fast in-memory AVL index first
        product = self.id_avl.get(product_id)
        if product is not None:
            return product

        # Fallback to database
        with get_db_session(self.engine) as session:
            db_product = session.get(Product, product_id)
            if db_product is not None:
                session.expunge(db_product)
                # Re-sync indexes to maintain invariant
                self.rebuild_indexes()
                return db_product

        return None

    def update_product(self, product_id: int, updates: Dict[str, Any]) -> Product:
        """Update an existing product's attributes in SQLite and synchronise indexes.

        Raises:
            ValueError: If product not found, SKU collides, or constraints violated.
        """
        self._validate_payload(updates, is_update=True)
        new_price_paise = self._parse_price_paise(updates, is_update=True)

        old_price_paise: int = 0
        old_norm_name: str = ""

        with get_db_session(self.engine) as session:
            product = session.get(Product, product_id)
            if product is None:
                raise ValueError(f"Product with ID {product_id} not found")

            old_price_paise = product.price_paise
            old_norm_name = product.normalized_name

            # Check SKU collision if SKU changed
            if "sku" in updates and updates["sku"] is not None:
                new_sku = str(updates["sku"]).strip()
                if new_sku != product.sku:
                    existing = session.scalar(select(Product).where(Product.sku == new_sku))
                    if existing is not None:
                        raise ValueError(f"Product with SKU '{new_sku}' already exists")
                    product.sku = new_sku

            if "name" in updates and updates["name"] is not None:
                new_name = str(updates["name"]).strip()
                if not new_name:
                    raise ValueError("Product name cannot be empty")
                product.name = new_name
                product.normalized_name = Product.normalize_name(new_name)

            if "category" in updates and updates["category"] is not None:
                product.category = str(updates["category"]).strip()

            if "description" in updates and updates["description"] is not None:
                product.description = str(updates["description"]).strip()

            if new_price_paise is not None:
                product.price_paise = new_price_paise

            if "stock_quantity" in updates and updates["stock_quantity"] is not None:
                product.stock_quantity = int(updates["stock_quantity"])

            if "is_available" in updates and updates["is_available"] is not None:
                product.is_available = bool(updates["is_available"])
            elif "stock_quantity" in updates:
                product.is_available = product.stock_quantity > 0

            if "image_url" in updates and updates["image_url"] is not None:
                product.image_url = str(updates["image_url"]).strip()

            if "rating" in updates and updates["rating"] is not None:
                product.rating = float(updates["rating"])

            if "rating_count" in updates and updates["rating_count"] is not None:
                product.rating_count = int(updates["rating_count"])

            session.flush()
            session.refresh(product)
            session.expunge(product)
            updated_product = product

        # Synchronize in-memory indexes
        try:
            # 1. Update ID trees
            self.id_bst.insert(product_id, updated_product)
            self.id_avl.insert(product_id, updated_product)

            # 2. Update Name AVL if name changed
            if old_norm_name != updated_product.normalized_name:
                # Remove from old bucket
                old_bucket = self.name_avl.get(old_norm_name)
                if old_bucket is not None:
                    old_bucket.discard(product_id)
                    if len(old_bucket) == 0:
                        self.name_avl.delete(old_norm_name)
                # Add to new bucket
                new_bucket = self.name_avl.get(updated_product.normalized_name)
                if new_bucket is not None:
                    new_bucket.add(product_id)
                else:
                    self.name_avl.insert(updated_product.normalized_name, {product_id})

            # 3. Update Price index if price changed
            if old_price_paise != updated_product.price_paise:
                self.price_index.update_product_price(
                    product_id, old_price_paise, updated_product.price_paise
                )
        except Exception as e:
            logger.error("Error updating in-memory indexes; rebuilding: %s", e)
            self.rebuild_indexes()
            raise

        return updated_product

    def delete_product(self, product_id: int) -> bool:
        """Delete a product from persistent storage and remove from all tree indexes.

        Returns:
            True if deleted, False if product did not exist.
        """
        old_price_paise: int = 0
        old_norm_name: str = ""

        with get_db_session(self.engine) as session:
            product = session.get(Product, product_id)
            if product is None:
                return False

            old_price_paise = product.price_paise
            old_norm_name = product.normalized_name
            session.delete(product)

        # Synchronize in-memory indexes
        try:
            self.id_bst.delete(product_id)
            self.id_avl.delete(product_id)

            # Remove from Name AVL
            name_bucket = self.name_avl.get(old_norm_name)
            if name_bucket is not None:
                name_bucket.discard(product_id)
                if len(name_bucket) == 0:
                    self.name_avl.delete(old_norm_name)

            # Remove from Price index
            self.price_index.remove(old_price_paise, product_id)
        except Exception as e:
            logger.error("Error during index pruning on delete; rebuilding: %s", e)
            self.rebuild_indexes()
            raise

        return True

    # --------------------------------------------------------------------------
    # Search Operations
    # --------------------------------------------------------------------------

    def search_by_id(
        self, product_id: int, tree_type: str = "avl"
    ) -> BSTSearchResult[Product] | AVLSearchResult[Product]:
        """Search product by ID using selected tree implementation.

        Returns SearchResult containing the found product, number of key comparisons,
        and step-by-step path traversal trace for educational comparison.
        """
        if tree_type.lower() == "bst":
            return self.id_bst.search(product_id)
        return self.id_avl.search(product_id)

    def search_by_name(self, query: str, exact: bool = False) -> List[Product]:
        """Search products by name using the normalized Name AVL index.

        Handling Duplicate Names:
            Multiple distinct products with identical normalized names (e.g., two SKUs
            with the same model name) are stored together in an ID set within the tree
            node. All matching products are returned.

        Theoretical Complexity:
            - Exact Match (exact=True): O(log k) tree search where k is distinct names,
              plus O(d) ID set resolution where d is duplicates sharing that name.
            - Substring/Prefix Match (exact=False):
              Arbitrary substring matching over a standard balanced BST/AVL index is
              NOT O(log n). It requires an O(k) linear inorder traversal over the distinct
              names, performing substring tests, yielding an overall complexity of O(k * l)
              where l is average string length.
        """
        norm_query = Product.normalize_name(query)
        if not norm_query:
            return []

        if exact:
            # Exact O(log k) AVL search
            id_set = self.name_avl.get(norm_query)
            if not id_set:
                return []
            products: List[Product] = []
            for pid in sorted(list(id_set)):
                p = self.id_avl.get(pid)
                if p is not None:
                    products.append(p)
            return products

        # Partial/substring search via inorder traversal of distinct names
        matching_products: List[Product] = []
        for name_key, id_set in self.name_avl.inorder():
            if norm_query in name_key:
                for pid in sorted(list(id_set)):
                    p = self.id_avl.get(pid)
                    if p is not None and p not in matching_products:
                        matching_products.append(p)

        return matching_products

    def search_by_price_range(
        self,
        min_paise: Optional[int] = None,
        max_paise: Optional[int] = None,
    ) -> List[Product]:
        """Find products within an inclusive price range [min_paise, max_paise].

        Complexity: O(log k + m) where k is distinct price points and m is prices
        falling within the range. Prunes subtrees outside [min_paise, max_paise].
        """
        if min_paise is not None and max_paise is not None and min_paise > max_paise:
            return []

        product_ids = self.price_index.find_product_ids_in_range(min_paise, max_paise)
        products: List[Product] = []
        for pid in product_ids:
            p = self.id_avl.get(pid)
            if p is not None:
                products.append(p)

        return products

    # --------------------------------------------------------------------------
    # Listing & Filtering
    # --------------------------------------------------------------------------

    def list_products(
        self,
        category: Optional[str] = None,
        is_available: Optional[bool] = None,
        in_stock_only: bool = False,
        min_price_paise: Optional[int] = None,
        max_price_paise: Optional[int] = None,
        sort_by: str = "id_asc",
    ) -> List[Product]:
        """List products with multi-attribute filtering and frontend sorting.

        Supported sort_by values:
            'id_asc', 'id_desc', 'price_asc', 'price_desc',
            'name_asc', 'name_desc', 'rating_desc'.
        """
        # 1. Base candidate set: use Price Index if range specified, else AVL inorder
        if min_price_paise is not None or max_price_paise is not None:
            candidates = self.search_by_price_range(min_price_paise, max_price_paise)
        else:
            candidates = [p for _, p in self.id_avl.inorder()]

        # 2. Filter by category
        if category and category.lower() != "all":
            norm_cat = category.strip().casefold()
            candidates = [p for p in candidates if p.category.strip().casefold() == norm_cat]

        # 3. Filter by availability / stock
        if is_available is not None:
            candidates = [p for p in candidates if p.is_available == is_available]

        if in_stock_only:
            candidates = [p for p in candidates if p.stock_quantity > 0 and p.is_available]

        # 4. Sorting
        sort_key = sort_by.lower()
        if sort_key == "price_asc":
            candidates.sort(key=lambda p: p.price_paise)
        elif sort_key == "price_desc":
            candidates.sort(key=lambda p: p.price_paise, reverse=True)
        elif sort_key == "name_asc":
            candidates.sort(key=lambda p: p.name.casefold())
        elif sort_key == "name_desc":
            candidates.sort(key=lambda p: p.name.casefold(), reverse=True)
        elif sort_key == "rating_desc":
            candidates.sort(key=lambda p: (p.rating, p.rating_count), reverse=True)
        elif sort_key == "id_desc":
            candidates.sort(key=lambda p: p.id, reverse=True)
        else:  # default id_asc
            candidates.sort(key=lambda p: p.id)

        return candidates

    # --------------------------------------------------------------------------
    # Diagnostics & Telemetry
    # --------------------------------------------------------------------------

    def get_index_diagnostics(self) -> Dict[str, Any]:
        """Return diagnostic metrics explaining the state of all search indexes.

        Useful for API responses and ADSA Performance Lab visualization.
        """
        return {
            "id_bst": {
                "size": self.id_bst.size(),
                "height": self.id_bst.get_height(),
            },
            "id_avl": {
                "size": self.id_avl.size(),
                "height": self.id_avl.get_height(),
                "is_balanced": self.id_avl.is_avl_balanced(),
                "rotations": self.id_avl.get_rotation_stats(),
                "total_rotations": self.id_avl.total_rotations,
            },

            "name_avl": {
                "size": self.name_avl.size(),
                "height": self.name_avl.get_height(),
                "is_balanced": self.name_avl.is_avl_balanced(),
            },
            "price_index": {
                "distinct_prices": self.price_index.distinct_price_count(),
                "total_products": self.price_index.total_product_count(),
                "height": self.price_index.get_height(),
                "is_balanced": self.price_index.is_balanced(),
            },
        }
