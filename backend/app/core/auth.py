from fastapi import Header, HTTPException, status
from supabase import create_client, Client
from app.core.config import settings

# Service-role client: full DB access, used internally by the backend.
# Never expose the service-role key to the frontend.
supabase_admin: Client = create_client(
    settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY
)


def get_current_user(authorization: str = Header(...)):
    """
    Expects header: Authorization: Bearer <supabase_access_token>
    The frontend gets this token from Supabase Auth after login/signup.
    This function verifies the token with Supabase and returns the user.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header",
        )
    token = authorization.split(" ", 1)[1]

    try:
        user_response = supabase_admin.auth.get_user(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token"
        )

    if not user_response or not user_response.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token"
        )

    return user_response.user  # has .id, .email, etc.
