const express = require('express');
const fs = require('fs');
const path = require('path');

// 설정 파일 로드
const config = require('./config');

const app = express();
const PORT = config.PORT;
const DEFAULT_ROOT = config.DEFAULT_ROOT;
const BROWSE_ROOT = config.BROWSE_ROOT;

// 정적 파일 서빙
app.use(express.static(path.join(__dirname, 'public')));

// 설정 정보 API (클라이언트에서 기본 경로 확인용)
app.get('/api/config', (req, res) => {
    res.json({
        defaultRoot: DEFAULT_ROOT,
        browseRoot: BROWSE_ROOT
    });
});

// MD 파일 목록 API
app.get('/api/files', (req, res) => {
    const targetDir = req.query.dir || DEFAULT_ROOT;

    try {
        const files = fs.readdirSync(targetDir)
            .filter(file => file.endsWith('.md'))
            .map(file => ({
                name: file,
                path: path.join(targetDir, file),
                mtime: fs.statSync(path.join(targetDir, file)).mtime
            }))
            .sort((a, b) => b.mtime - a.mtime);

        res.json({ success: true, files, dir: targetDir });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

// MD 파일 내용 읽기 API
app.get('/api/read', (req, res) => {
    const filePath = req.query.path;

    if (!filePath) {
        return res.json({ success: false, error: 'path parameter required' });
    }

    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        res.json({ success: true, content, filename: path.basename(filePath) });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

// 디렉토리 탐색 API
app.get('/api/browse', (req, res) => {
    const targetDir = req.query.dir || BROWSE_ROOT;

    try {
        const items = fs.readdirSync(targetDir)
            .map(item => {
                const fullPath = path.join(targetDir, item);
                try {
                    const stat = fs.statSync(fullPath);
                    return {
                        name: item,
                        path: fullPath,
                        isDirectory: stat.isDirectory(),
                        isMd: item.endsWith('.md')
                    };
                } catch {
                    return null;
                }
            })
            .filter(item => item && (item.isDirectory || item.isMd))
            .sort((a, b) => {
                if (a.isDirectory && !b.isDirectory) return -1;
                if (!a.isDirectory && b.isDirectory) return 1;
                return a.name.localeCompare(b.name);
            });

        res.json({
            success: true,
            items,
            dir: targetDir,
            parent: path.dirname(targetDir)
        });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`  MD Viewer`);
    console.log(`========================================`);
    console.log(`  URL: http://localhost:${PORT}`);
    console.log(`  Default directory: ${DEFAULT_ROOT}`);
    console.log(`  Browse root: ${BROWSE_ROOT}`);
    console.log(`========================================`);
    console.log(`\nTo change default path, edit config.js`);
    console.log(`Or use environment variables:`);
    console.log(`  MD_ROOT=/your/path npm start`);
    console.log(`  PORT=8080 npm start\n`);
});
