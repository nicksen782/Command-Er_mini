# SHARED
import time
import sys
import json
import io
import timeit
import traceback
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

        except ValueError as ex:
            # print(f"Error in is_json: {ex}")
            return False

        return resp
    
    class handler(WebSocket):
        parent=False

        def handle(self):
            try:
                # Determine the type of data that was sent.
                type=""
                try:
                    if isinstance(self.data, bytearray):
                        type="binary"
                    elif isinstance(self.data, str):
                        jsonObj = self.parent.c_websocketserver.is_json(self.data)
                        if jsonObj:
                            type="json"
                        else:
                            type="text"
                except Exception as ex:
                    print(f"Error in websocket handler: type check: ex: {ex}")
                    return

                # BINARY-based requests.
                if type == "binary":
                    # Let the client know that we are done with the lcd update.
                    jsonObj = {}
                    jsonObj['mode'] = "BINARY_DONE"
                    jsonObj['data'] = resp
                    self.send_message( json.dumps(jsonObj, ensure_ascii=False) )

                # JSON-based requests.
                elif type == "json": 
                    if jsonObj['mode'] == "PING":
                        jsonObj = {}
                        jsonObj['mode'] = "PING"
                        jsonObj['data'] = "PONG"
                        self.send_message( json.dumps(jsonObj, ensure_ascii=False) )

                    # CATCH-ALL.
                    else:
                        jsonObj = {}
                        jsonObj['mode'] = "UNKNOWN_REQUEST"
                        jsonObj['data'] = self.data
                        self.send_message( json.dumps(jsonObj, ensure_ascii=False) )

                # TEXT-based requests.
                elif type == "text": 
                    # Initial connectivity test.
                    if self.data == "PING":
                        jsonObj = {}
                        jsonObj['mode'] = "PING"
                        jsonObj['data'] = "PONG"
                        self.send_message( json.dumps(jsonObj, ensure_ascii=False) )

                    # Request battery data.
                    elif self.data == "GET_BATTERY":
                        jsonObj = {}
                        jsonObj['mode'] = "GET_BATTERY"
                        try:
                            jsonObj['data'] =  self.parent.c_battery.getBatteryData()
                        except Exception as ex:
                            traceback.print_exc()
                            print(f"Error in websocket 'GET_BATTERY' ({type}): ex: {ex}")
                        self.send_message( json.dumps(jsonObj, ensure_ascii=False) )

                    # CATCH-ALL.
                    else:
                        jsonObj = {}
                        jsonObj['mode'] = "UNKNOWN_REQUEST"
                        jsonObj['data'] = self.data
                        self.send_message( json.dumps(jsonObj, ensure_ascii=False) )

                # CATCH-ALL.
                else:
                    jsonObj = {}
                    jsonObj['mode'] = "UNKNOWN_REQUEST"
                    jsonObj['data'] = self.data
                    self.send_message( json.dumps(jsonObj, ensure_ascii=False) )

            except Exception as ex:
                print(f"Error in websocket handler: ex: {ex}")

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
