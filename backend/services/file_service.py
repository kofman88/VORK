import os
import uuid
import aiofiles
from typing import Optional
from pathlib import Path

from fastapi import UploadFile, HTTPException
from PIL import Image
import io

from config import settings


ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm"}
ALLOWED_FILE_TYPES = ALLOWED_IMAGE_TYPES | ALLOWED_VIDEO_TYPES | {
    "application/pdf", "application/zip",
    "text/plain", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


def get_upload_path(subfolder: str) -> Path:
    path = Path(settings.UPLOAD_DIR) / subfolder
    path.mkdir(parents=True, exist_ok=True)
    return path


async def save_upload_file(
    file: UploadFile,
    subfolder: str = "general",
    max_size: int = None,
) -> dict:
    if max_size is None:
        max_size = settings.MAX_UPLOAD_SIZE

    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(400, f"File too large. Max size: {max_size // 1024 // 1024}MB")

    ext = Path(file.filename or "file").suffix.lower()
    if not ext:
        ext = ".bin"

    filename = f"{uuid.uuid4()}{ext}"
    upload_path = get_upload_path(subfolder)
    file_path = upload_path / filename

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    relative_url = f"/uploads/{subfolder}/{filename}"

    result = {
        "url": relative_url,
        "filename": file.filename,
        "size": len(content),
        "content_type": file.content_type,
        "type": "file",
    }

    # Generate thumbnail for images
    if file.content_type in ALLOWED_IMAGE_TYPES:
        result["type"] = "image"
        try:
            thumbnail_url = await create_thumbnail(content, subfolder, filename)
            result["thumbnail"] = thumbnail_url
        except Exception:
            result["thumbnail"] = relative_url

    elif file.content_type in ALLOWED_VIDEO_TYPES:
        result["type"] = "video"

    return result


async def create_thumbnail(content: bytes, subfolder: str, original_filename: str) -> str:
    img = Image.open(io.BytesIO(content))
    img.thumbnail((400, 400), Image.Resampling.LANCZOS)

    thumb_filename = f"thumb_{original_filename}"
    if not thumb_filename.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
        thumb_filename = thumb_filename.rsplit(".", 1)[0] + ".jpg"

    thumb_path = get_upload_path(f"{subfolder}/thumbnails") / thumb_filename

    img_bytes = io.BytesIO()
    fmt = "JPEG" if img.mode == "RGB" else "PNG"
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGB")
        fmt = "JPEG"
    img.save(img_bytes, format=fmt, quality=85, optimize=True)

    async with aiofiles.open(thumb_path, "wb") as f:
        await f.write(img_bytes.getvalue())

    return f"/uploads/{subfolder}/thumbnails/{thumb_filename}"


async def save_avatar(file: UploadFile, user_id: str) -> str:
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(400, "Only image files allowed for avatar")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:  # 5MB
        raise HTTPException(400, "Avatar too large. Max 5MB")

    img = Image.open(io.BytesIO(content))
    img.thumbnail((400, 400), Image.Resampling.LANCZOS)
    if img.mode != "RGB":
        img = img.convert("RGB")

    filename = f"{user_id}_avatar.jpg"
    upload_path = get_upload_path("avatars")
    file_path = upload_path / filename

    img_bytes = io.BytesIO()
    img.save(img_bytes, format="JPEG", quality=90)

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(img_bytes.getvalue())

    return f"/uploads/avatars/{filename}"
