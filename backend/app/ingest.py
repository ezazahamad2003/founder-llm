"""
Document ingestion using OpenAI File Extraction API
"""
import io
from datetime import datetime
from typing import Dict, Any, List, Optional

from openai import AsyncOpenAI

from app.supabase_client import get_supabase_client
from app.utils import get_settings


async def ingest_file(
    file_id: str,
    project_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Ingest and process a file using OpenAI File Extraction API
    
    Args:
        file_id: ID of the file to process
        project_id: Optional project ID to associate with file
    
    Returns:
        Dictionary with processing results
    """
    settings = get_settings()
    supabase = get_supabase_client()
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    
    try:
        # Get file metadata
        file_record = supabase.get_file(file_id)
        if not file_record:
            return {
                "success": False,
                "error": "File not found"
            }
        
        # Update status to processing
        supabase.update_file_status(file_id, "processing")
        
        # Download file from storage
        file_path = file_record["file_path"]
        filename = file_record["filename"]
        file_bytes = supabase.download_file(settings.bucket_legal, file_path)
        
        # Extract text from PDF using PyPDF2
        # Note: OpenAI File Extraction API (files.parse) doesn't exist in the SDK
        # Using PyPDF2 as the primary extraction method
        import logging
        logger = logging.getLogger(__name__)
        
        text = ""
        try:
            import PyPDF2
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
            logger.info(f"📄 Extracting text from {len(pdf_reader.pages)} pages")
            
            for i, page in enumerate(pdf_reader.pages):
                page_text = page.extract_text()
                text += page_text + "\n"
                logger.debug(f"Extracted {len(page_text)} chars from page {i+1}")
            
            logger.info(f"✅ Extracted {len(text)} characters total")
            
        except ImportError:
            logger.error("❌ PyPDF2 not installed. Install with: pip install PyPDF2")
            supabase.update_file_status(file_id, "failed")
            return {
                "success": False,
                "error": "PDF extraction library not available. Please install PyPDF2."
            }
        except Exception as e:
            logger.error(f"❌ PDF extraction failed: {str(e)}")
            supabase.update_file_status(file_id, "failed")
            return {
                "success": False,
                "error": f"PDF extraction failed: {str(e)}"
            }
        
        if not text:
            supabase.update_file_status(file_id, "failed")
            return {
                "success": False,
                "error": "No text extracted from file"
            }
        
        # Store the full text as a single chunk
        supabase.create_file_chunk(
            file_id=file_id,
            chunk_index=0,
            content=text,
            metadata={"length": len(text), "extraction_method": "pypdf2"}
        )
        
        # Update file status to completed
        supabase.update_file_status(
            file_id,
            "completed",
            processed_at=datetime.utcnow()
        )
        
        return {
            "success": True,
            "file_id": file_id,
            "text_length": len(text),
            "chunks_created": 1,
            "message": f"Successfully extracted {len(text)} characters"
        }
    
    except Exception as e:
        # Update file status to failed
        supabase.update_file_status(file_id, "failed")
        
        return {
            "success": False,
            "error": f"File extraction failed: {str(e)}"
        }


async def get_file_context(
    file_ids: List[str],
    max_chars: int = 10000
) -> str:
    """
    Get combined text context from multiple files
    
    Args:
        file_ids: List of file IDs to retrieve
        max_chars: Maximum characters to return
    
    Returns:
        Combined text from all files
    """
    if not file_ids:
        return ""
    
    supabase = get_supabase_client()
    
    # Get all chunks for the files
    chunks = supabase.get_chunks_by_file_ids(file_ids)
    
    # Get file metadata for citations
    files_data = {}
    for file_id in file_ids:
        file_record = supabase.get_file(file_id)
        if file_record:
            files_data[file_id] = file_record["filename"]
    
    # Combine chunks with file citations
    context_parts = []
    total_chars = 0
    
    for chunk in chunks:
        file_id = chunk["file_id"]
        filename = files_data.get(file_id, "Unknown")
        content = chunk["content"]
        
        # Add citation header
        chunk_text = f"[Document: {filename}]\n{content}\n"
        
        if total_chars + len(chunk_text) > max_chars:
            break
        
        context_parts.append(chunk_text)
        total_chars += len(chunk_text)
    
    return "\n".join(context_parts)
