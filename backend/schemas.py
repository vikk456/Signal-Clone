from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ─── User Schemas ────────────────────────────────────────────────────────────

class UserBase(BaseModel):
    phone_number: str
    username: str
    display_name: str

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None

class UserPublic(BaseModel):
    id: int
    phone_number: str
    username: str
    display_name: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = ""
    is_online: bool = False
    last_seen: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserPrivate(UserPublic):
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Auth Schemas ─────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    phone_number: str
    username: str
    display_name: str
    password: str

class OTPVerifyRequest(BaseModel):
    phone_number: str
    otp: str

class LoginRequest(BaseModel):
    username: str  # username or phone
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPrivate


# ─── Contact Schemas ──────────────────────────────────────────────────────────

class ContactCreate(BaseModel):
    contact_id: int
    nickname: Optional[str] = None

class ContactOut(BaseModel):
    id: int
    contact_user: UserPublic
    nickname: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Message Schemas ──────────────────────────────────────────────────────────

class ReactionOut(BaseModel):
    id: int
    emoji: str
    user_id: int
    user: UserPublic

    class Config:
        from_attributes = True

class MessageOut(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    sender: UserPublic
    content: str
    message_type: str
    status: str
    reply_to_id: Optional[int] = None
    reply_to: Optional["MessageOut"] = None
    is_deleted: bool
    disappears_at: Optional[datetime] = None
    created_at: datetime
    edited_at: Optional[datetime] = None
    reactions: List[ReactionOut] = []

    class Config:
        from_attributes = True

MessageOut.model_rebuild()

class MessageCreate(BaseModel):
    content: str
    message_type: str = "text"
    reply_to_id: Optional[int] = None
    disappears_at: Optional[datetime] = None

class MessageUpdate(BaseModel):
    content: str

class ReactionCreate(BaseModel):
    emoji: str


# ─── Conversation Schemas ─────────────────────────────────────────────────────

class ConversationMemberOut(BaseModel):
    user_id: int
    user: UserPublic
    is_admin: bool
    joined_at: datetime

    class Config:
        from_attributes = True

class ConversationCreate(BaseModel):
    is_group: bool = False
    member_ids: List[int]
    group_name: Optional[str] = None
    group_avatar: Optional[str] = None
    group_description: Optional[str] = None

class ConversationOut(BaseModel):
    id: int
    is_group: bool
    group_name: Optional[str] = None
    group_avatar: Optional[str] = None
    group_description: Optional[str] = None
    created_at: datetime
    members: List[ConversationMemberOut] = []
    last_message: Optional[MessageOut] = None
    unread_count: int = 0

    class Config:
        from_attributes = True

class AddMembersRequest(BaseModel):
    user_ids: List[int]
