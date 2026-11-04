"""ShopSphere Backend Application Entrypoint.
 
FastAPI REST API server integrating:
- SQLite persistence via SQLAlchemy 2.0.
- Multi-key in-memory search trees (ID BST, ID AVL, Name AVL, PriceIndex).
- ADSA performance benchmarking and interactive search path tracing.
"""

from __future__ import annotations
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from backend.api.routes import router as api_router
from backend.routers.adsa import router as adsa_live_router
from backend.database.connection import create_tables, get_db_session, get_engine
from backend.database.models import Product
from backend.database.seed_data import SEED_PRODUCTS
from backend.services.product_service import ProductService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("shopsphere.main")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Initialize database tables, seed catalogue data, and build in-memory indexes."""
    logger.info("Starting ShopSphere backend...")

    if not hasattr(app.state, "product_service") or app.state.product_service is None:
        engine = get_engine()
        create_tables(engine)

        # Initialize ProductService singleton
        service = ProductService(engine=engine, auto_rebuild=False)

        # Safely synchronise catalogue database from seed_data.py via SKU upsert
        logger.info("Synchronizing catalogue with seed_data.py (%d products)...", len(SEED_PRODUCTS))
        stats = service.sync_from_seed(SEED_PRODUCTS)
        logger.info(
            "Catalogue synchronized: %d created, %d updated, %d unchanged. Total indexed: %d",
            stats["created"],
            stats["updated"],
            stats["unchanged"],
            service.id_avl.size(),
        )

        # Attach service to application state for route handlers and tests
        app.state.product_service = service

        # Startup validation: verify each product's image file exists and log warning if missing
        import os
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        public_dir = os.path.join(base_dir, "frontend", "public")
        missing_count = 0
        for _, p in service.id_avl.inorder():
            img_url = (p.image_url or "").strip()
            if img_url.startswith("/"):
                file_rel = img_url.lstrip("/")
                file_full = os.path.join(public_dir, file_rel.replace("/", os.sep))
                if not os.path.exists(file_full):
                    missing_count += 1
                    logger.warning("[Startup Image Validation] Product SKU '%s' (ID %d) missing image file: %s", p.sku, p.id, file_full)
            elif not img_url:
                missing_count += 1
                logger.warning("[Startup Image Validation] Product SKU '%s' (ID %d) has no image_url configured.", p.sku, p.id)

        if missing_count == 0:
            logger.info("Startup image validation passed: all %d product image files exist on disk.", service.id_avl.size())
        else:
            logger.warning("Startup image validation finished with %d missing or unconfigured image(s).", missing_count)

    logger.info("ShopSphere backend ready. Multi-key indexes active.")

    yield


    logger.info("Shutting down ShopSphere backend.")


app = FastAPI(
    title="ShopSphere — Smart Product Discovery API",
    description="High-performance e-commerce product search backed by custom BST and AVL trees.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration for local Vite development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all API routes under /api
app.include_router(api_router, prefix="/api")
app.include_router(adsa_live_router, prefix="/api/adsa")


@app.get("/", tags=["Root"])
def root_info() -> dict[str, str]:
    """Root metadata endpoint."""
    return {
        "service": "ShopSphere API",
        "version": "1.0.0",
        "documentation": "/docs",
        "health": "/api/health",
        "products": "/api/products",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
