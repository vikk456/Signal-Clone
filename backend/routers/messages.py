from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import datetime
import models, schemas
from database import get_db
from auth import get_current_user
from websocket_manager import manager

router = APIRouter(tags=["messages"])


def _get_message_out(msg_id: int, db: Session) -> schemas.MessageOut:
    msg = db.query(models.Message).options(
        joinedload(models.Message.sender),
        joinedload(models.Message.reactions).joinedload(models.MessageReaction.user),
        joinedload(models.Message.reply_to).joinedload(models.Message.sender),
    ).filter(models.Message.id == msg_id).first()
    return msg


@router.post("/conversations/{conv_id}/messages", response_model=schemas.MessageOut, status_code=201)
async def send_message(
    conv_id: int,
    req: schemas.MessageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Verify membership
    member = db.query(models.ConversationMember).filter(
        models.ConversationMember.conversation_id == conv_id,
        models.ConversationMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member")

    msg = models.Message(
        conversation_id=conv_id,
        sender_id=current_user.id,
        content=req.content,
        message_type=req.message_type,
        reply_to_id=req.reply_to_id,
        disappears_at=req.disappears_at,
        status="sent",
    )
    db.add(msg)
    db.flush()

    # Get all members to broadcast to
    members = db.query(models.ConversationMember).filter(
        models.ConversationMember.conversation_id == conv_id
    ).all()
    other_member_ids = [m.user_id for m in members if m.user_id != current_user.id]

    # Check if any recipient is online to mark as delivered
    is_delivered = False
    for uid in other_member_ids:
        if manager.is_online(uid):
            is_delivered = True
            receipt = models.MessageReceipt(message_id=msg.id, user_id=uid, status="delivered")
            db.add(receipt)

    if is_delivered:
        msg.status = "delivered"

    db.commit()
    db.refresh(msg)

    msg_out = _get_message_out(msg.id, db)

    import json
    from datetime import datetime

    msg_data = {
        "type": "new_message",
        "message": {
            "id": msg_out.id,
            "conversation_id": msg_out.conversation_id,
            "sender_id": msg_out.sender_id,
            "sender": {
                "id": msg_out.sender.id,
                "display_name": msg_out.sender.display_name,
                "avatar_url": msg_out.sender.avatar_url,
                "username": msg_out.sender.username,
                "phone_number": msg_out.sender.phone_number,
                "is_online": msg_out.sender.is_online,
            },
            "content": msg_out.content,
            "message_type": msg_out.message_type,
            "status": msg_out.status,
            "reply_to_id": msg_out.reply_to_id,
            "reply_to": {
                "id": msg_out.reply_to.id,
                "content": msg_out.reply_to.content,
                "sender": {"display_name": msg_out.reply_to.sender.display_name},
            } if msg_out.reply_to else None,
            "is_deleted": msg_out.is_deleted,
            "disappears_at": msg_out.disappears_at.isoformat() if msg_out.disappears_at else None,
            "created_at": msg_out.created_at.isoformat(),
            "reactions": [],
        }
    }
    # Only broadcast to other conversation members, not the sender
    other_member_ids = [m.user_id for m in members if m.user_id != current_user.id]
    await manager.send_to_users(other_member_ids, msg_data)

    return msg_out


@router.patch("/messages/{msg_id}", response_model=schemas.MessageOut)
async def edit_message(
    msg_id: int,
    req: schemas.MessageUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    msg = db.query(models.Message).filter(models.Message.id == msg_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    if msg.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot edit others' messages")

    msg.content = req.content
    msg.edited_at = datetime.utcnow()
    db.commit()

    msg_out = _get_message_out(msg_id, db)

    # Broadcast edit
    members = db.query(models.ConversationMember).filter(
        models.ConversationMember.conversation_id == msg.conversation_id
    ).all()
    await manager.send_to_users([m.user_id for m in members], {
        "type": "message_edited",
        "message_id": msg_id,
        "content": req.content,
        "conversation_id": msg.conversation_id,
        "edited_at": msg.edited_at.isoformat(),
    })

    return msg_out


@router.delete("/messages/{msg_id}", status_code=204)
async def delete_message(
    msg_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    msg = db.query(models.Message).filter(models.Message.id == msg_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    if msg.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot delete others' messages")

    msg.is_deleted = True
    msg.content = "This message was deleted"
    db.commit()

    members = db.query(models.ConversationMember).filter(
        models.ConversationMember.conversation_id == msg.conversation_id
    ).all()
    await manager.send_to_users([m.user_id for m in members], {
        "type": "message_deleted",
        "message_id": msg_id,
        "conversation_id": msg.conversation_id,
    })


@router.post("/messages/{msg_id}/reactions", response_model=schemas.MessageOut)
async def add_reaction(
    msg_id: int,
    req: schemas.ReactionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    msg = db.query(models.Message).filter(models.Message.id == msg_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    existing = db.query(models.MessageReaction).filter(
        models.MessageReaction.message_id == msg_id,
        models.MessageReaction.user_id == current_user.id
    ).first()

    if existing:
        if existing.emoji == req.emoji:
            db.delete(existing)
        else:
            existing.emoji = req.emoji
    else:
        reaction = models.MessageReaction(
            message_id=msg_id,
            user_id=current_user.id,
            emoji=req.emoji
        )
        db.add(reaction)
    db.commit()

    msg_out = _get_message_out(msg_id, db)

    members = db.query(models.ConversationMember).filter(
        models.ConversationMember.conversation_id == msg.conversation_id
    ).all()
    await manager.send_to_users([m.user_id for m in members], {
        "type": "message_reaction",
        "message_id": msg_id,
        "conversation_id": msg.conversation_id,
        "user_id": current_user.id,
        "emoji": req.emoji,
    })

    return msg_out


@router.post("/messages/{msg_id}/read", status_code=204)
async def mark_read(
    msg_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    msg = db.query(models.Message).filter(models.Message.id == msg_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    # Update receipt
    receipt = db.query(models.MessageReceipt).filter(
        models.MessageReceipt.message_id == msg_id,
        models.MessageReceipt.user_id == current_user.id
    ).first()

    if receipt:
        receipt.status = "read"
        receipt.updated_at = datetime.utcnow()
    else:
        receipt = models.MessageReceipt(
            message_id=msg_id,
            user_id=current_user.id,
            status="read"
        )
        db.add(receipt)

    # Update last read in conversation member
    member = db.query(models.ConversationMember).filter(
        models.ConversationMember.conversation_id == msg.conversation_id,
        models.ConversationMember.user_id == current_user.id
    ).first()
    if member:
        member.last_read_message_id = msg_id

    db.commit()

    # Notify sender
    await manager.send_to_user(msg.sender_id, {
        "type": "message_status",
        "message_id": msg_id,
        "status": "read",
        "user_id": current_user.id,
        "conversation_id": msg.conversation_id,
    })
