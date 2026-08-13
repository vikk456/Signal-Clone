from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime
import json

from database import engine, get_db
import models
from models import Base
from auth import get_current_user
from websocket_manager import manager
from routers import auth, users, contacts, conversations, messages as messages_router
from seed import seed

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Signal Clone API",
    description="Full-featured Signal Messenger clone API",
    version="1.0.0",
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(contacts.router)
app.include_router(conversations.router)
app.include_router(messages_router.router)


@app.on_event("startup")
def on_startup():
    """Seed database on startup if empty."""
    seed()


@app.get("/")
def root():
    return {"message": "Signal Clone API", "version": "1.0.0", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


# ─── WebSocket Endpoint ───────────────────────────────────────────────────────

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: int,
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    """Real-time WebSocket connection per user."""
    # Validate token
    from jose import JWTError, jwt
    from auth import SECRET_KEY, ALGORITHM

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        token_user_id = int(payload.get("sub"))
        if token_user_id != user_id:
            await websocket.close(code=4001)
            return
    except JWTError:
        await websocket.close(code=4001)
        return

    # Connect
    await manager.connect(websocket, user_id)

    # Mark user online
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user:
        user.is_online = True
        db.commit()

    # Notify contacts user is online
    contact_ids = [
        c.contact_id for c in db.query(models.Contact).filter(
            models.Contact.owner_id == user_id
        ).all()
    ]
    await manager.broadcast_presence(user_id, True, contact_ids)

    # Mark undelivered messages as delivered
    conv_memberships = db.query(models.ConversationMember).filter(models.ConversationMember.user_id == user_id).all()
    conv_ids = [m.conversation_id for m in conv_memberships]
    if conv_ids:
        # Find messages in these convs where sender != user_id, and no receipt exists
        pending_msgs = db.query(models.Message).outerjoin(
            models.MessageReceipt, 
            (models.Message.id == models.MessageReceipt.message_id) & (models.MessageReceipt.user_id == user_id)
        ).filter(
            models.Message.conversation_id.in_(conv_ids),
            models.Message.sender_id != user_id,
            models.MessageReceipt.id == None
        ).all()
        
        if pending_msgs:
            senders_to_notify = {}
            for msg in pending_msgs:
                # Add receipt
                receipt = models.MessageReceipt(message_id=msg.id, user_id=user_id, status="delivered")
                db.add(receipt)
                if msg.status == "sent":
                    msg.status = "delivered"
                
                if msg.sender_id not in senders_to_notify:
                    senders_to_notify[msg.sender_id] = []
                senders_to_notify[msg.sender_id].append(msg)
            
            db.commit()
            
            # Notify senders
            for sender_id, msgs in senders_to_notify.items():
                for msg in msgs:
                    await manager.send_to_user(sender_id, {
                        "type": "message_status",
                        "message_id": msg.id,
                        "status": "delivered",
                        "user_id": user_id,
                        "conversation_id": msg.conversation_id,
                    })

    try:
        while True:
            data = await websocket.receive_text()
            try:
                event = json.loads(data)
                event_type = event.get("type")

                if event_type == "typing":
                    conv_id = event.get("conversation_id")
                    is_typing = event.get("is_typing", False)
                    # Broadcast typing to other members
                    members = db.query(models.ConversationMember).filter(
                        models.ConversationMember.conversation_id == conv_id,
                        models.ConversationMember.user_id != user_id
                    ).all()
                    await manager.send_to_users([m.user_id for m in members], {
                        "type": "typing",
                        "conversation_id": conv_id,
                        "user_id": user_id,
                        "is_typing": is_typing,
                    })

                elif event_type == "ping":
                    await websocket.send_json({"type": "pong"})

            except json.JSONDecodeError:
                pass

    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)

        # Mark offline if no more connections
        if not manager.is_online(user_id):
            user = db.query(models.User).filter(models.User.id == user_id).first()
            if user:
                user.is_online = False
                user.last_seen = datetime.utcnow()
                db.commit()
            await manager.broadcast_presence(user_id, False, contact_ids)
