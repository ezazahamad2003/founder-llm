"""
Scopic Legal Backend - FastAPI Application
Main entry point with all API routes
"""
import logging
import json
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

from app.models import (
    ChatCreate, ChatResponse, ChatMessageRequest,
    FileSignRequest, FileSignResponse, FileIngestRequest, FileIngestResponse,
    FileDeleteRequest, AdminOverviewResponse
)
from app.supabase_client import get_supabase_client
from app.llm_providers import openai_stream, test_gpt5_connection
from app.ingest import ingest_file, get_file_context
from app.utils import get_settings, get_allowed_origins, generate_file_path, verify_admin_key

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Scopic Legal Backend API",
    description="FastAPI backend for Scopic Legal - AI Assistant for Startup Founders",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase client will be initialized lazily on first use
def get_supabase():
    """Get Supabase client instance"""
    return get_supabase_client()


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Scopic Legal Backend API",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "timestamp": "2024-01-01T00:00:00Z",
        "services": {
            "supabase": "connected",
            "openai": "configured"
        }
    }


# ============================================================================
# CHAT ROUTES
# ============================================================================

@app.post("/v1/chats", response_model=ChatResponse)
async def create_chat(chat_data: ChatCreate):
    """Create a new chat"""
    try:
        logger.info(f"📝 Creating new chat for user: {chat_data.user_id}")
        chat = get_supabase().create_chat(
            user_id=chat_data.user_id,
            title=chat_data.title
        )
        
        if not chat:
            logger.error("❌ Failed to create chat - no response from database")
            raise HTTPException(status_code=500, detail="Failed to create chat")
        
        logger.info(f"✅ Chat created successfully: {chat['id']}")
        return ChatResponse(**chat)
    
    except Exception as e:
        logger.error(f"❌ Error creating chat: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/v1/chats/{chat_id}", response_model=ChatResponse)
async def get_chat(chat_id: str):
    """Get a specific chat"""
    try:
        chat = get_supabase().get_chat(chat_id)
        
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        return ChatResponse(**chat)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# CHAT DELETE ROUTE
# ============================================================================

