# AI Model Viewer

PyTorch 딥러닝 모델의 구조와 추론 과정을 시각화하는 웹 애플리케이션입니다.

## 기능

- **2D/3D 모델 구조 시각화**: 레이어 간의 연결 관계를 시각적으로 표현
- **실시간 추론 시각화**: 입력 이미지가 각 레이어를 통과하는 과정을 애니메이션으로 표시
- **Feature Map 시각화**: 각 레이어의 활성화 맵을 viridis 컬러맵으로 표시
- **레이어 상세 정보**: 파라미터 수, input/output shape, 활성화 통계 등

## 지원 모델

- **Tiny ResNet**: 간단한 CNN 모델 (이미지 분류)
- **Mini Transformer**: 작은 Transformer 모델 (시퀀스 처리)

## 기술 스택

### Frontend
- Next.js 14 (App Router)
- React Three Fiber (3D 시각화)
- @react-three/drei (3D 컴포넌트)
- TailwindCSS

### Backend
- FastAPI
- PyTorch
- Matplotlib (Feature Map 시각화)

## 실행 방법

### Backend
```bash
cd backend
pip install -r requirements.txt
python main.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

브라우저에서 http://localhost:3000 접속

## 스크린샷

### 2D 뷰
레이어 구조를 트리 형태로 표시

### 3D 뷰
- 입력 이미지가 네트워크로 들어가는 과정 시각화
- 각 레이어를 클릭하면 상세 정보와 Feature Map 표시
- 마우스로 회전, 패닝, 줌 가능

## 라이센스

MIT
