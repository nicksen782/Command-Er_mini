# SHARED
import time
import sys
import json
import io
import timeit
# SHARED

# WEB SERVER
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
# WEB SERVER

class C_WebServer:
    parent=False
    serverInstance=False

    def __init__(self, parent):
        self.parent=parent
        print(f"WEBSERVER START")

    class handler(SimpleHTTPRequestHandler):
        """Python HTTP Server that handles GET and POST requests"""
        parent=False

        def do_GET(self):
            # Parse the url
            parsed_url = urlparse(self.path)
            parsed_qs  = parse_qs(parsed_url.query)
            path=parsed_url.path

            if path == '/favicon.ico':
                self.send_response(200, "OK")
				# self.send_header('Content-Type', 'text/plain')
                # self.send_header('Content-Type', 'application/json')
                self.end_headers()
                # return

            elif path == '/ping':
                self.send_response(200, "OK")
                self.send_header('Content-Type', 'text/plain')
                self.end_headers()
                self.wfile.write(bytes("PONG", 'utf-8'))

            elif path == '/getBatteryData':
                self.send_response(200, "OK")
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(bytes(json.dumps(self.parent.c_battery.getBatteryData(), ensure_ascii=False), 'utf-8'))

            else:
                self.send_response(200, "OK")
                self.send_header('Content-Type', 'text/plain')
                self.end_headers()
                self.wfile.write(bytes("UNKNOWN REQUEST", 'utf-8'))

    def startServer(self):
        print("Starting: WebServer")
        conf = self.parent.config['python']['http']
        self.handler.parent = self.parent
        self.serverInstance = HTTPServer( (conf['host'], conf['port']), self.handler)
        # print(f"\"web_server\" started http://{HOST_NAME}:{PORT}")
        self.serverInstance.serve_forever()
