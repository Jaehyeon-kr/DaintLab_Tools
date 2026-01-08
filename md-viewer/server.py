#!/usr/bin/env python3
"""
MD Viewer - Simple Markdown viewer server
Usage: python server.py [port]
"""

import http.server
import socketserver
import json
import os
import urllib.parse
from pathlib import Path

PORT = int(os.environ.get('PORT', 3000))
DEFAULT_DIR = '/nas/home/qmdlghfl3/home/2026/Bagel'

class MDViewerHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(Path(__file__).parent / 'public'), **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        query = urllib.parse.parse_qs(parsed.query)

        if parsed.path == '/api/browse':
            self.handle_browse(query)
        elif parsed.path == '/api/read':
            self.handle_read(query)
        elif parsed.path == '/api/files':
            self.handle_files(query)
        else:
            super().do_GET()

    def send_json(self, data):
        response = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', len(response))
        self.end_headers()
        self.wfile.write(response)

    def handle_browse(self, query):
        target_dir = query.get('dir', [DEFAULT_DIR])[0]

        try:
            items = []
            for item in os.listdir(target_dir):
                full_path = os.path.join(target_dir, item)
                is_dir = os.path.isdir(full_path)
                is_md = item.endswith('.md')

                if is_dir or is_md:
                    items.append({
                        'name': item,
                        'path': full_path,
                        'isDirectory': is_dir,
                        'isMd': is_md
                    })

            # Sort: directories first, then alphabetically
            items.sort(key=lambda x: (not x['isDirectory'], x['name'].lower()))

            self.send_json({
                'success': True,
                'items': items,
                'dir': target_dir,
                'parent': os.path.dirname(target_dir)
            })
        except Exception as e:
            self.send_json({'success': False, 'error': str(e)})

    def handle_read(self, query):
        file_path = query.get('path', [None])[0]

        if not file_path:
            self.send_json({'success': False, 'error': 'path parameter required'})
            return

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            self.send_json({
                'success': True,
                'content': content,
                'filename': os.path.basename(file_path)
            })
        except Exception as e:
            self.send_json({'success': False, 'error': str(e)})

    def handle_files(self, query):
        target_dir = query.get('dir', [DEFAULT_DIR])[0]

        try:
            files = []
            for item in os.listdir(target_dir):
                if item.endswith('.md'):
                    full_path = os.path.join(target_dir, item)
                    stat = os.stat(full_path)
                    files.append({
                        'name': item,
                        'path': full_path,
                        'mtime': stat.st_mtime
                    })

            # Sort by modification time (newest first)
            files.sort(key=lambda x: x['mtime'], reverse=True)

            self.send_json({
                'success': True,
                'files': files,
                'dir': target_dir
            })
        except Exception as e:
            self.send_json({'success': False, 'error': str(e)})


def main():
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else PORT

    with socketserver.TCPServer(("", port), MDViewerHandler) as httpd:
        print(f"MD Viewer running at http://localhost:{port}")
        print(f"Default directory: {DEFAULT_DIR}")
        print("Press Ctrl+C to stop")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down...")


if __name__ == '__main__':
    main()
