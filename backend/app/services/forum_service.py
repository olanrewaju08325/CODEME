from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, insert, delete
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import datetime
import uuid
from app.models.forum import ForumPost, ForumReply
from app.schemas.forum import (
    ForumPostResponse,
    ForumPostCreate,
    ForumPostUpdate,
    ForumReplyResponse,
    ForumReplyCreate,
    ForumReplyUpdate
)

async def get_all_forum_posts(db: AsyncSession, category: Optional[str] = None) -> List[ForumPostResponse]:
    """Get all forum posts, optionally filtered by category."""
    query = select(ForumPost).order_by(ForumPost.created_at.desc())
    if category:
        query = query.where(ForumPost.category == category)
    
    result = await db.execute(query)
    posts = result.scalars().all()
    
    return [
        ForumPostResponse(
            id=str(p.id),
            user_id=str(p.user_id),
            title=p.title,
            content=p.content,
            category=p.category,
            created_at=p.created_at,
            updated_at=p.updated_at
        )
        for p in posts
    ]

async def get_forum_post_by_id(db: AsyncSession, post_id: str) -> Optional[ForumPostResponse]:
    """Get a specific forum post with its replies."""
    result = await db.execute(
        select(ForumPost)
        .options(selectinload(ForumPost.replies))
        .where(ForumPost.id == post_id)
    )
    post = result.scalar_one_or_none()
    
    if not post:
        return None
    
    replies = [
        ForumReplyResponse(
            id=str(r.id),
            post_id=str(r.post_id),
            user_id=str(r.user_id),
            content=r.content,
            created_at=r.created_at,
            updated_at=r.updated_at
        )
        for r in sorted(post.replies, key=lambda x: x.created_at)
    ]
    
    return ForumPostResponse(
        id=str(post.id),
        user_id=str(post.user_id),
        title=post.title,
        content=post.content,
        category=post.category,
        created_at=post.created_at,
        updated_at=post.updated_at,
        replies=replies
    )

async def create_forum_post(db: AsyncSession, user_id: str, post_data: ForumPostCreate) -> ForumPostResponse:
    """Create a new forum post."""
    post = ForumPost(
        user_id=user_id,
        **post_data.model_dump()
    )
    db.add(post)
    await db.commit()
    
    return ForumPostResponse(
        id=str(post.id),
        user_id=str(post.user_id),
        title=post.title,
        content=post.content,
        category=post.category,
        created_at=post.created_at,
        updated_at=post.updated_at
    )

async def update_forum_post(db: AsyncSession, post_id: str, user_id: str, post_data: ForumPostUpdate) -> Optional[ForumPostResponse]:
    """Update an existing forum post (only by author)."""
    # Check ownership
    result = await db.execute(
        select(ForumPost).where(ForumPost.id == post_id).where(ForumPost.user_id == user_id)
    )
    post = result.scalar_one_or_none()
    
    if not post:
        return None
    
    update_data = {k: v for k, v in post_data.model_dump().items() if v is not None}
    
    await db.execute(
        update(ForumPost).where(ForumPost.id == post_id).values(**update_data)
    )
    
    return await get_forum_post_by_id(db, post_id)

async def delete_forum_post(db: AsyncSession, post_id: str, user_id: str) -> bool:
    """Delete a forum post (only by author)."""
    # Check ownership
    result = await db.execute(
        select(ForumPost).where(ForumPost.id == post_id).where(ForumPost.user_id == user_id)
    )
    post = result.scalar_one_or_none()
    
    if not post:
        return False
    
    await db.execute(
        delete(ForumPost).where(ForumPost.id == post_id)
    )
    return True

async def get_post_replies(db: AsyncSession, post_id: str) -> List[ForumReplyResponse]:
    """Get all replies for a post."""
    result = await db.execute(
        select(ForumReply)
        .where(ForumReply.post_id == post_id)
        .order_by(ForumReply.created_at)
    )
    replies = result.scalars().all()
    
    return [
        ForumReplyResponse(
            id=str(r.id),
            post_id=str(r.post_id),
            user_id=str(r.user_id),
            content=r.content,
            created_at=r.created_at,
            updated_at=r.updated_at
        )
        for r in replies
    ]

async def create_forum_reply(db: AsyncSession, post_id: str, user_id: str, reply_data: ForumReplyCreate) -> ForumReplyResponse:
    """Create a new forum reply."""
    reply = ForumReply(
        post_id=post_id,
        user_id=user_id,
        **reply_data.model_dump()
    )
    db.add(reply)
    await db.commit()
    
    return ForumReplyResponse(
        id=str(reply.id),
        post_id=str(reply.post_id),
        user_id=str(reply.user_id),
        content=reply.content,
        created_at=reply.created_at,
        updated_at=reply.updated_at
    )

async def update_forum_reply(db: AsyncSession, reply_id: str, user_id: str, reply_data: ForumReplyUpdate) -> Optional[ForumReplyResponse]:
    """Update an existing forum reply (only by author)."""
    # Check ownership
    result = await db.execute(
        select(ForumReply).where(ForumReply.id == reply_id).where(ForumReply.user_id == user_id)
    )
    reply = result.scalar_one_or_none()
    
    if not reply:
        return None
    
    await db.execute(
        update(ForumReply).where(ForumReply.id == reply_id).values(content=reply_data.content)
    )
    
    result = await db.execute(
        select(ForumReply).where(ForumReply.id == reply_id)
    )
    reply = result.scalar_one_or_none()
    
    return ForumReplyResponse(
        id=str(reply.id),
        post_id=str(reply.post_id),
        user_id=str(reply.user_id),
        content=reply.content,
        created_at=reply.created_at,
        updated_at=reply.updated_at
    )

async def delete_forum_reply(db: AsyncSession, reply_id: str, user_id: str) -> bool:
    """Delete a forum reply (only by author)."""
    # Check ownership
    result = await db.execute(
        select(ForumReply).where(ForumReply.id == reply_id).where(ForumReply.user_id == user_id)
    )
    reply = result.scalar_one_or_none()
    
    if not reply:
        return False
    
    await db.execute(
        delete(ForumReply).where(ForumReply.id == reply_id)
    )
    return True