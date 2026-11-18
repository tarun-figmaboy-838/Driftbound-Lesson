"""Local server for the Driftbound Briefing (the angle lesson).

Same as `python3 -m http.server`, but it serves this folder no matter where it is started from
and tells the browser not to cache anything, so a normal reload always runs the latest code.

usage: python3 serve.py [port]
"""
import http.server
import os
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8124
os.chdir(os.path.dirname(os.path.abspath(__file__)))
print(f'Driftbound Briefing is running at http://127.0.0.1:{port}  (close this window to stop it)')
http.server.ThreadingHTTPServer(('127.0.0.1', port), NoCacheHandler).serve_forever()
