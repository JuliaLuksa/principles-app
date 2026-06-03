#!/usr/bin/env python3
"""Tiny dev server with no-cache headers, so browser always picks up edits."""
import http.server
import socketserver
import sys
import os

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

if __name__ == '__main__':
    port = int(os.environ.get('PORT') or (sys.argv[1] if len(sys.argv) > 1 else 8765))
    directory = os.path.dirname(os.path.abspath(__file__))
    os.chdir(directory)
    with socketserver.TCPServer(('', port), NoCacheHandler) as httpd:
        print(f'Dev server (no cache) on http://localhost:{port} serving {directory}')
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
