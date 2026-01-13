"""FastAPI 백엔드 서버"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path

from models import get_model
from analyzer import get_model_summary, run_inference_with_activations

app = FastAPI(title="AI Model Viewer API")

# 이미지 경로 설정 (backend 폴더의 부모인 ai_viewer/src/image.png)
BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent
IMAGE_PATH = PROJECT_ROOT / "src" / "image.png"

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ModelRequest(BaseModel):
    model_name: str


@app.get("/")
def root():
    return {"message": "AI Model Viewer API"}


@app.get("/models")
def list_models():
    """사용 가능한 모델 목록 반환"""
    return {
        "models": [
            {"id": "tiny_resnet", "name": "Tiny ResNet", "type": "CNN"},
            {"id": "mini_transformer", "name": "Mini Transformer", "type": "Transformer"},
        ]
    }


@app.get("/models/{model_name}")
def get_model_info(model_name: str):
    """특정 모델의 구조 정보 반환"""
    try:
        model = get_model(model_name)
        summary = get_model_summary(model)
        return summary
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/models/{model_name}/layers")
def get_model_layers(model_name: str):
    """모델의 레이어 정보만 반환"""
    try:
        model = get_model(model_name)
        summary = get_model_summary(model)
        return {"layers": summary["layers"]}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/inference/{model_name}")
def run_inference(model_name: str):
    """이미지로 추론 실행하고 activation 반환"""
    try:
        model = get_model(model_name)
        # CNN 모델이면 실제 이미지 사용
        image_path = str(IMAGE_PATH) if model_name == "tiny_resnet" and IMAGE_PATH.exists() else None
        result = run_inference_with_activations(model, model_name, image_path)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
