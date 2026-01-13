"""PyTorch 모델 분석기 - 레이어 정보 추출"""
from __future__ import annotations

import torch
import torch.nn as nn
from typing import Any, List, Dict
from PIL import Image
import numpy as np
import base64
import io
from pathlib import Path


def analyze_model(model: nn.Module) -> List[Dict[str, Any]]:
    """모델의 레이어 정보를 분석하여 반환"""
    layers = []
    layer_id = 0

    def get_layer_info(name: str, module: nn.Module) -> dict[str, Any]:
        nonlocal layer_id
        layer_id += 1

        info = {
            "id": f"layer_{layer_id}",
            "name": name,
            "type": module.__class__.__name__,
            "params": {},
        }

        # 레이어 타입별 파라미터 추출
        if isinstance(module, nn.Conv2d):
            info["params"] = {
                "in_channels": module.in_channels,
                "out_channels": module.out_channels,
                "kernel_size": module.kernel_size,
                "stride": module.stride,
                "padding": module.padding,
            }
        elif isinstance(module, nn.Linear):
            info["params"] = {
                "in_features": module.in_features,
                "out_features": module.out_features,
            }
        elif isinstance(module, nn.BatchNorm2d):
            info["params"] = {
                "num_features": module.num_features,
            }
        elif isinstance(module, nn.Embedding):
            info["params"] = {
                "num_embeddings": module.num_embeddings,
                "embedding_dim": module.embedding_dim,
            }
        elif isinstance(module, nn.LayerNorm):
            info["params"] = {
                "normalized_shape": list(module.normalized_shape),
            }
        elif isinstance(module, nn.TransformerEncoderLayer):
            info["params"] = {
                "d_model": module.self_attn.embed_dim,
                "nhead": module.self_attn.num_heads,
            }
        elif isinstance(module, nn.TransformerEncoder):
            info["params"] = {
                "num_layers": module.num_layers,
            }
        elif isinstance(module, nn.MultiheadAttention):
            info["params"] = {
                "embed_dim": module.embed_dim,
                "num_heads": module.num_heads,
            }
        elif isinstance(module, (nn.MaxPool2d, nn.AvgPool2d)):
            info["params"] = {
                "kernel_size": module.kernel_size,
                "stride": module.stride,
            }
        elif isinstance(module, nn.AdaptiveAvgPool2d):
            info["params"] = {
                "output_size": module.output_size,
            }

        # 파라미터 수 계산
        total_params = sum(p.numel() for p in module.parameters(recurse=False))
        trainable_params = sum(
            p.numel() for p in module.parameters(recurse=False) if p.requires_grad
        )
        info["total_params"] = total_params
        info["trainable_params"] = trainable_params

        return info

    # 최상위 모듈들만 순회 (중첩된 것은 제외)
    for name, module in model.named_children():
        # 컨테이너 모듈은 건너뛰고 내부 레이어만 추출
        if isinstance(module, (nn.Sequential, nn.ModuleList)):
            for sub_name, sub_module in module.named_children():
                layers.append(get_layer_info(f"{name}.{sub_name}", sub_module))
        else:
            layers.append(get_layer_info(name, module))

    return layers


def get_model_summary(model: nn.Module) -> Dict[str, Any]:
    """모델 전체 요약 정보 반환"""
    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)

    return {
        "model_name": model.__class__.__name__,
        "total_params": total_params,
        "trainable_params": trainable_params,
        "layers": analyze_model(model),
    }


def activation_to_image(activation: torch.Tensor, size: int = 64) -> str:
    """Activation 텐서를 base64 이미지로 변환"""
    act_np = activation.cpu().numpy()

    if len(act_np.shape) == 4:  # CNN: [B, C, H, W]
        # 채널 평균으로 2D 히트맵 생성
        heatmap = act_np[0].mean(axis=0)
    elif len(act_np.shape) == 3:  # Transformer: [B, Seq, D]
        heatmap = act_np[0]
    elif len(act_np.shape) == 2:  # [B, D]
        # 1D를 2D로 변환
        d = act_np[0]
        side = int(np.ceil(np.sqrt(len(d))))
        padded = np.zeros(side * side)
        padded[:len(d)] = d
        heatmap = padded.reshape(side, side)
    elif len(act_np.shape) == 1:
        d = act_np
        side = int(np.ceil(np.sqrt(len(d))))
        padded = np.zeros(side * side)
        padded[:len(d)] = d
        heatmap = padded.reshape(side, side)
    else:
        return ""

    # 정규화 (0-255)
    if heatmap.max() != heatmap.min():
        heatmap = (heatmap - heatmap.min()) / (heatmap.max() - heatmap.min())
    heatmap = (heatmap * 255).astype(np.uint8)

    # 컬러맵 적용 (viridis 스타일)
    from matplotlib import cm
    colored = cm.viridis(heatmap / 255.0)[:, :, :3]  # RGB만
    colored = (colored * 255).astype(np.uint8)

    # PIL 이미지로 변환
    img = Image.fromarray(colored)
    img = img.resize((size, size), Image.Resampling.NEAREST)

    # base64로 인코딩
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode("utf-8")


