from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId
from datetime import datetime
from models.database import get_db
from models.domain import UserCreate, UserLogin, UserResponse, Token, UserUpdate
from utils.security import get_password_hash, verify_password, create_access_token, decode_token

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    db = get_db()
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if not user.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")
    return user


def format_user(user: dict) -> UserResponse:
    return UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        name=user["name"],
        is_active=user.get("is_active", True),
        created_at=user.get("created_at", datetime.utcnow()),
        streak_days=user.get("streak_days", 0),
        total_subjects=user.get("total_subjects", 0),
    )


@router.post("/signup", response_model=Token, status_code=201)
async def signup(user_data: UserCreate):
    db = get_db()
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pw = get_password_hash(user_data.password)
    new_user = {
        "email": user_data.email,
        "name": user_data.name,
        "hashed_password": hashed_pw,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "streak_days": 0,
        "last_activity": datetime.utcnow(),
        "total_subjects": 0,
        "target_attendance": 75.0,
    }
    result = await db.users.insert_one(new_user)
    new_user["_id"] = result.inserted_id

    token = create_access_token({"sub": user_data.email})
    return Token(access_token=token, token_type="bearer", user=format_user(new_user))


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    db = get_db()
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # Update last activity and streak
    now = datetime.utcnow()
    last = user.get("last_activity")
    streak = user.get("streak_days", 0)
    if last and (now - last).days == 1:
        streak += 1
    elif last and (now - last).days > 1:
        streak = 1
    elif not last:
        streak = 1

    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_activity": now, "streak_days": streak}}
    )
    user["streak_days"] = streak

    token = create_access_token({"sub": user["email"]})
    return Token(access_token=token, token_type="bearer", user=format_user(user))


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return format_user(current_user)


@router.put("/me", response_model=UserResponse)
async def update_profile(update: UserUpdate, current_user: dict = Depends(get_current_user)):
    db = get_db()
    updates = {}
    if update.name is not None:
        updates["name"] = update.name
    if update.target_attendance is not None:
        updates["target_attendance"] = update.target_attendance
    if updates:
        await db.users.update_one({"_id": current_user["_id"]}, {"$set": updates})
        current_user.update(updates)
    return format_user(current_user)
