# DaintLab_Tools

연구실 공용 도구 모음

---

## MD-Viewer

Markdown 파일을 브라우저에서 바로 볼 수 있는 뷰어입니다.

### 주요 기능
- Markdown 렌더링 (GitHub 스타일)
- Mermaid 다이어그램 지원
- 코드 하이라이팅
- 디렉토리 탐색
- 다크 테마

### 빠른 시작

```bash
cd md-viewer
npm install
npm start
# http://localhost:3000 접속
```

경로 설정
config.js에서 기본 경로를 수정하세요:

```
module.exports = {
    DEFAULT_ROOT: '/your/markdown/folder',  // 기본 디렉토리
    BROWSE_ROOT: '/your/home',              // 탐색 시작 경로
    PORT: 3000
};
```
또는 환경변수 사용:


MD_ROOT=/your/path npm start
자세한 내용은 md-viewer/README.md 참고



