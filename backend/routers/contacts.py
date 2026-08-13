from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("", response_model=List[schemas.ContactOut])
def list_contacts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    contacts = db.query(models.Contact).filter(
        models.Contact.owner_id == current_user.id
    ).all()
    return contacts


@router.post("", response_model=schemas.ContactOut, status_code=201)
def add_contact(
    req: schemas.ContactCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if req.contact_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot add yourself as a contact")

    target = db.query(models.User).filter(models.User.id == req.contact_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.query(models.Contact).filter(
        models.Contact.owner_id == current_user.id,
        models.Contact.contact_id == req.contact_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Contact already added")

    contact = models.Contact(
        owner_id=current_user.id,
        contact_id=req.contact_id,
        nickname=req.nickname
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


@router.delete("/{contact_id}", status_code=204)
def remove_contact(
    contact_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    contact = db.query(models.Contact).filter(
        models.Contact.id == contact_id,
        models.Contact.owner_id == current_user.id
    ).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    db.delete(contact)
    db.commit()
