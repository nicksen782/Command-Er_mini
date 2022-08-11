# SHARED
import json
import os
import sys
# SHARED

os.chdir(sys.path[0])
os.chdir("../..")

# CLASSES
from class_battery          import C_Battery
# from class_graphics         import C_Graphics
# from class_webServer        import C_WebServer
from class_websocketServer  import C_WebSocketServer
# CLASSES

class Server:
    c_battery=False
    c_gfx=False
    c_webserver=False
    config=False
    def __init__(self):
        print(f"SERVER START")
        
        # Get the config.
        with open('public/shared/config.json', 'r') as myfile:
            self.config = json.load( myfile )

        # Instantiate classes.
        self.c_battery         = C_Battery(self)
        # self.c_gfx             = C_Graphics(self)
        # self.c_webserver       = C_WebServer(self)
        self.c_websocketserver = C_WebSocketServer(self)

        # Start servers/services. (The rest of the program is just responses from services.)
        if self.config['toggles']['isActive_pythonWsServer']:
            # Start the server.
            self.c_websocketserver.startServer()
            
            # Send the init string.
            print(self.config['python']['initString'], flush=True)

            # Serve forever.
            self.c_websocketserver.serverInstance.serve_forever()

        # elif self.config['toggles']['isActive_pythonHttpServer']:
        #     # Start the server.
        #     self.c_webserver.startServer()
            
        #     # Send the init string.
        #     print(self.config['python']['initString'], flush=True)

        #     # Serve forever.
        #     self.c_webserver.serverInstance.serve_forever()

# Start
server = Server()
