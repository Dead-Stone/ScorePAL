"""
Authentication package for ScorePAL
"""

from .auth_config import (
    user_manager,
    current_active_user,
    current_verified_user,
    current_superuser,
    require_teacher,
    require_admin,
    require_student,
    require_grader,
    require_teacher_or_admin,
    require_grader_or_admin,
    create_db_and_tables,
    create_db_sync,
    create_access_token,
    verify_token
)

from .auth_routes import router as auth_router

__all__ = [
    "user_manager",
    "current_active_user",
    "current_verified_user",
    "current_superuser",
    "require_teacher",
    "require_admin", 
    "require_student",
    "require_grader",
    "require_teacher_or_admin",
    "require_grader_or_admin",
    "create_db_and_tables",
    "create_db_sync",
    "create_access_token",
    "verify_token",
    "auth_router"
] 