from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime,
    ForeignKey, Text, UniqueConstraint
)
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    phone_number = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    display_name = Column(String, nullable=False)
    avatar_url = Column(Text, nullable=True)  # base64 or URL
    bio = Column(String, nullable=True, default="")
    is_online = Column(Boolean, default=False)
    last_seen = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    password_hash = Column(String, nullable=False)

    # Relationships
    sent_messages = relationship("Message", back_populates="sender", foreign_keys="Message.sender_id")
    conversation_memberships = relationship("ConversationMember", back_populates="user")
    contacts_owned = relationship("Contact", back_populates="owner", foreign_keys="Contact.owner_id")
    contacts_received = relationship("Contact", back_populates="contact_user", foreign_keys="Contact.contact_id")


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    is_group = Column(Boolean, default=False)
    group_name = Column(String, nullable=True)
    group_avatar = Column(Text, nullable=True)
    group_description = Column(String, nullable=True, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    members = relationship("ConversationMember", back_populates="conversation")
    messages = relationship("Message", back_populates="conversation", order_by="Message.created_at")
    creator = relationship("User", foreign_keys=[created_by])


class ConversationMember(Base):
    __tablename__ = "conversation_members"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_admin = Column(Boolean, default=False)
    joined_at = Column(DateTime, default=datetime.utcnow)
    muted_until = Column(DateTime, nullable=True)
    last_read_message_id = Column(Integer, nullable=True, default=0)

    __table_args__ = (UniqueConstraint("conversation_id", "user_id", name="uq_conv_member"),)

    # Relationships
    conversation = relationship("Conversation", back_populates="members")
    user = relationship("User", back_populates="conversation_memberships")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    message_type = Column(String, default="text")  # text, image, file, system
    status = Column(String, default="sent")  # sending, sent, delivered, read
    reply_to_id = Column(Integer, ForeignKey("messages.id"), nullable=True)
    is_deleted = Column(Boolean, default=False)
    disappears_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    edited_at = Column(DateTime, nullable=True)

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User", back_populates="sent_messages", foreign_keys=[sender_id])
    reply_to = relationship("Message", remote_side="Message.id", foreign_keys=[reply_to_id])
    receipts = relationship("MessageReceipt", back_populates="message")
    reactions = relationship("MessageReaction", back_populates="message")


class MessageReceipt(Base):
    __tablename__ = "message_receipts"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="delivered")  # delivered, read
    updated_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (UniqueConstraint("message_id", "user_id", name="uq_receipt"),)

    # Relationships
    message = relationship("Message", back_populates="receipts")
    user = relationship("User")


class MessageReaction(Base):
    __tablename__ = "message_reactions"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    emoji = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (UniqueConstraint("message_id", "user_id", name="uq_reaction"),)

    # Relationships
    message = relationship("Message", back_populates="reactions")
    user = relationship("User")


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    contact_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    nickname = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (UniqueConstraint("owner_id", "contact_id", name="uq_contact"),)

    # Relationships
    owner = relationship("User", back_populates="contacts_owned", foreign_keys=[owner_id])
    contact_user = relationship("User", back_populates="contacts_received", foreign_keys=[contact_id])
