import math
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from database import get_db
from models.gig import Gig, Category, Subcategory, Favorite
from models.user import User
from schemas.gig import GigOut, GigCreate, GigUpdate, GigListOut, CategoryOut
from routers.deps import get_current_user, get_current_freelancer
from services.file_service import save_upload_file

router = APIRouter(prefix="/api/gigs", tags=["gigs"])


def gig_to_out(gig: Gig, current_user: Optional[User] = None) -> GigOut:
    is_favorited = False
    if current_user and gig.favorites:
        is_favorited = any(f.user_id == current_user.id for f in gig.favorites)

    data = GigOut(
        id=gig.id,
        seller_id=gig.seller_id,
        seller=gig.seller,
        title=gig.title,
        description=gig.description,
        category_id=gig.category_id,
        subcategory_id=gig.subcategory_id,
        tags=gig.tags or [],
        packages=gig.packages or [],
        gallery=gig.gallery or [],
        requirements=gig.requirements,
        faq=gig.faq or [],
        is_active=gig.is_active,
        is_featured=gig.is_featured,
        views_count=gig.views_count,
        orders_count=gig.orders_count,
        rating=float(gig.rating),
        reviews_count=gig.reviews_count,
        avg_response_time=gig.avg_response_time,
        min_price=gig.min_price,
        min_delivery_days=gig.min_delivery_days,
        is_favorited=is_favorited,
        created_at=gig.created_at,
        updated_at=gig.updated_at,
    )
    return data


@router.get("/my", response_model=List[GigOut])
async def get_my_gigs(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Gig)
        .options(selectinload(Gig.seller), selectinload(Gig.favorites))
        .where(Gig.seller_id == user.id)
        .order_by(Gig.created_at.desc())
    )
    gigs = result.scalars().all()
    return [gig_to_out(g, user) for g in gigs]


@router.get("/favorites", response_model=List[GigOut])
async def get_favorites(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Gig)
        .join(Favorite, Favorite.gig_id == Gig.id)
        .options(selectinload(Gig.seller), selectinload(Gig.favorites))
        .where(Favorite.user_id == user.id)
        .order_by(Favorite.created_at.desc())
    )
    gigs = result.scalars().all()
    return [gig_to_out(g, user) for g in gigs]


@router.get("/featured", response_model=List[GigOut])
async def get_featured(
    db: AsyncSession = Depends(get_db),
    limit: int = Query(10, le=50),
):
    result = await db.execute(
        select(Gig)
        .options(selectinload(Gig.seller), selectinload(Gig.favorites))
        .where(Gig.is_active == True, Gig.is_featured == True)
        .order_by(Gig.orders_count.desc())
        .limit(limit)
    )
    gigs = result.scalars().all()
    return [gig_to_out(g) for g in gigs]


