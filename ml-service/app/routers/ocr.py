from fastapi import APIRouter, UploadFile, File, Form
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter()

class OCRResult(BaseModel):
    text: str
    confidence: float
    language: str

class OCRResponse(BaseModel):
    results: List[OCRResult]
    full_text: str

_ocr_engine = None

def get_ocr_engine():
    global _ocr_engine
    if _ocr_engine is None:
        from paddleocr import PaddleOCR
        import os
        lang = os.getenv("OCR_LANGUAGES", "chi_sim+eng").replace("_", "")
        lang_map = {"chisimeng": "ch", "chieng": "ch", "eng": "en"}
        paddle_lang = lang_map.get(lang, "ch")
        _ocr_engine = PaddleOCR(use_angle_cls=True, lang=paddle_lang, show_log=False)
    return _ocr_engine

@router.post("/extract", response_model=OCRResponse)
async def extract_text(
    file: UploadFile = File(...),
    languages: Optional[str] = Form(None),
):
    from PIL import Image
    import io

    contents = await file.read()
    image = Image.open(io.BytesIO(contents))

    engine = get_ocr_engine()
    result = engine.ocr(image, cls=True)

    ocr_results = []
    full_text_parts = []

    if result and result[0]:
        for line in result[0]:
            text = line[1][0]
            confidence = line[1][1]
            ocr_results.append(OCRResult(text=text, confidence=confidence, language="auto"))
            full_text_parts.append(text)

    return OCRResponse(
        results=ocr_results,
        full_text="\n".join(full_text_parts),
    )

@router.post("/batch", response_model=List[OCRResponse])
async def batch_extract(files: List[UploadFile] = File(...)):
    results = []
    for file in files:
        res = await extract_text(file=file)
        results.append(res)
    return results
