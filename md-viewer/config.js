/**
 * MD Viewer Configuration
 *
 * 이 파일에서 기본 경로와 포트를 설정하세요.
 */

module.exports = {
    // 서버 포트 (환경변수 PORT가 있으면 그것을 사용)
    PORT: process.env.PORT || 3000,

    // 기본 루트 디렉토리 - 여기를 수정하세요!
    // 예: '/home/user/documents'
    //     '/nas/data/markdown-files'
    //     process.cwd()  // 현재 작업 디렉토리
    DEFAULT_ROOT: process.env.MD_ROOT || '/user/path',

    // 브라우저 디렉토리 탐색 시작 경로
    BROWSE_ROOT: process.env.BROWSE_ROOT || '/user/path'
};
