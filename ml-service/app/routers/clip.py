from fastapi import APIRouter, UploadFile, File
from typing import List, Optional
from pydantic import BaseModel
import numpy as np

router = APIRouter()

class CLIPResponse(BaseModel):
    embedding: List[float]
    dimension: int

_clip_model = None

def get_clip_model():
    global _clip_model
    if _clip_model is None:
        from sentence_transformers import SentenceTransformer
        import os
        model_name = os.getenv("CLIP_MODEL", "XLM-Roberta-Large-Vit-B-16Plus")
        try:
            _clip_model = SentenceTransformer(model_name)
        except Exception:
            _clip_model = SentenceTransformer("sentence-transformers/clip-ViT-B-32")
    return _clip_model

@router.post("/embed", response_model=CLIPResponse)
async def embed_image(file: UploadFile = File(...)):
    from PIL import Image
    import io

    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")

    model = get_clip_model()
    embedding = model.encode(image, normalize_embeddings=True)

    return CLIPResponse(
        embedding=embedding.tolist(),
        dimension=len(embedding),
    )

@router.post("/embed-text")
async def embed_text(text: str):
    model = get_clip_model()
    embedding = model.encode(text, normalize_embeddings=True)
    return {"embedding": embedding.tolist(), "dimension": len(embedding)}

@router.post("/batch-embed", response_model=List[CLIPResponse])
async def batch_embed(files: List[UploadFile] = File(...)):
    from PIL import Image
    import io

    images = []
    for file in files:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        images.append(image)

    model = get_clip_model()
    embeddings = model.encode(images, normalize_embeddings=True, batch_size=16)

    results = []
    for emb in embeddings:
        results.append(CLIPResponse(embedding=emb.tolist(), dimension=len(emb)))
    return results
