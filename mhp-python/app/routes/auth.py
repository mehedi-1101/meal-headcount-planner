from fastapi import APIRouter, HTTPException, status, Depends

from app.models import LoginRequest, LoginResponse, UserResponse
from app.auth import verify_password, create_token, get_current_user
from app.services.user_service import get_user_by_username

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest):
    user = get_user_by_username(body.username)
    if not user or not verify_password(body.password, user["passwordHash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_token(user)
    return {
        "user": {
            "id": user["id"],
            "name": user["name"],
            "username": user["username"],
            "role": user["role"],
            "teamId": user.get("teamId"),
        },
        "token": token,
    }


@router.post("/logout")
def logout():
    # JWT is stateless — the server holds no session to destroy.
    # Real logout happens client-side by deleting the token from localStorage.
    # This endpoint exists so the frontend's logout() call doesn't get a 404.
    return {"message": "Logged out"}


@router.get("/me", response_model=UserResponse)
def me(user: dict = Depends(get_current_user)):
    # Token already contains all user fields — no DB lookup needed
    return user
