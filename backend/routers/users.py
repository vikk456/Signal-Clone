from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import base64
import models, schemas
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/search", response_model=List[schemas.UserPublic])
def search_users(
    q: str = "",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not q:
        return []
    results = db.query(models.User).filter(
        (models.User.username.ilike(f"%{q}%")) |
        (models.User.display_name.ilike(f"%{q}%")) |
        (models.User.phone_number.ilike(f"%{q}%"))
    ).filter(models.User.id != current_user.id).limit(20).all()
    return results


@router.get("/{user_id}", response_model=schemas.UserPublic)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch("/me", response_model=schemas.UserPrivate)
def update_me(
    update: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if update.display_name is not None:
        current_user.display_name = update.display_name
    if update.bio is not None:
        current_user.bio = update.bio
    if update.avatar_url is not None:
        current_user.avatar_url = update.avatar_url
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/avatar", response_model=schemas.UserPrivate)
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Upload profile avatar — stored as base64 data URL."""
    content = await file.read()
    b64 = base64.b64encode(content).decode()
    data_url = f"data:{file.content_type};base64,{b64}"
    current_user.avatar_url = data_url
    db.commit()
    db.refresh(current_user)
    return current_user
