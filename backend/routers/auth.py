from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
import models, schemas
from database import get_db
from auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user, verify_otp, MOCKED_OTP, ACCESS_TOKEN_EXPIRE_MINUTES
)

router = APIRouter(prefix="/auth", tags=["auth"])

# In-memory OTP store (phone -> pending registration data)
pending_registrations: dict = {}


@router.post("/register", status_code=201)
def register(req: schemas.RegisterRequest, db: Session = Depends(get_db)):
    """Step 1: Submit registration details. Returns mocked OTP info."""
    # Check uniqueness
    if db.query(models.User).filter(models.User.phone_number == req.phone_number).first():
        raise HTTPException(status_code=400, detail="Phone number already registered")
    if db.query(models.User).filter(models.User.username == req.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    # Store pending registration
    pending_registrations[req.phone_number] = {
        "phone_number": req.phone_number,
        "username": req.username,
        "display_name": req.display_name,
        "password_hash": get_password_hash(req.password),
    }
    # Mock: return OTP hint
    return {
        "message": "OTP sent (mocked)",
        "hint": f"Use OTP: {MOCKED_OTP}",
        "phone_number": req.phone_number,
    }


@router.post("/verify-otp", response_model=schemas.TokenResponse)
def verify_otp_endpoint(req: schemas.OTPVerifyRequest, db: Session = Depends(get_db)):
    """Step 2: Verify OTP and create account."""
    if not verify_otp(req.phone_number, req.otp):
        raise HTTPException(status_code=400, detail="Invalid OTP")

    pending = pending_registrations.get(req.phone_number)
    if not pending:
        raise HTTPException(status_code=400, detail="No pending registration for this phone number")

    # Create user
    user = models.User(**pending)
    db.add(user)
    db.commit()
    db.refresh(user)

    del pending_registrations[req.phone_number]

    token = create_access_token(
        {"sub": str(user.id)},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return schemas.TokenResponse(access_token=token, user=user)


@router.post("/login", response_model=schemas.TokenResponse)
def login(req: schemas.LoginRequest, db: Session = Depends(get_db)):
    """Login with username or phone number."""
    user = (
        db.query(models.User).filter(models.User.username == req.username).first()
        or db.query(models.User).filter(models.User.phone_number == req.username).first()
    )
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(
        {"sub": str(user.id)},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return schemas.TokenResponse(access_token=token, user=user)


@router.post("/logout")
def logout(current_user: models.User = Depends(get_current_user)):
    """Logout (client should delete token)."""
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=schemas.UserPrivate)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user
