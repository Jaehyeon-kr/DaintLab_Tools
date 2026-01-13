"""작은 ResNet과 Transformer 모델 정의"""

import torch
import torch.nn as nn


class TinyResNet(nn.Module):
    """매우 작은 ResNet - 시각화를 위한 예제 모델"""

    def __init__(self, num_classes: int = 10):
        super().__init__()

        # 초기 Conv
        self.conv1 = nn.Conv2d(3, 16, kernel_size=3, padding=1)
        self.bn1 = nn.BatchNorm2d(16)
        self.relu = nn.ReLU(inplace=True)
        self.pool1 = nn.MaxPool2d(2, 2)

        # Residual Block 1
        self.conv2 = nn.Conv2d(16, 32, kernel_size=3, padding=1)
        self.bn2 = nn.BatchNorm2d(32)
        self.conv3 = nn.Conv2d(32, 32, kernel_size=3, padding=1)
        self.bn3 = nn.BatchNorm2d(32)
        self.downsample1 = nn.Conv2d(16, 32, kernel_size=1)
        self.pool2 = nn.MaxPool2d(2, 2)

        # Residual Block 2
        self.conv4 = nn.Conv2d(32, 64, kernel_size=3, padding=1)
        self.bn4 = nn.BatchNorm2d(64)
        self.conv5 = nn.Conv2d(64, 64, kernel_size=3, padding=1)
        self.bn5 = nn.BatchNorm2d(64)
        self.downsample2 = nn.Conv2d(32, 64, kernel_size=1)

        # Global Average Pool + FC
        self.avgpool = nn.AdaptiveAvgPool2d((1, 1))
        self.fc = nn.Linear(64, num_classes)

    def forward(self, x):
        # Initial
        x = self.conv1(x)
        x = self.bn1(x)
        x = self.relu(x)
        x = self.pool1(x)

        # Block 1
        identity = self.downsample1(x)
        x = self.conv2(x)
        x = self.bn2(x)
        x = self.relu(x)
        x = self.conv3(x)
        x = self.bn3(x)
        x = x + identity
        x = self.relu(x)
        x = self.pool2(x)

        # Block 2
        identity = self.downsample2(x)
        x = self.conv4(x)
        x = self.bn4(x)
        x = self.relu(x)
        x = self.conv5(x)
        x = self.bn5(x)
        x = x + identity
        x = self.relu(x)

        # Classifier
        x = self.avgpool(x)
        x = torch.flatten(x, 1)
        x = self.fc(x)
        return x


class MiniTransformer(nn.Module):
    """매우 작은 Transformer - 시각화를 위한 예제 모델"""

    def __init__(
        self,
        vocab_size: int = 1000,
        d_model: int = 64,
        nhead: int = 4,
        num_layers: int = 2,
        num_classes: int = 10,
        max_seq_len: int = 32,
    ):
        super().__init__()

        self.embedding = nn.Embedding(vocab_size, d_model)
        self.pos_embedding = nn.Embedding(max_seq_len, d_model)

        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=nhead,
            dim_feedforward=d_model * 4,
            dropout=0.1,
            activation="gelu",
            batch_first=True,
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)

        self.layer_norm = nn.LayerNorm(d_model)
        self.fc = nn.Linear(d_model, num_classes)

    def forward(self, x):
        seq_len = x.size(1)
        positions = torch.arange(seq_len, device=x.device).unsqueeze(0)

        x = self.embedding(x) + self.pos_embedding(positions)
        x = self.transformer(x)
        x = self.layer_norm(x)
        x = x.mean(dim=1)  # Global average pooling
        x = self.fc(x)
        return x


def get_model(model_name: str) -> nn.Module:
    """모델 이름으로 모델 인스턴스 반환"""
    models = {
        "tiny_resnet": TinyResNet,
        "mini_transformer": MiniTransformer,
    }
    if model_name not in models:
        raise ValueError(f"Unknown model: {model_name}")
    return models[model_name]()
