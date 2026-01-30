from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List
import shutil
from pathlib import Path
import uuid
from datetime import datetime

from app.services.ocr_processor import CrossPlatformOCRProcessor

router = APIRouter(prefix="/api/upload", tags=["upload"])

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

@router.post("/screenshot")
async def upload_screenshot(file: UploadFile = File(...)):
    """
    Upload a single screenshot for OCR processing.
    
    Returns extracted data: tracker name, address, timestamp, etc.
    User can then review and confirm before saving to database.
    """
    
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type: {file.content_type}. Must be an image."
        )
    
    # Generate unique filename
    file_ext = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = UPLOAD_DIR / unique_filename
    
    try:
        # Save file permanently (don't delete after OCR)
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Process with OCR
        processor = CrossPlatformOCRProcessor()
        ocr_result = processor.process_screenshot(str(file_path))
        
        # Return results with relative path for serving
        return {
            "status": "success",
            "filename": file.filename,
            "uploaded_at": datetime.now().isoformat(),
            "file_size": file_path.stat().st_size,
            "file_path": f"/uploads/{unique_filename}",  # CHANGED: relative path for serving
            "ocr_result": {
                "platform": ocr_result.get('platform'),
                "tracker_name": ocr_result.get('tracker_name'),
                "address": ocr_result.get('address'),
                "last_seen": ocr_result.get('last_seen'),
                "confidence": ocr_result.get('confidence'),
                "raw_text": ocr_result.get('raw_text'),
                "error": ocr_result.get('error')
            }
        }
        
    except Exception as e:
        # Clean up file if processing failed
        if file_path.exists():
            file_path.unlink()
        
        raise HTTPException(
            status_code=500,
            detail=f"Error processing screenshot: {str(e)}"
        )


@router.post("/screenshots")
async def upload_screenshots(files: List[UploadFile] = File(...)):
    """
    Upload multiple screenshots for batch OCR processing.
    
    Returns array of results for each screenshot.
    """
    
    if len(files) > 10:
        raise HTTPException(
            status_code=400,
            detail="Maximum 10 files allowed per batch upload"
        )
    
    results = []
    
    for file in files:
        try:
            # Process each file individually
            result = await upload_screenshot(file)
            results.append(result)
        except HTTPException as e:
            # Include error in results but continue processing other files
            results.append({
                "status": "error",
                "filename": file.filename,
                "error": e.detail
            })
    
    return {
        "status": "success",
        "total_files": len(files),
        "results": results
    }
