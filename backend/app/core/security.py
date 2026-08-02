from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from app.core.config import settings
from typing import Optional, Dict, Any

security = HTTPBearer()

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """
    Verify Supabase JWT token and return decoded user info.
    """
    try:
        token = credentials.credentials
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated"
        )
        
        # Extract user ID and role claims
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user ID"
            )
        
        # Get role from user metadata if available
        user_metadata = payload.get("user_metadata", {})
        role = user_metadata.get("role", "student")
        
        # Check email verification status
        email_confirmed_at = payload.get("email_confirmed_at")
        if not email_confirmed_at:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email not verified. Please confirm your email address before accessing this resource."
            )
        
        return {
            "user_id": user_id,
            "role": role,
            "email": payload.get("email"),
            "email_confirmed_at": email_confirmed_at,
            "exp": payload.get("exp")
        }
        
    except HTTPException:
        raise
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """
    Get current authenticated user from verified token.
    This is the main dependency used in protected routes.
    """
    return await verify_token(credentials)
