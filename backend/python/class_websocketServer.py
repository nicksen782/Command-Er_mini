# SHARED
import time
import sys
import json
import io
import timeit
# SHARED

# WEBSOCKETS SERVER
from simple_websocket_server import WebSocketServer, WebSocket
# WEBSOCKETS SERVER

class C_WebSocketServer:
    parent=False
    serverInstance=False

    def __init__(self, parent):
        print(f"WEBSOCKETSERVER START")
        self.parent=parent
        self.handler.parent = self.parent

    def is_json(self, myjson):
        resp = False
        try:
            resp = json.loads(myjson)
        except ValueError as e:
            return False
        return resp
    
    class handler(WebSocket):
        parent=False

        def handle(self):
            try:
                # Check if the data is JSON and get it if it is.
                # jsonObj = C_WebSocketServer.is_json(self.data)
                jsonObj = self.parent.c_websocketserver.is_json(self.data)

                # JSON-based requests.
                if jsonObj:
                    if jsonObj['mode'] == "updateVram":
                        jsonObj = {}
                        jsonObj['mode'] = "updateVram"
                        jsonObj['data'] = "TEST"
                        self.send_message( json.dumps(jsonObj, ensure_ascii=False) )

                        # _VRAM = jsonObj['data']

                        # # Pass the _VRAM, draw to screen, return framebuffer.
                        # start1 = time.time()
                        # try:
                        #     resp = self.parent.c_gfx.updateVram(_VRAM)
                        # except Exception as ex:
                        #     print(f"Error in updateVram, ex:{ex}")
                        #     resp = rgbaImgToBGRA(tilesetImage2)
                        #     fb[:] = resp
                        # end1 = time.time()
                        
                        # print(f"updateVram: {format( ((end1 - start1) * 1000), '.2f') } ms")
                        # self.send_message(resp.tobytes())

                    # CATCH-ALL.
                    else:
                        jsonObj = {}
                        jsonObj['mode'] = "UNKNOWN_REQUEST"
                        jsonObj['data'] = self.data
                        self.send_message( json.dumps(jsonObj, ensure_ascii=False) )
                    
                # TEXT-based requests.
                else: 
                    # Initial connectivity test.
                    if self.data == "PING":
                        jsonObj = {}
                        jsonObj['mode'] = "PING"
                        jsonObj['data'] = "PONG"
                        self.send_message( json.dumps(jsonObj, ensure_ascii=False) )

                    # Request battery data.
                    elif self.data == "getBatteryData":
                        jsonObj = {}
                        jsonObj['mode'] = "getBatteryData"
                        jsonObj['data'] =  self.parent.c_battery.getBatteryData()
                        self.send_message( json.dumps(jsonObj, ensure_ascii=False) )

                    # CATCH-ALL.
                    else:
                        jsonObj = {}
                        jsonObj['mode'] = "UNKNOWN_REQUEST"
                        jsonObj['data'] = self.data
                        self.send_message( json.dumps(jsonObj, ensure_ascii=False) )
            except Exception as ex:
                print(f"Error in ... , ex:{ex}")

        def connected(self):
            print(self.address, 'CONNECTED')
            jsonObj = {}
            jsonObj['mode'] = "CONNECT"
            jsonObj['data'] = "CONNECTED"
            self.send_message( json.dumps(jsonObj, ensure_ascii=False) )

        def handle_close(self):
            print(self.address, 'CLOSED', self)

    def startServer(self):
        print("Starting: WebSocketServer")
        conf = self.parent.config['python']['ws']
        self.handler.parent = self.parent
        self.serverInstance = WebSocketServer( conf['host'], conf['port'], self.handler)
        # print(f"\"websockets_server\" started http://{HOST_NAME}:{PORT}")
        # self.serverInstance.serve_forever()
