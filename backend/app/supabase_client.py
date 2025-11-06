"""
Supabase client and database operations
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from supabase import create_client, Client
from app.utils import get_settings


class SupabaseClient:
    """Wrapper for Supabase operations"""
    
    def __init__(self):
        import logging
        logger = logging.getLogger(__name__)
        settings = get_settings()
        
        # Debug logging
        logger.info(f"Supabase URL: {settings.supabase_url}")
        logger.info(f"Service key length: {len(settings.supabase_service_role_key) if settings.supabase_service_role_key else 0}")
        
        # Strip whitespace from service key (important for secrets from GCP Secret Manager)
        service_key = settings.supabase_service_role_key.strip() if settings.supabase_service_role_key else ""
        
        self.client: Client = create_client(
            settings.supabase_url,
            service_key
        )
    
    # Chat operations
    def create_chat(self, user_id: str, title: Optional[str] = None) -> Dict[str, Any]:
        """Create a new chat"""
        data = {
            "user_id": user_id,
            "title": title or "New Chat"
        }
        response = self.client.table("chats").insert(data).execute()
        return response.data[0] if response.data else None
    
    def get_chat(self, chat_id: str) -> Optional[Dict[str, Any]]:
        """Get a chat by ID"""
        response = self.client.table("chats").select("*").eq("id", chat_id).execute()
        return response.data[0] if response.data else None
    
    def update_chat(self, chat_id: str, title: str) -> Dict[str, Any]:
        """Update chat title"""
        response = self.client.table("chats").update({"title": title}).eq("id", chat_id).execute()
        return response.data[0] if response.data else None
    
    def get_user_chats(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get all chats for a user"""
        response = (
            self.client.table("chats")
            .select("*")
            .eq("user_id", user_id)
            .order("updated_at", desc=True)
            .limit(limit)
            .execute()
        )
        return response.data or []
    
    # Message operations
    def create_message(
        self, 
        chat_id: str, 
        role: str, 
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create a new message"""
        data = {
            "chat_id": chat_id,
            "role": role,
            "content": content,
            "metadata": metadata or {}
        }
        response = self.client.table("messages").insert(data).execute()
        return response.data[0] if response.data else None
    
    def get_chat_messages(self, chat_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get all messages for a chat"""
        response = (
            self.client.table("messages")
            .select("*")
            .eq("chat_id", chat_id)
            .order("created_at", desc=False)
            .limit(limit)
            .execute()
        )
        return response.data or []
    
    # File operations
    def create_file(
        self,
        user_id: str,
        filename: str,
        file_path: str,
        file_size: Optional[int] = None,
        mime_type: Optional[str] = None,
        chat_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a file record"""
        data = {
            "user_id": user_id,
            "filename": filename,
            "file_path": file_path,
            "file_size": file_size,
            "mime_type": mime_type,
            "chat_id": chat_id,
            "status": "pending"
        }
        response = self.client.table("files").insert(data).execute()
        return response.data[0] if response.data else None
    
    def get_file(self, file_id: str) -> Optional[Dict[str, Any]]:
        """Get a file by ID"""
        response = self.client.table("files").select("*").eq("id", file_id).execute()
        return response.data[0] if response.data else None
    
    def update_file_status(
        self, 
        file_id: str, 
        status: str,
        processed_at: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Update file processing status"""
        data = {"status": status}
        if processed_at:
            data["processed_at"] = processed_at.isoformat()
        response = self.client.table("files").update(data).eq("id", file_id).execute()
        return response.data[0] if response.data else None
    
    def get_user_files(self, user_id: str, limit: int = 50, chat_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all files for a user, optionally filtered by chat_id"""
        query = (
            self.client.table("files")
            .select("*")
            .eq("user_id", user_id)
        )
        
        if chat_id:
            query = query.eq("chat_id", chat_id)
        
        response = (
            query
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return response.data or []

    def get_files_by_chat(self, chat_id: str) -> List[Dict[str, Any]]:
        """Get all files linked to a chat"""
        response = (
            self.client.table("files")
            .select("*")
            .eq("chat_id", chat_id)
            .execute()
        )
        return response.data or []

    def delete_file_chunks_by_file_ids(self, file_ids: List[str]) -> None:
        """Delete file_chunks rows for given file IDs"""
        if not file_ids:
            return
        self.client.table("file_chunks").delete().in_("file_id", file_ids).execute()

    def delete_file_records_by_ids(self, file_ids: List[str]) -> None:
        """Delete files rows for given file IDs"""
        if not file_ids:
            return
        self.client.table("files").delete().in_("id", file_ids).execute()

    def delete_messages_by_chat(self, chat_id: str) -> None:
        """Delete all messages in a chat"""
        self.client.table("messages").delete().eq("chat_id", chat_id).execute()

    def delete_chat(self, chat_id: str) -> None:
        """Delete chat row"""
        self.client.table("chats").delete().eq("id", chat_id).execute()
    
    # File chunk operations
    def create_file_chunk(
        self,
        file_id: str,
        chunk_index: int,
        content: str,
        page_number: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create a file chunk"""
        data = {
            "file_id": file_id,
            "chunk_index": chunk_index,
            "content": content,
            "page_number": page_number,
            "metadata": metadata or {}
        }
        response = self.client.table("file_chunks").insert(data).execute()
        return response.data[0] if response.data else None
    
    def get_file_chunks(self, file_id: str) -> List[Dict[str, Any]]:
        """Get all chunks for a file"""
        response = (
            self.client.table("file_chunks")
            .select("*")
            .eq("file_id", file_id)
            .order("chunk_index", desc=False)
            .execute()
        )
        return response.data or []
    
    def get_chunks_by_file_ids(self, file_ids: List[str]) -> List[Dict[str, Any]]:
        """Get chunks for multiple files"""
        response = (
            self.client.table("file_chunks")
            .select("*")
            .in_("file_id", file_ids)
            .order("chunk_index", desc=False)
            .execute()
        )
        return response.data or []
    
    # Storage operations
    def get_signed_upload_url(self, bucket: str, path: str, expires_in: int = 3600) -> dict:
        """Generate a signed URL for file upload"""
        import logging
        import urllib.parse
        logger = logging.getLogger(__name__)
        
        # Get base URL from settings
        settings = get_settings()
        base_url = settings.supabase_url.rstrip('/')
        
        # URL encode the path for proper handling of special characters
        # Encode each segment separately to preserve slashes
        path_segments = path.split('/')
        encoded_segments = [urllib.parse.quote(segment, safe='') for segment in path_segments]
        encoded_path = '/'.join(encoded_segments)
        
        # Supabase Storage API endpoint format: /storage/v1/object/{bucket}/{path}
        # Note: This uses PUT method for direct uploads
        upload_url = f"{base_url}/storage/v1/object/{bucket}/{encoded_path}"
        
        logger.info(f"📍 Generated upload URL: {upload_url}")
        logger.info(f"📍 Original path: {path}")
        logger.info(f"📍 Encoded path: {encoded_path}")
        logger.info(f"📍 Base URL: {base_url}")
        logger.info(f"📍 Bucket: {bucket}")
        
        # For direct uploads, we need the service role key for authentication
        # In production, consider using signed upload URLs instead
        service_role_key = settings.supabase_service_role_key
        
        return {
            "signedURL": upload_url,
            "path": path,
            "token": service_role_key  # Service role key for authenticated upload
        }
    
    def get_signed_download_url(self, bucket: str, path: str, expires_in: int = 3600) -> str:
        """Generate a signed URL for file download"""
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            logger.info(f"🔐 Creating signed URL for bucket='{bucket}', path='{path}'")
            response = self.client.storage.from_(bucket).create_signed_url(path, expires_in)
            
            logger.info(f"📦 Supabase response: {response}")
            
            # Handle different response formats
            if isinstance(response, dict):
                signed_url = response.get("signedURL") or response.get("signed_url")
                if signed_url:
                    logger.info(f"✅ Signed URL created successfully")
                    return signed_url
                else:
                    logger.error(f"❌ No signedURL in response: {response}")
                    return ""
            else:
                logger.error(f"❌ Unexpected response type: {type(response)}")
                return ""
                
        except Exception as e:
            logger.error(f"❌ Error creating signed URL: {str(e)}")
            logger.exception(e)
            raise
    
    def download_file(self, bucket: str, path: str) -> bytes:
        """Download file from storage"""
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            logger.info(f"📥 Attempting to download from bucket '{bucket}' path '{path}'")
            response = self.client.storage.from_(bucket).download(path)
            
            # Handle different response types
            if isinstance(response, bytes):
                logger.info(f"✅ Downloaded {len(response)} bytes")
                return response
            elif hasattr(response, 'data'):
                logger.info(f"✅ Downloaded {len(response.data)} bytes")
                return response.data
            else:
                logger.error(f"❌ Unexpected response type: {type(response)}")
                raise Exception(f"Unexpected response type from storage download: {type(response)}")
                
        except Exception as e:
            logger.error(f"❌ Storage download failed: {str(e)}")
            logger.error(f"   Bucket: {bucket}")
            logger.error(f"   Path: {path}")
            raise

    def delete_storage_file(self, path: str) -> None:
        """Delete a file from known buckets if present (best-effort)."""
        import logging
        logger = logging.getLogger(__name__)
        settings = get_settings()
        buckets = [settings.bucket_legal, settings.bucket_images]
        for bucket in buckets:
            try:
                # Supabase remove expects a list of paths
                self.client.storage.from_(bucket).remove([path])
                logger.info(f"🗑️ Deleted storage file '{path}' from bucket '{bucket}'")
            except Exception as e:
                # Ignore not-found; log other errors
                logger.warning(f"⚠️ Could not delete '{path}' from '{bucket}': {str(e)}")
    
    # Admin operations
    def get_admin_stats(self) -> Dict[str, Any]:
        """Get admin overview statistics"""
        # Count unique users from chats
        chats_response = self.client.table("chats").select("user_id", count="exact").execute()
        
        # Count total messages
        messages_response = self.client.table("messages").select("*", count="exact").execute()
        
        # Count total files
        files_response = self.client.table("files").select("*", count="exact").execute()
        
        # Get recent activity (last 10 chats)
        recent_chats = (
            self.client.table("chats")
            .select("id, user_id, title, created_at")
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )
        
        return {
            "total_users": len(set(chat["user_id"] for chat in chats_response.data)) if chats_response.data else 0,
            "total_chats": chats_response.count or 0,
            "total_messages": messages_response.count or 0,
            "total_files": files_response.count or 0,
            "recent_activity": recent_chats.data or []
        }


# Singleton instance
_supabase_client: Optional[SupabaseClient] = None


def get_supabase_client() -> SupabaseClient:
    """Get or create Supabase client singleton"""
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = SupabaseClient()
    return _supabase_client
