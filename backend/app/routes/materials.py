from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import Response
from datetime import datetime
from bson import ObjectId
from typing import Optional
from app.services import ai_service, file_service
from app.auth.jwt import get_current_user
from app.database.connection import get_db

router = APIRouter()

ALLOWED = {
    "pdf": "pdf",
    "mp4": "video", "mov": "video", "avi": "video",
    "mp3": "audio", "wav": "audio", "m4a": "audio",
}


@router.post("/upload")
async def upload(
    file: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None),
    language: str = Form("en"),
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    uid = str(current_user["_id"])

    if text:
        extracted = text
        file_name = "Direct Text Input"
        file_type = "text"
        file_path = ""
    elif file:
        ext = file.filename.rsplit(".", 1)[-1].lower()
        if ext not in ALLOWED:
            raise HTTPException(400, f"File type .{ext} not supported")
        file_type = ALLOWED[ext]
        file_path, _ = await file_service.save_upload(file)
        file_name = file.filename
        if file_type == "pdf":
            extracted = file_service.extract_text_from_pdf(file_path)
        elif file_type == "video":
            extracted = file_service.process_video(file_path)
        elif file_type == "audio":
            extracted = file_service.transcribe_audio(file_path)
        else:
            extracted = ""
    else:
        raise HTTPException(400, "Please provide a file or text")

    if not extracted.strip():
        raise HTTPException(422, "Could not extract any text from this file")
    extracted = extracted[:5000]
    print(f"DEBUG: extracted text length: {len(extracted)}")
    print(f"DEBUG: calling ai_service")
    import asyncio
    summary, notes, topics, structured_notes = await asyncio.gather(
    ai_service.generate_summary(extracted, language),
    ai_service.generate_notes(extracted, language),
    ai_service.generate_topics(extracted),
    ai_service.generate_structured_notes(extracted, language, "bullet"),
)

    doc = {
        "user_id": uid,
        "file_name": file_name,
        "file_type": file_type,
        "file_path": file_path,
        "original_text": extracted,
        "summary": summary,
        "notes": notes,
        "topics": topics,
        "structured_notes": structured_notes,
        "language": language,
        "upload_date": datetime.utcnow(),
    }
    res = await db.study_materials.insert_one(doc)
    return {
        "id": str(res.inserted_id),
        "file_name": file_name,
        "file_type": file_type,
        "summary": summary,
        "notes": notes,
        "topics": topics,
        "upload_date": doc["upload_date"].isoformat(),
    }


@router.get("/")
async def list_materials(current_user=Depends(get_current_user), db=Depends(get_db)):
    uid = str(current_user["_id"])
    items = []
    async for m in db.study_materials.find({"user_id": uid}).sort("upload_date", -1).limit(50):
        items.append({
            "id": str(m["_id"]),
            "file_name": m["file_name"],
            "file_type": m["file_type"],
            "topics": m.get("topics", []),
            "upload_date": m["upload_date"].isoformat(),
        })
    return items


@router.get("/{material_id}")
async def get_material(material_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    doc = await db.study_materials.find_one({
        "_id": ObjectId(material_id),
        "user_id": str(current_user["_id"]),
    })
    if not doc:
        raise HTTPException(404, "Material not found")
    doc["id"] = str(doc.pop("_id"))
    doc["upload_date"] = doc["upload_date"].isoformat()
    doc.pop("original_text", None)
    return doc


@router.get("/{material_id}/notes/pdf")
async def download_pdf(material_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    doc = await db.study_materials.find_one({
        "_id": ObjectId(material_id),
        "user_id": str(current_user["_id"]),
    })
    if not doc:
        raise HTTPException(404, "Not found")
    pdf_bytes = file_service.export_notes_to_pdf(doc.get("notes", []), doc["file_name"])
    return Response(content=pdf_bytes, media_type="application/pdf",
                    headers={"Content-Disposition": 'attachment; filename="notes.pdf"'})


@router.delete("/{material_id}", status_code=204)
async def delete_material(material_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    await db.study_materials.delete_one({
        "_id": ObjectId(material_id),
        "user_id": str(current_user["_id"]),
    })

@router.get("/{material_id}/notes/{mode}")
async def get_notes_by_mode(
    material_id: str,
    mode: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    if mode not in ("paragraph", "bullet", "exam", "revision"):
        raise HTTPException(400, "Invalid mode. Use: paragraph, bullet, exam, revision")
    doc = await db.study_materials.find_one({
        "_id": ObjectId(material_id),
        "user_id": str(current_user["_id"]),
    })
    if not doc:
        raise HTTPException(404, "Material not found")
    if mode == "bullet" and doc.get("structured_notes"):
        return doc["structured_notes"]
    text = doc.get("original_text", "")
    language = doc.get("language", "en")
    return await ai_service.generate_structured_notes(text, language, mode)     