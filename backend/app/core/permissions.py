from fastapi import Depends, HTTPException, status
from app.core.security import get_current_user
from typing import Dict, Any

async def require_role(required_role: str, user_data: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Require a specific role to access the route.
    """
    if user_data["role"] != required_role and user_data["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Role '{required_role}' required."
        )
    return user_data

async def require_admin(user_data: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Require admin role to access the route.
    """
    if user_data["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Admin role required."
        )
    return user_data

async def require_teacher_or_admin(user_data: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Require teacher or admin role to access the route.
    """
    if user_data["role"] not in ["teacher", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Teacher or admin role required."
        )
    return user_data

async def require_student(user_data: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Require student role to access the route.
    """
    if user_data["role"] != "student" and user_data["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Student role required."
        )
    return user_data

# Ownership check helpers will be added as needed per feature
# Example: check_course_ownership, check_enrollment_ownership, etc.