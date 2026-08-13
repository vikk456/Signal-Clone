from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, desc
from typing import List, Optional
from datetime import datetime
import models, schemas
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/conversations", tags=["conversations"])


def _build_conversation_out(conv: models.Conversation, current_user_id: int, db: Session) -> schemas.ConversationOut:
    """Helper to build ConversationOut with last_message and unread_count."""
    # Last message
    last_msg = db.query(models.Message).filter(
        models.Message.conversation_id == conv.id,
        models.Message.is_deleted == False,
        (models.Message.disappears_at == None) | (models.Message.disappears_at > datetime.utcnow())
    ).order_by(desc(models.Message.created_at)).first()

    # Unread count — messages after last_read_message_id
    member = next((m for m in conv.members if m.user_id == current_user_id), None)
    last_read_id = member.last_read_message_id if member else 0

    unread_count = db.query(models.Message).filter(
        models.Message.conversation_id == conv.id,
        models.Message.id > (last_read_id or 0),
        models.Message.sender_id != current_user_id,
        models.Message.is_deleted == False,
        (models.Message.disappears_at == None) | (models.Message.disappears_at > datetime.utcnow())
    ).count()

    return schemas.ConversationOut(
        id=conv.id,
        is_group=conv.is_group,
        group_name=conv.group_name,
        group_avatar=conv.group_avatar,
        group_description=conv.group_description,
        created_at=conv.created_at,
        members=[schemas.ConversationMemberOut(
            user_id=m.user_id,
            user=m.user,
            is_admin=m.is_admin,
            joined_at=m.joined_at,
        ) for m in conv.members],
        last_message=last_msg,
        unread_count=unread_count,
    )


@router.get("", response_model=List[schemas.ConversationOut])
def list_conversations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    memberships = db.query(models.ConversationMember).filter(
        models.ConversationMember.user_id == current_user.id
    ).all()
    conv_ids = [m.conversation_id for m in memberships]

    conversations = db.query(models.Conversation).options(
        joinedload(models.Conversation.members).joinedload(models.ConversationMember.user)
    ).filter(models.Conversation.id.in_(conv_ids)).all()

    # Sort by last message created_at descending
    result = []
    for conv in conversations:
        last_msg = db.query(models.Message).filter(
            models.Message.conversation_id == conv.id
        ).order_by(desc(models.Message.created_at)).first()
        result.append((conv, last_msg.created_at if last_msg else conv.created_at))

    result.sort(key=lambda x: x[1], reverse=True)

    return [_build_conversation_out(conv, current_user.id, db) for conv, _ in result]


@router.post("", response_model=schemas.ConversationOut, status_code=201)
def create_conversation(
    req: schemas.ConversationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    all_member_ids = list(set([current_user.id] + req.member_ids))

    # For DMs: check if conversation already exists
    if not req.is_group and len(all_member_ids) == 2:
        other_id = next(m for m in all_member_ids if m != current_user.id)
        # Find existing DM
        existing = db.query(models.Conversation).filter(
            models.Conversation.is_group == False
        ).join(models.ConversationMember, models.Conversation.id == models.ConversationMember.conversation_id).filter(
            models.ConversationMember.user_id == current_user.id
        ).all()

        for conv in existing:
            member_ids_in_conv = {m.user_id for m in conv.members}
            if member_ids_in_conv == set(all_member_ids):
                return _build_conversation_out(conv, current_user.id, db)

    conv = models.Conversation(
        is_group=req.is_group,
        group_name=req.group_name,
        group_avatar=req.group_avatar,
        group_description=req.group_description,
        created_by=current_user.id,
    )
    db.add(conv)
    db.flush()

    for uid in all_member_ids:
        member = models.ConversationMember(
            conversation_id=conv.id,
            user_id=uid,
            is_admin=(uid == current_user.id),
        )
        db.add(member)

    db.commit()
    db.refresh(conv)

    # Reload with relationships
    conv = db.query(models.Conversation).options(
        joinedload(models.Conversation.members).joinedload(models.ConversationMember.user)
    ).filter(models.Conversation.id == conv.id).first()

    return _build_conversation_out(conv, current_user.id, db)


@router.get("/{conv_id}", response_model=schemas.ConversationOut)
def get_conversation(
    conv_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    conv = db.query(models.Conversation).options(
        joinedload(models.Conversation.members).joinedload(models.ConversationMember.user)
    ).filter(models.Conversation.id == conv_id).first()

    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    member_ids = {m.user_id for m in conv.members}
    if current_user.id not in member_ids:
        raise HTTPException(status_code=403, detail="Not a member")

    return _build_conversation_out(conv, current_user.id, db)


@router.get("/{conv_id}/messages", response_model=List[schemas.MessageOut])
def get_messages(
    conv_id: int,
    before_id: Optional[int] = None,
    limit: int = Query(50, le=100),
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

    query = db.query(models.Message).options(
        joinedload(models.Message.sender),
        joinedload(models.Message.reactions).joinedload(models.MessageReaction.user),
        joinedload(models.Message.reply_to).joinedload(models.Message.sender),
    ).filter(models.Message.conversation_id == conv_id).filter(
        (models.Message.disappears_at == None) | (models.Message.disappears_at > datetime.utcnow())
    )

    if before_id:
        query = query.filter(models.Message.id < before_id)

    messages = query.order_by(desc(models.Message.created_at)).limit(limit).all()
    messages.reverse()  # oldest first

    # Update last read
    if messages:
        member.last_read_message_id = messages[-1].id
        db.commit()

    return messages


@router.post("/{conv_id}/members", response_model=schemas.ConversationOut)
def add_members(
    conv_id: int,
    req: schemas.AddMembersRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    conv = db.query(models.Conversation).options(
        joinedload(models.Conversation.members).joinedload(models.ConversationMember.user)
    ).filter(models.Conversation.id == conv_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if not conv.is_group:
        raise HTTPException(status_code=400, detail="Cannot add members to a DM")

    # Check admin
    current_member = next((m for m in conv.members if m.user_id == current_user.id), None)
    if not current_member or not current_member.is_admin:
        raise HTTPException(status_code=403, detail="Only admins can add members")

    existing_ids = {m.user_id for m in conv.members}
    for uid in req.user_ids:
        if uid not in existing_ids:
            db.add(models.ConversationMember(
                conversation_id=conv_id,
                user_id=uid,
                is_admin=False
            ))
    db.commit()

    conv = db.query(models.Conversation).options(
        joinedload(models.Conversation.members).joinedload(models.ConversationMember.user)
    ).filter(models.Conversation.id == conv_id).first()
    return _build_conversation_out(conv, current_user.id, db)


@router.delete("/{conv_id}/members/{user_id}", status_code=204)
def remove_member(
    conv_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    conv = db.query(models.Conversation).options(
        joinedload(models.Conversation.members)
    ).filter(models.Conversation.id == conv_id).first()
    if not conv or not conv.is_group:
        raise HTTPException(status_code=404, detail="Group not found")

    current_member = next((m for m in conv.members if m.user_id == current_user.id), None)
    if not current_member or not current_member.is_admin:
        raise HTTPException(status_code=403, detail="Only admins can remove members")

    target = db.query(models.ConversationMember).filter(
        models.ConversationMember.conversation_id == conv_id,
        models.ConversationMember.user_id == user_id
    ).first()
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")

    db.delete(target)
    db.commit()
