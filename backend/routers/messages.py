import re
import json
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, func
from sqlalchemy.orm import selectinload

from database import get_db, AsyncSessionLocal
from models.message import Message, MessageType
from models.user import User
from models.order import Order
from schemas.message import MessageOut, MessageCreate, ConversationOut
from routers.deps import get_current_user
from services.auth_service import decode_token
from services.file_service import save_upload_file
from services.notification_service import notify_new_message, create_notification
from models.notification import NotificationType

router = APIRouter(prefix="/api/messages", tags=["messages"])

# Pattern to detect contact info (phone, email)
CONTACT_PATTERN = re.compile(
    r'(\+?\d[\d\s\-\(\)]{8,}\d|[\w.+-]+@[\w-]+\.[a-zA-Z]{2,})',
    re.IGNORECASE
)


def sanitize_message(content: str) -> str:
    """Remove potential contact info from messages."""
    return CONTACT_PATTERN.sub("[контакт скрыт]", content)


@router.get("/conversations", response_model=List[ConversationOut])
async def get_conversations(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get unique conversation partners
    result = await db.execute(
        select(Message)
        .options(selectinload(Message.sender), selectinload(Message.receiver))
        .where(or_(Message.sender_id == user.id, Message.receiver_id == user.id))
        .order_by(Message.created_at.desc())
    )
    messages = result.scalars().all()

    conversations = {}
    for msg in messages:
        other_id = msg.receiver_id if msg.sender_id == user.id else msg.sender_id
        if other_id not in conversations:
            other_user = msg.receiver if msg.sender_id == user.id else msg.sender
            conversations[other_id] = {
                "user": other_user,
                "last_message": msg,
                "unread_count": 0,
                "order_id": msg.order_id,
            }

    # Count unread
    for conv_data in conversations.values():
        unread_result = await db.execute(
            select(func.count(Message.id))
            .where(
                Message.sender_id == conv_data["user"].id,
                Message.receiver_id == user.id,
                Message.is_read == False,
            )
        )
        conv_data["unread_count"] = unread_result.scalar() or 0

    return [ConversationOut(**c) for c in conversations.values()]


@router.get("/{user_id}", response_model=List[MessageOut])
async def get_messages(
    user_id: UUID,
    order_id: Optional[UUID] = None,
    page: int = 1,
    size: int = 50,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Message)
        .options(selectinload(Message.sender), selectinload(Message.receiver))
        .where(
            or_(
                and_(Message.sender_id == user.id, Message.receiver_id == user_id),
                and_(Message.sender_id == user_id, Message.receiver_id == user.id),
            )
        )
    )
    if order_id:
        query = query.where(Message.order_id == order_id)

    query = query.order_by(Message.created_at.desc())
    offset = (page - 1) * size
    query = query.offset(offset).limit(size)

    result = await db.execute(query)
    messages = result.scalars().all()

    # Mark as read
    for msg in messages:
        if msg.receiver_id == user.id and not msg.is_read:
            msg.is_read = True
    await db.commit()

    return list(reversed(messages))


@router.post("", response_model=MessageOut)
async def send_message(
    data: MessageCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    content = sanitize_message(data.content or "")

    msg = Message(
        sender_id=user.id,
        receiver_id=data.receiver_id,
        order_id=data.order_id,
        content=content,
        message_type=data.message_type,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

    # Notify receiver
    try:
        receiver_result = await db.execute(select(User).where(User.id == data.receiver_id))
        receiver = receiver_result.scalar_one_or_none()
        if receiver:
            await notify_new_message(receiver.telegram_id, user.first_name)
            await create_notification(db, data.receiver_id, NotificationType.NEW_MESSAGE,
                                       "Новое сообщение", f"От {user.first_name}",
                                       {"sender_id": str(user.id)})
    except Exception:
        pass

    result = await db.execute(
        select(Message)
        .options(selectinload(Message.sender), selectinload(Message.receiver))
        .where(Message.id == msg.id)
    )
    return result.scalar_one()


@router.post("/upload")
async def upload_message_file(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    file_info = await save_upload_file(file, subfolder="messages")
    return file_info


# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: str):
        self.active_connections.pop(user_id, None)

    async def send_to_user(self, user_id: str, data: dict):
        ws = self.active_connections.get(user_id)
        if ws:
            try:
                await ws.send_json(data)
            except Exception:
                self.disconnect(user_id)

    async def broadcast(self, data: dict):
        for ws in list(self.active_connections.values()):
            try:
                await ws.send_json(data)
            except Exception:
                pass


manager = ConnectionManager()


@router.websocket("/ws/chat/{token}")
async def websocket_chat(websocket: WebSocket, token: str):
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id or payload.get("type") != "access":
            await websocket.close(code=4001)
            return
    except ValueError:
        await websocket.close(code=4001)
        return

    await manager.connect(user_id, websocket)
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue

            msg_type = data.get("type")
            if msg_type == "message":
                receiver_id = data.get("receiver_id")
                content = sanitize_message(data.get("content", ""))
                order_id = data.get("order_id")

                async with AsyncSessionLocal() as db:
                    msg = Message(
                        sender_id=UUID(user_id),
                        receiver_id=UUID(receiver_id),
                        order_id=UUID(order_id) if order_id else None,
                        content=content,
                        message_type=MessageType.TEXT,
                    )
                    db.add(msg)
                    await db.commit()
                    await db.refresh(msg)

                    sender_result = await db.execute(select(User).where(User.id == UUID(user_id)))
                    sender = sender_result.scalar_one_or_none()

                    msg_data = {
                        "type": "message",
                        "id": str(msg.id),
                        "sender_id": user_id,
                        "receiver_id": receiver_id,
                        "content": content,
                        "order_id": order_id,
                        "created_at": msg.created_at.isoformat(),
                        "is_read": False,
                        "sender": {
                            "id": user_id,
                            "first_name": sender.first_name if sender else "User",
                            "avatar_url": sender.avatar_url if sender else None,
                        }
                    }

                    # Send to receiver if online
                    await manager.send_to_user(receiver_id, msg_data)
                    # Echo back to sender
                    await manager.send_to_user(user_id, {**msg_data, "echo": True})

            elif msg_type == "read":
                message_ids = data.get("message_ids", [])
                async with AsyncSessionLocal() as db:
                    for mid in message_ids:
                        result = await db.execute(select(Message).where(Message.id == UUID(mid)))
                        msg = result.scalar_one_or_none()
                        if msg and str(msg.receiver_id) == user_id:
                            msg.is_read = True
                    await db.commit()

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        manager.disconnect(user_id)