@app.delete("/v1/chats/{chat_id}")
async def delete_chat(chat_id: str, user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """
    Permanently delete a chat and all associated data.

    Security: Requires `X-User-Id` header and ownership of the chat.
    Steps:
      - Verify chat exists and belongs to user
      - Delete messages for chat
      - Delete files' chunks, storage objects, and file records linked to chat
      - Delete chat record
    """
    try:
        if not user_id:
            raise HTTPException(status_code=400, detail="Missing X-User-Id header")

        # Verify chat exists and ownership
        chat = get_supabase().get_chat(chat_id)
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        if chat.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this chat")

        # Delete messages
        get_supabase().delete_messages_by_chat(chat_id)

        # Gather files for this chat
        files = get_supabase().get_files_by_chat(chat_id)
        file_ids = [f["id"] for f in files]

        # Delete file chunks
        get_supabase().delete_file_chunks_by_file_ids(file_ids)

        # Delete files from storage (best-effort)
        for f in files:
            path = f.get("file_path")
            if path:
                get_supabase().delete_storage_file(path)

        # Delete file records
        get_supabase().delete_file_records_by_ids(file_ids)

        # Finally delete the chat
        get_supabase().delete_chat(chat_id)

        return {"status": "deleted", "chat_id": chat_id}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/v1/chats/{chat_id}/messages")
async def get_chat_messages(chat_id: str, limit: int = 100):
    """Get all messages for a chat"""
    try:
        messages = get_supabase().get_chat_messages(chat_id, limit=limit)
        return {"messages": messages}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/v1/chats/{chat_id}/message")
async def send_message(chat_id: str, request: ChatMessageRequest):
    """
    Send a message and stream the AI response
    Returns Server-Sent Events (SSE) stream
    """
    try:
        logger.info(f"💬 New message in chat {chat_id}: '{request.message[:50]}...'")
        
        # Verify chat exists
        chat = get_supabase().get_chat(chat_id)
        if not chat:
            logger.error(f"❌ Chat not found: {chat_id}")
            raise HTTPException(status_code=404, detail="Chat not found")
        
        # Save user message
        get_supabase().create_message(
            chat_id=chat_id,
            role="user",
            content=request.message
        )
        
        # Get chat history
        messages = get_supabase().get_chat_messages(chat_id, limit=20)
        
        # Get file context if file_ids provided
        context = ""
        if request.file_ids:
            logger.info(f"📄 Loading context from {len(request.file_ids)} files")
            context = await get_file_context(
                file_ids=request.file_ids,
                max_chars=10000
            )
            logger.info(f"✅ Context loaded: {len(context)} characters")
        
        # Build messages for LLM
        llm_messages = []
        
        # System prompt - minimal and natural, let the model respond like ChatGPT
        system_prompt = "You are a helpful AI assistant."
        
        if context:
            system_prompt += f"\n\nDocument Context:\n{context}"
        
        llm_messages.append({
            "role": "system",
            "content": system_prompt
        })
        
        # Add chat history
        for msg in messages[:-1]:  # Exclude the message we just added
            llm_messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
        
        # Add current user message
        llm_messages.append({
            "role": "user",
            "content": request.message
        })
        
        # Stream response from OpenAI
        async def generate_stream():
            """Generate SSE stream"""
            full_response = ""
            settings = get_settings()
            
            try:
                logger.info(f"🤖 Streaming response from {settings.model_id}")
                async for chunk in openai_stream(
                    messages=llm_messages,
                    model=settings.model_id,
                    temperature=0.7,
                    max_tokens=4096
                ):
                    # Forward the chunk (EventSourceResponse will add "data:" prefix)
                    yield chunk
                    
                    # Extract content for saving
                    if chunk != "[DONE]":
                        try:
                            data = json.loads(chunk)
                            if "content" in data:
                                full_response += data["content"]
                        except:
                            pass
                
                # Save assistant response
                if full_response:
                    logger.info(f"💾 Saving assistant response ({len(full_response)} chars)")
                    get_supabase().create_message(
                        chat_id=chat_id,
                        role="assistant",
                        content=full_response
                    )
                    logger.info(f"✅ Response saved successfully")
            
            except Exception as e:
                error_msg = f"Stream error: {str(e)}"
                logger.error(f"❌ Streaming error: {str(e)}")
                yield f"data: {{'error': '{error_msg}'}}\n\n"
        
        return EventSourceResponse(generate_stream())
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# FILE ROUTES
# ============================================================================

@app.post("/v1/files/sign", response_model=FileSignResponse)
async def sign_file_upload(request: FileSignRequest):
    """
    Generate a signed URL for file upload to Supabase Storage
    """
    try:
        settings = get_settings()
        logger.info(f"📤 Signing upload for file: {request.filename}")
        # Generate unique file path
        file_path = generate_file_path(request.user_id, request.filename)
        
        # Create file record in database
        file_record = get_supabase().create_file(
            user_id=request.user_id,
            filename=request.filename,
            file_path=file_path,
            mime_type=request.content_type,
            chat_id=request.chat_id  # ✅ Link file to chat
        )
        
        if not file_record:
            logger.error("❌ Failed to create file record in database")
            raise HTTPException(status_code=500, detail="Failed to create file record")
        
        logger.info(f"✅ File record created: {file_record['id']}")
        
        # Generate signed upload URL
        upload_response = get_supabase().get_signed_upload_url(
            bucket=settings.bucket_legal,
            path=file_path,
            expires_in=3600
        )
        
        signed_url = upload_response.get("signedURL", "")
        actual_path = upload_response.get("path", file_path)
        token = upload_response.get("token", "")
        
        logger.info(f"✅ Upload URL generated")
        logger.info(f"📍 Storage path: {actual_path}")
        
        # Update file record with actual storage path if different
        if actual_path != file_path:
            logger.info(f"⚠️ Path mismatch - updating file record")
            get_supabase().client.table("files").update({"file_path": actual_path}).eq("id", file_record["id"]).execute()
        
        return FileSignResponse(
            file_id=file_record["id"],
            upload_url=signed_url,
            file_path=actual_path,
            token=token
        )
    
    except Exception as e:
        logger.error(f"❌ File signing error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/v1/files/ingest", response_model=FileIngestResponse)
async def ingest_file_route(request: FileIngestRequest):
    """
    Extract text from uploaded file using OpenAI File Extraction API
    """
    try:
        logger.info(f"🔍 Starting file ingestion for file_id: {request.file_id}")
        # Verify file exists
        file_record = get_supabase().get_file(request.file_id)
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Verify ownership
        if file_record["user_id"] != request.user_id:
            raise HTTPException(status_code=403, detail="Unauthorized")
        
        # Process file using OpenAI File Extraction API
        logger.info(f"🤖 Calling OpenAI to extract text from file")
        result = await ingest_file(
            file_id=request.file_id,
            project_id=request.user_id
        )
        
        if result.get("success"):
            logger.info(f"✅ File ingestion successful: {result.get('text_length', 0)} chars extracted")
            return FileIngestResponse(
                file_id=result.get("file_id", request.file_id),
                status="completed",
                chunks_created=result.get("chunks_created", 1),
                message=result.get("message", "File processed successfully")
            )
        else:
            error_msg = result.get("error", "Unknown error")
            logger.error(f"❌ File ingestion failed: {error_msg}")
            raise HTTPException(status_code=500, detail=error_msg)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ File ingestion route error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/v1/files/{file_id}")
async def get_file(file_id: str, admin_key: Optional[str] = Header(None, alias="X-Admin-Key")):
    """Get file metadata and download URL"""
    try:
        logger.info(f"📄 Getting file metadata for: {file_id}")
        file_record = get_supabase().get_file(file_id)
        
        if not file_record:
            logger.error(f"❌ File not found: {file_id}")
            raise HTTPException(status_code=404, detail="File not found")
        
        # Generate signed download URL
        settings = get_settings()
        file_path = file_record.get("file_path")
        
        logger.info(f"📍 File path: {file_path}")
        logger.info(f"📍 Bucket: {settings.bucket_legal}")
        
        if file_path:
            try:
                logger.info(f"🔐 Generating signed URL for: {file_path}")
                download_url = get_supabase().get_signed_download_url(
                    bucket=settings.bucket_legal,
                    path=file_path,
                    expires_in=3600
                )
                
                if download_url:
                    file_record["download_url"] = download_url
                    logger.info(f"✅ Generated download URL successfully")
                else:
                    logger.error(f"❌ Empty download URL returned")
                    
            except Exception as e:
                logger.error(f"❌ Failed to generate download URL: {str(e)}")
                logger.exception(e)
                # Don't fail the request, just log the error
        else:
            logger.warning(f"⚠️ No file_path in record")
        
        return file_record
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Get file error: {str(e)}")
        logger.exception(e)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/v1/files/{file_id}/chunks")
async def get_file_chunks(file_id: str):
    """Get all chunks for a file"""
    try:
        chunks = get_supabase().get_file_chunks(file_id)
        return {"chunks": chunks}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/v1/files/{file_id}")
async def delete_file(file_id: str, request: FileDeleteRequest):
    """
    Delete a file and its associated chunks from storage and database
    """
    try:
        logger.info(f"🗑️ Deleting file: {file_id} by user: {request.user_id}")
        
        # Get file record to verify ownership and get storage path
        file_record = get_supabase().get_file(file_id)
        
        if not file_record:
            logger.error(f"❌ File not found: {file_id}")
            raise HTTPException(status_code=404, detail="File not found")
        
        # Verify ownership
        if file_record.get("user_id") != request.user_id:
            logger.error(f"❌ Unauthorized delete attempt: {file_id} by {request.user_id}")
            raise HTTPException(status_code=403, detail="Unauthorized")
        
        # Delete from storage
        settings = get_settings()
        file_path = file_record.get("file_path")
        
        if file_path:
            try:
                storage_response = get_supabase().client.storage.from_(settings.bucket_legal).remove([file_path])
                logger.info(f"✅ Deleted from storage: {file_path}")
            except Exception as storage_error:
                logger.warning(f"⚠️ Storage deletion failed (continuing): {storage_error}")
        
        # Delete file chunks first (due to foreign key constraint)
        try:
            get_supabase().client.table("file_chunks").delete().eq("file_id", file_id).execute()
            logger.info(f"✅ Deleted file chunks for: {file_id}")
        except Exception as chunk_error:
            logger.warning(f"⚠️ Chunk deletion failed (continuing): {chunk_error}")
        
        # Delete file record from database
        get_supabase().client.table("files").delete().eq("id", file_id).execute()
        logger.info(f"✅ Deleted file record: {file_id}")
        
        return {"success": True, "message": "File deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ File deletion error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# ADMIN ROUTES
# ============================================================================

@app.get("/v1/admin/overview", response_model=AdminOverviewResponse)
async def admin_overview(x_admin_key: Optional[str] = Header(None)):
    """
    Get admin overview statistics
    Requires admin API key in X-Admin-Key header
    """
    if not verify_admin_key(x_admin_key):
        raise HTTPException(
            status_code=403,
            detail="Invalid or missing admin API key"
        )
    
    try:
        stats = get_supabase().get_admin_stats()
        return AdminOverviewResponse(**stats)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# USER ROUTES
# ============================================================================

@app.get("/v1/users/{user_id}/chats")
async def get_user_chats(user_id: str, limit: int = 50):
    """Get all chats for a user"""
    try:
        chats = get_supabase().get_user_chats(user_id, limit=limit)
        return {"chats": chats}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/v1/users/{user_id}/files")
async def get_user_files(user_id: str, limit: int = 50, chat_id: Optional[str] = None):
    """Get all files for a user, optionally filtered by chat_id"""
    try:
        files = get_supabase().get_user_files(user_id, limit=limit, chat_id=chat_id)
        return {"files": files}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# ADMIN ROUTES
# ============================================================================

@app.get("/v1/admin/users")
async def get_all_users(admin_key: str = Header(None, alias="X-Admin-Key")):
    """Get all users with their stats (admin only)"""
    try:
        verify_admin_key(admin_key)
        logger.info("🔐 Admin: Fetching all users")
        
        # Get unique user IDs from chats table
        chats_response = get_supabase().client.table('chats').select('user_id').execute()
        user_ids = list(set([chat['user_id'] for chat in chats_response.data])) if chats_response.data else []
        
        logger.info(f"📊 Found {len(user_ids)} unique users")
        
        user_data = []
        for user_id in user_ids:
            # Get user info from auth.users using admin API
            try:
                user_response = get_supabase().client.auth.admin.get_user_by_id(user_id)
                user = user_response.user if hasattr(user_response, 'user') else None
                
                if not user:
                    continue
                
                # Get user's chat count
                chats = get_supabase().client.table('chats').select('id').eq('user_id', user_id).execute()
                chat_count = len(chats.data) if chats.data else 0
                
                # Get user's file count
                files = get_supabase().client.table('files').select('id').eq('user_id', user_id).execute()
                file_count = len(files.data) if files.data else 0
                
                user_data.append({
                    'id': user.id,
                    'email': user.email,
                    'created_at': user.created_at,
                    'last_sign_in_at': user.last_sign_in_at if hasattr(user, 'last_sign_in_at') else None,
                    'chat_count': chat_count,
                    'file_count': file_count
                })
            except Exception as user_error:
                logger.error(f"❌ Error fetching user {user_id}: {str(user_error)}")
                # Still include user with basic info
                chats = get_supabase().client.table('chats').select('id, created_at').eq('user_id', user_id).execute()
                chat_count = len(chats.data) if chats.data else 0
                files = get_supabase().client.table('files').select('id').eq('user_id', user_id).execute()
                file_count = len(files.data) if files.data else 0
                
                user_data.append({
                    'id': user_id,
                    'email': f'User {user_id[:8]}...',
                    'created_at': chats.data[0]['created_at'] if chats.data else None,
                    'last_sign_in_at': None,
                    'chat_count': chat_count,
                    'file_count': file_count
                })
        
        logger.info(f"✅ Returning {len(user_data)} users")
        return {'users': user_data}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Admin users error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/v1/admin/users/{user_id}/chats")
async def get_user_chats_admin(user_id: str, admin_key: str = Header(None, alias="X-Admin-Key")):
    """Get all chats for a specific user (admin only)"""
    try:
        verify_admin_key(admin_key)
        chats = get_supabase().get_user_chats(user_id)
        return {'chats': chats}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Admin user chats error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/v1/admin/users/{user_id}/files")
async def get_user_files_admin(user_id: str, admin_key: str = Header(None, alias="X-Admin-Key")):
    """Get all files for a specific user (admin only)"""
    try:
        verify_admin_key(admin_key)
        files = get_supabase().get_user_files(user_id)
        return {'files': files}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Admin user files error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/v1/admin/files")
async def get_all_files_admin(admin_key: str = Header(None, alias="X-Admin-Key")):
    """Get all files across all users (admin only)"""
    try:
        verify_admin_key(admin_key)
        # Query all files from database
        response = get_supabase().client.table("files").select("*").order("created_at", desc=True).execute()
        files = response.data or []
        logger.info(f"📁 Admin retrieved {len(files)} files")
        return {'files': files}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Admin all files error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/v1/admin/users/{user_id}")
async def delete_user_admin(user_id: str, admin_key: str = Header(None, alias="X-Admin-Key")):
    """Delete a user and all their data (admin only)"""
    try:
        verify_admin_key(admin_key)
        logger.info(f"🗑️ Admin deleting user: {user_id}")
        
        # Check if this is a placeholder/test user ID
        if user_id == "00000000-0000-0000-0000-000000000001" or user_id.startswith("00000000"):
            logger.warning(f"⚠️ Detected placeholder user ID: {user_id}")
            logger.warning(f"⚠️ This may be a test user or data inconsistency")
        
        settings = get_settings()
        
        # Get user's files to delete from storage
        user_files = get_supabase().get_user_files(user_id)
        logger.info(f"📁 Found {len(user_files)} files to delete")
        
        # Delete files from storage
        for file in user_files:
            file_path = file.get("file_path")
            if file_path:
                try:
                    get_supabase().client.storage.from_(settings.bucket_legal).remove([file_path])
                    logger.info(f"✅ Deleted file from storage: {file_path}")
                except Exception as e:
                    logger.warning(f"⚠️ Failed to delete file from storage: {e}")
        
        # Delete file chunks (CASCADE should handle this, but being explicit)
        try:
            get_supabase().client.table("file_chunks").delete().in_("file_id", [f["id"] for f in user_files]).execute()
            logger.info(f"✅ Deleted file chunks")
        except Exception as e:
            logger.warning(f"⚠️ Failed to delete file chunks: {e}")
        
        # Delete files from database
        try:
            get_supabase().client.table("files").delete().eq("user_id", user_id).execute()
            logger.info(f"✅ Deleted files from database")
        except Exception as e:
            logger.warning(f"⚠️ Failed to delete files: {e}")
        
        # Delete messages (CASCADE from chats should handle this)
        try:
            get_supabase().client.table("messages").delete().in_(
                "chat_id",
                get_supabase().client.table("chats").select("id").eq("user_id", user_id).execute().data
            ).execute()
            logger.info(f"✅ Deleted messages")
        except Exception as e:
            logger.warning(f"⚠️ Failed to delete messages: {e}")
        
        # Delete chats
        try:
            get_supabase().client.table("chats").delete().eq("user_id", user_id).execute()
            logger.info(f"✅ Deleted chats")
        except Exception as e:
            logger.warning(f"⚠️ Failed to delete chats: {e}")
        
        # Delete profile
        try:
            get_supabase().client.table("profiles").delete().eq("user_id", user_id).execute()
            logger.info(f"✅ Deleted profile")
        except Exception as e:
            logger.warning(f"⚠️ Failed to delete profile: {e}")
        
        # Delete auth user (this is the main deletion)
        try:
            # Use the correct Supabase admin API method
            from supabase import Client
            response = get_supabase().client.auth.admin.delete_user(user_id)
            logger.info(f"✅ Deleted auth user: {response}")
        except AttributeError:
            # If admin API not available, try alternative method
            try:
                logger.warning(f"⚠️ Admin API not available, using alternative deletion method")
                # Delete using REST API directly
                import requests
                settings = get_settings()
                url = f"{settings.supabase_url}/auth/v1/admin/users/{user_id}"
                headers = {
                    "apikey": settings.supabase_service_role_key,
                    "Authorization": f"Bearer {settings.supabase_service_role_key}"
                }
                response = requests.delete(url, headers=headers)
                if response.status_code not in [200, 204]:
                    logger.error(f"❌ Failed to delete auth user: {response.text}")
                    raise Exception(f"Auth deletion failed: {response.text}")
                logger.info(f"✅ Deleted auth user via REST API")
            except Exception as alt_e:
                logger.error(f"❌ Alternative deletion also failed: {alt_e}")
                # Continue anyway - data is already deleted
                logger.warning(f"⚠️ User data deleted but auth account may still exist")
        except Exception as e:
            logger.error(f"❌ Failed to delete auth user: {e}")
            # Don't fail the entire operation - data is already deleted
            logger.warning(f"⚠️ User data deleted but auth account may still exist")
        
        logger.info(f"✅ User {user_id} deleted successfully")
        return {"success": True, "message": "User deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Admin delete user error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/v1/admin/chats/{chat_id}/messages")
async def get_chat_messages_admin(chat_id: str, admin_key: str = Header(None, alias="X-Admin-Key")):
    """Get all messages in a chat (admin only)"""
    try:
        verify_admin_key(admin_key)
        messages = get_supabase().get_chat_messages(chat_id)
        return {'messages': messages}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Admin chat messages error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.exception_handler(404)
async def not_found_handler(request, exc):
    return {
        "error": "Not found",
        "detail": str(exc.detail) if hasattr(exc, "detail") else "Resource not found"
    }


@app.exception_handler(500)
async def internal_error_handler(request, exc):
    return {
        "error": "Internal server error",
        "detail": str(exc.detail) if hasattr(exc, "detail") else "An unexpected error occurred"
    }


if __name__ == "__main__":
    import uvicorn
    import argparse

    parser = argparse.ArgumentParser(description="Scopic Legal Backend")
    parser.add_argument("--test-gpt5", action="store_true", help="Test GPT-5 connectivity and availability")
    args = parser.parse_args()

    if args.test_gpt5:
        ok = test_gpt5_connection()
        if ok:
            print("GPT-5 available ✅")
        else:
            print("GPT-5 unavailable ❌ — use gpt-4o until access is enabled.")
    else:
        uvicorn.run(app, host="0.0.0.0", port=8080)

