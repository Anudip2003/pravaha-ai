from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from app.core.auth import supabase_admin

router = APIRouter(prefix="/auth", tags=["auth"])


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


def session_response(result):
    if not result.session or not result.user:
        raise HTTPException(status_code=401, detail="Authentication session is unavailable")
    return {
        "user_id": result.user.id,
        "email": result.user.email,
        "access_token": result.session.access_token,
        "refresh_token": result.session.refresh_token,
    }


@router.post("/signup")
def signup(req: SignupRequest):
    try:
        result = supabase_admin.auth.sign_up(
            {
                "email": req.email,
                "password": req.password,
                "options": {"data": {"full_name": req.full_name}},
            }
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not result.user:
        raise HTTPException(status_code=400, detail="Signup failed")

    return {
        "user_id": result.user.id,
        "email": result.user.email,
        # session may be None if Supabase email confirmation is required
        "access_token": result.session.access_token if result.session else None,
        "refresh_token": result.session.refresh_token if result.session else None,
    }


@router.post("/login")
def login(req: LoginRequest):
    try:
        result = supabase_admin.auth.sign_in_with_password(
            {"email": req.email, "password": req.password}
        )
    except Exception as e:
        print("LOGIN ERROR:", e)
        raise HTTPException(status_code=401, detail=str(e))

    return session_response(result)


@router.post("/refresh")
def refresh(req: RefreshRequest):
    try:
        result = supabase_admin.auth.refresh_session(req.refresh_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")

    return session_response(result)
