from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import ocr, clip, face

app = FastAPI(title="AI Album ML Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ocr.router, prefix="/api/ml/ocr", tags=["OCR"])
app.include_router(clip.router, prefix="/api/ml/clip", tags=["CLIP"])
app.include_router(face.router, prefix="/api/ml/face", tags=["Face"])

@app.get("/health")
async def health():
    return {"status": "ok"}
