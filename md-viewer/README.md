# MD Viewer

Markdown 파일을 브라우저에서 바로 볼 수 있는 뷰어입니다.

## 기능

- Markdown 렌더링 (GitHub 스타일)
- Mermaid 다이어그램 지원
- 코드 하이라이팅 (Python, JavaScript 등)
- 디렉토리 탐색
- Table of Contents (TOC)
- 다크 테마

## 설치 및 실행

```bash
cd md-viewer
npm install
npm start
```

브라우저에서 열기: http://localhost:3000

## 설정 변경

### 방법 1: config.js 수정 (권장)

`config.js` 파일을 열어서 경로를 수정하세요:

```javascript
module.exports = {
    PORT: 3000,

    // 기본 루트 디렉토리 - 여기를 수정하세요!
    DEFAULT_ROOT: '/your/markdown/folder',

    // 브라우저 탐색 시작 경로
    BROWSE_ROOT: '/your/home/folder',
};
```

### 방법 2: 환경변수 사용

```bash
# 기본 경로 변경
MD_ROOT=/your/path npm start

# 브라우저 탐색 루트 변경
BROWSE_ROOT=/home npm start

# 포트 변경
PORT=8080 npm start

# 모두 함께 사용
MD_ROOT=/docs BROWSE_ROOT=/home PORT=8080 npm start
```

## 파일 구조

```
md-viewer/
├── config.js          # 설정 파일 (경로, 포트)
├── server.js          # Express 서버
├── package.json
├── public/
│   └── index.html     # 프론트엔드
└── README.md
```

## API

| Endpoint | 설명 |
|----------|------|
| `GET /api/config` | 서버 설정 정보 |
| `GET /api/browse?dir=PATH` | 디렉토리 탐색 |
| `GET /api/files?dir=PATH` | MD 파일 목록 |
| `GET /api/read?path=PATH` | MD 파일 읽기 |