def load_image_for_inference(image_path: str, target_size: int = 32) -> torch.Tensor:
    """이미지 파일을 로드하고 모델 입력용 텐서로 변환"""
    img = Image.open(image_path).convert("RGB")
    img = img.resize((target_size, target_size), Image.Resampling.BILINEAR)

    # numpy -> tensor, normalize to [-1, 1]
    img_np = np.array(img).astype(np.float32) / 255.0
    img_np = (img_np - 0.5) / 0.5  # normalize

    # HWC -> CHW -> BCHW
    tensor = torch.from_numpy(img_np).permute(2, 0, 1).unsqueeze(0)
    return tensor


def run_inference_with_activations(model: nn.Module, model_name: str, image_path: str = None) -> Dict[str, Any]:
    """이미지로 추론 실행하고 각 레이어의 activation 캡처"""
    model.eval()
    activations: Dict[str, torch.Tensor] = {}
    hooks = []

    # Hook 함수: 각 레이어의 출력을 저장
    def make_hook(name: str):
        def hook(module, inp, output):
            if isinstance(output, torch.Tensor):
                activations[name] = output.detach()
            elif isinstance(output, tuple) and len(output) > 0:
                activations[name] = output[0].detach() if isinstance(output[0], torch.Tensor) else None
        return hook

    # 모든 레이어에 hook 등록
    layer_id = 0
    layer_map = {}  # name -> layer_id 매핑

    for name, module in model.named_children():
        if isinstance(module, (nn.Sequential, nn.ModuleList)):
            for sub_name, sub_module in module.named_children():
                layer_id += 1
                full_name = f"{name}.{sub_name}"
                layer_map[full_name] = f"layer_{layer_id}"
                hooks.append(sub_module.register_forward_hook(make_hook(full_name)))
        else:
            layer_id += 1
            layer_map[name] = f"layer_{layer_id}"
            hooks.append(module.register_forward_hook(make_hook(name)))

    # 입력 생성
    input_image_base64 = None
    with torch.no_grad():
        if model_name == "tiny_resnet":
            if image_path and Path(image_path).exists():
                # 실제 이미지 로드
                model_input = load_image_for_inference(image_path, target_size=32)
                # 원본 이미지도 base64로
                with open(image_path, "rb") as f:
                    input_image_base64 = base64.b64encode(f.read()).decode("utf-8")
            else:
                model_input = torch.randn(1, 3, 32, 32)
        elif model_name == "mini_transformer":
            model_input = torch.randint(0, 1000, (1, 16))
        else:
            model_input = torch.randn(1, 3, 32, 32)

        output = model(model_input)

    # Hook 제거
    for hook in hooks:
        hook.remove()

    # 결과 생성
    steps = []
    step_idx = 0

    for name, layer_id_str in layer_map.items():
        activation = activations.get(name)
        if activation is not None:
            # Feature map 이미지 생성
            feature_map_image = activation_to_image(activation)

            steps.append({
                "step_index": step_idx,
                "layer_id": layer_id_str,
                "layer_name": name,
                "operation": type(dict(model.named_modules())[name.split('.')[0]]).__name__ if '.' not in name else "SubModule",
                "input_shape": list(activation.shape),
                "output_shape": list(activation.shape),
                "activation_stats": {
                    "mean": float(activation.mean()),
                    "std": float(activation.std()),
                    "min": float(activation.min()),
                    "max": float(activation.max()),
                },
                "feature_map_image": feature_map_image,
            })
            step_idx += 1

    return {
        "model_name": model_name,
        "input_shape": list(model_input.shape),
        "output_shape": list(output.shape) if isinstance(output, torch.Tensor) else [],
        "input_image": input_image_base64,
        "steps": steps,
    }