@router.get("", response_model=GigListOut)
async def list_gigs(
    category_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    sort: str = "popular",
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    query = (
        select(Gig)
        .options(selectinload(Gig.seller), selectinload(Gig.favorites))
        .where(Gig.is_active == True)
    )
    if category_id:
        query = query.where(Gig.category_id == category_id)

    if sort == "rating":
        query = query.order_by(Gig.rating.desc())
    elif sort == "newest":
        query = query.order_by(Gig.created_at.desc())
    else:
        query = query.order_by(Gig.is_featured.desc(), Gig.orders_count.desc())

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar() or 0

    offset = (page - 1) * size
    result = await db.execute(query.offset(offset).limit(size))
    gigs = result.scalars().all()

    return GigListOut(
        items=[gig_to_out(g, current_user) for g in gigs],
        total=total,
        page=page,
        size=size,
        pages=math.ceil(total / size) if total > 0 else 0,
    )


@router.post("", response_model=GigOut)
async def create_gig(
    data: GigCreate,
    user: User = Depends(get_current_freelancer),
    db: AsyncSession = Depends(get_db),
):
    gig = Gig(
        seller_id=user.id,
        title=data.title,
        description=data.description,
        category_id=data.category_id,
        subcategory_id=data.subcategory_id,
        tags=data.tags,
        packages=[p.model_dump() for p in data.packages],
        requirements=data.requirements,
        faq=[f.model_dump() for f in data.faq],
    )
    db.add(gig)
    await db.commit()
    await db.refresh(gig)

    # Reload with relationships
    result = await db.execute(
        select(Gig).options(selectinload(Gig.seller)).where(Gig.id == gig.id)
    )
    gig = result.scalar_one()
    return gig_to_out(gig, user)


@router.get("/{gig_id}", response_model=GigOut)
async def get_gig(
    gig_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    result = await db.execute(
        select(Gig)
        .options(selectinload(Gig.seller), selectinload(Gig.favorites))
        .where(Gig.id == gig_id)
    )
    gig = result.scalar_one_or_none()
    if not gig:
        raise HTTPException(404, "Gig not found")

    # Increment view count
    gig.views_count += 1
    await db.commit()

    return gig_to_out(gig, current_user)


@router.put("/{gig_id}", response_model=GigOut)
async def update_gig(
    gig_id: UUID,
    data: GigUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Gig).where(Gig.id == gig_id))
    gig = result.scalar_one_or_none()
    if not gig:
        raise HTTPException(404, "Gig not found")
    if gig.seller_id != user.id:
        raise HTTPException(403, "Not your gig")

    update_data = data.model_dump(exclude_unset=True)
    if "packages" in update_data and update_data["packages"]:
        update_data["packages"] = [p.model_dump() if hasattr(p, 'model_dump') else p for p in update_data["packages"]]
    if "faq" in update_data and update_data["faq"]:
        update_data["faq"] = [f.model_dump() if hasattr(f, 'model_dump') else f for f in update_data["faq"]]

    for key, value in update_data.items():
        setattr(gig, key, value)

    await db.commit()
    await db.refresh(gig)

    result = await db.execute(
        select(Gig).options(selectinload(Gig.seller), selectinload(Gig.favorites)).where(Gig.id == gig.id)
    )
    gig = result.scalar_one()
    return gig_to_out(gig, user)


@router.delete("/{gig_id}")
async def delete_gig(
    gig_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Gig).where(Gig.id == gig_id))
    gig = result.scalar_one_or_none()
    if not gig:
        raise HTTPException(404, "Gig not found")
    if gig.seller_id != user.id:
        raise HTTPException(403, "Not your gig")

    gig.is_active = False
    await db.commit()
    return {"status": "deactivated"}


@router.post("/{gig_id}/images")
async def upload_gig_images(
    gig_id: UUID,
    files: List[UploadFile] = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Gig).where(Gig.id == gig_id))
    gig = result.scalar_one_or_none()
    if not gig:
        raise HTTPException(404, "Gig not found")
    if gig.seller_id != user.id:
        raise HTTPException(403, "Not your gig")

    gallery = list(gig.gallery or [])
    if len(gallery) + len(files) > 6:
        raise HTTPException(400, "Max 6 files per gig (5 images + 1 video)")

    uploaded = []
    for file in files:
        file_info = await save_upload_file(file, subfolder="gigs")
        gallery.append(file_info)
        uploaded.append(file_info)

    gig.gallery = gallery
    await db.commit()
    return {"uploaded": uploaded, "gallery": gallery}


@router.post("/{gig_id}/favorite")
async def toggle_favorite(
    gig_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Favorite).where(Favorite.user_id == user.id, Favorite.gig_id == gig_id)
    )
    fav = result.scalar_one_or_none()

    if fav:
        await db.delete(fav)
        await db.commit()
        return {"favorited": False}
    else:
        fav = Favorite(user_id=user.id, gig_id=gig_id)
        db.add(fav)
        await db.commit()
        return {"favorited": True}
