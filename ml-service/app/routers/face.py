from fastapi import APIRouter, UploadFile, File
from typing import List, Optional
from pydantic import BaseModel
import numpy as np

router = APIRouter()

class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float

class FaceResult(BaseModel):
    bounding_box: BoundingBox
    embedding: Optional[List[float]] = None
    confidence: float

class FaceResponse(BaseModel):
    faces: List[FaceResult]

_face_model = None

def get_face_model():
    global _face_model
    if _face_model is None:
        import insightface
        from insightface.app import FaceAnalysis
        import os
        model_name = os.getenv("FACE_MODEL", "buffalo_l")
        _face_model = FaceAnalysis(name=model_name, providers=['CPUExecutionProvider'])
        _face_model.prepare(ctx_id=0, det_size=(640, 640))
    return _face_model

@router.post("/detect", response_model=FaceResponse)
async def detect_faces(file: UploadFile = File(...)):
    from PIL import Image
    import io
    import numpy as np

    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")
    img_array = np.array(image)

    model = get_face_model()
    faces = model.get(img_array)

    results = []
    for face in faces:
        bbox = face.bbox.astype(float)
        result = FaceResult(
            bounding_box=BoundingBox(
                x1=bbox[0],
                y1=bbox[1],
                x2=bbox[2],
                y2=bbox[3],
            ),
            confidence=float(face.det_score),
        )
        if face.embedding is not None:
            result.embedding = face.embedding.tolist()
        results.append(result)

    return FaceResponse(faces=results)

@router.post("/cluster")
async def cluster_faces(embeddings: List[List[float]], threshold: float = 0.5):
    from sklearn.cluster import DBSCAN

    if len(embeddings) == 0:
        return {"clusters": [], "labels": []}

    X = np.array(embeddings)
    clustering = DBSCAN(eps=threshold, min_samples=2, metric="cosine").fit(X)

    return {
        "clusters": clustering.labels_.tolist(),
        "n_clusters": len(set(clustering.labels_)) - (1 if -1 in clustering.labels_ else 0),
    }
