"""FastAPI 백엔드 서버 - 커스텀 모델 업로드 지원"""

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
from typing import Optional
import torch
import torch.nn as nn
import shutil
import uuid
import os

from models import get_model
from analyzer import get_model_summary, run_inference_with_activations

app = FastAPI(title="AI Model Viewer API")

# 디렉토리 설정
BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent
IMAGE_PATH = PROJECT_ROOT / "src" / "image.png"
UPLOAD_DIR = BACKEND_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# 업로드된 모델 저장소 (메모리)
uploaded_models: dict = {}

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
    """사용 가능한 모델 목록 반환 (기본 + 업로드된 모델)"""
    models = [
        {"id": "tiny_resnet", "name": "Tiny ResNet", "type": "CNN"},
        {"id": "mini_transformer", "name": "Mini Transformer", "type": "Transformer"},
    ]

    # 업로드된 모델 추가
    for model_id, info in uploaded_models.items():
        models.append({
            "id": model_id,
            "name": info.get("name", model_id),
            "type": info.get("model_type", "Custom").upper(),
            "custom": True
        })

    return {"models": models}


@app.post("/models/upload")
async def upload_model(
    file: UploadFile = File(...),
    name: str = Form(...),
    model_type: str = Form("cnn"),
    input_channels: int = Form(3),
    input_height: int = Form(32),
    input_width: int = Form(32),
):
    """PyTorch 모델 파일 업로드 (.pt, .pth)"""

    if not file.filename.endswith(('.pt', '.pth')):
        raise HTTPException(status_code=400, detail=".pt 또는 .pth 파일만 지원됩니다")

    model_id = f"custom_{uuid.uuid4().hex[:8]}"
    file_path = UPLOAD_DIR / f"{model_id}.pt"

    try:
        # 파일 저장
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 모델 로드 테스트
        model = torch.load(file_path, map_location="cpu", weights_only=False)

        if isinstance(model, dict):
            os.remove(file_path)
            raise HTTPException(
                status_code=400,
                detail="state_dict는 지원되지 않습니다. torch.save(model, path)로 저장된 전체 모델 파일을 업로드하세요."
            )

        # 모델 정보 저장
        uploaded_models[model_id] = {
            "name": name,
            "file_path": str(file_path),
            "model_type": model_type,
            "input_shape": [1, input_channels, input_height, input_width],
        }

        # 구조 분석
        summary = get_model_summary(model)

        return {
            "success": True,
            "model_id": model_id,
            "name": name,
            "structure": {
                "name": summary["model_name"],
                "total_params": summary["total_params"],
                "layers": summary["layers"],
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        if file_path.exists():
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"모델 로드 실패: {str(e)}")


@app.delete("/models/{model_id}")
def delete_model(model_id: str):
    """업로드된 모델 삭제"""
    if model_id not in uploaded_models:
        raise HTTPException(status_code=404, detail="모델을 찾을 수 없습니다")

    info = uploaded_models[model_id]
    file_path = Path(info["file_path"])
    if file_path.exists():
        os.remove(file_path)

    del uploaded_models[model_id]
    return {"success": True}


def _load_model(model_name: str) -> nn.Module:
    """모델 이름으로 모델 객체 반환 (기본 + 커스텀)"""
    if model_name in uploaded_models:
        info = uploaded_models[model_name]
        return torch.load(info["file_path"], map_location="cpu", weights_only=False)
    return get_model(model_name)


@app.get("/models/{model_name}")
def get_model_info(model_name: str):
    """특정 모델의 구조 정보 반환"""
    try:
        model = _load_model(model_name)
        summary = get_model_summary(model)
        return summary
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/models/{model_name}/layers")
def get_model_layers(model_name: str):
    """모델의 레이어 정보만 반환"""
    try:
        model = _load_model(model_name)
        summary = get_model_summary(model)
        return {"layers": summary["layers"]}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/inference/{model_name}")
def run_inference(model_name: str):
    """이미지로 추론 실행하고 activation 반환"""
    try:
        model = _load_model(model_name)

        # 이미지 경로 결정
        if model_name == "tiny_resnet" and IMAGE_PATH.exists():
            image_path = str(IMAGE_PATH)
        elif model_name in uploaded_models:
            # 커스텀 모델은 기본 이미지 사용 (있으면)
            image_path = str(IMAGE_PATH) if IMAGE_PATH.exists() else None
        else:
            image_path = None

        result = run_inference_with_activations(model, model_name, image_path)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
