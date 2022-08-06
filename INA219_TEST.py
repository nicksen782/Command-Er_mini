# INA219
import smbus
import time
# INA219

# SHARED
import sys
import json
import io
import timeit
# SHARED

# GRAPHICS
from PIL import Image, ImageDraw
import numpy as np

with open('backend/config.json', 'r') as myfile:
    config = myfile.read()
    config = json.loads(config)
    config = config['lcd']

    # Break-out the required values. 
    tilesetImage = Image.open(config['tilesets'][ config['activeTileset'] ]['file'])
    tileWidth    = config['tilesets'][ config['activeTileset'] ]['s']['tileWidth']
    tileHeight   = config['tilesets'][ config['activeTileset'] ]['s']['tileHeight']
    outputWidth  = config['width']
    outputHeight = config['height']

    tilesetImage2 = Image.open("pic.png")
    tileWidth2    = config['tilesets'][ config['activeTileset'] ]['s']['tileWidth']
    tileHeight2   = config['tilesets'][ config['activeTileset'] ]['s']['tileHeight']
    outputWidth2  = config['width']
    outputHeight2 = config['height']

    # Map the screen as Numpy array
    # N.B. Numpy stores in format HEIGHT then WIDTH, not WIDTH then HEIGHT!
    # c is the number of channels, 4 because BGRA
    fb = np.memmap('/dev/fb0', dtype='uint8',mode='w+', shape=(config['height'],config['width'],4)) 

    lcdImage = Image.new(mode="RGBA", size=(config['width'],config['height']))
    # print(tilesetImage.format, tilesetImage.size, tilesetImage.mode)
    ImgCache = {}

    # _VRAM = np.array(_VRAM)
    cols=int(outputWidth/tileWidth)
    rows=int(outputHeight/tileHeight)
    internal_VRAM = np.zeros(shape = (rows, cols, 3), dtype = np.uint8)

with open('backend/tile_coords.json', 'r') as myfile:
    tile_coords=myfile.read()
    tile_coords = json.loads(tile_coords)
    tileIds_node = {}
    tileIds = []
# GRAPHICS

# WEB SERVER
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
# WEB SERVER

# WEBSOCKETS SERVER
from simple_websocket_server import WebSocketServer, WebSocket
# WEBSOCKETS SERVER

# Config Register (R/W)
_REG_CONFIG                 = 0x00
# SHUNT VOLTAGE REGISTER (R)
_REG_SHUNTVOLTAGE           = 0x01

# BUS VOLTAGE REGISTER (R)
_REG_BUSVOLTAGE             = 0x02

# POWER REGISTER (R)
_REG_POWER                  = 0x03

# CURRENT REGISTER (R)
_REG_CURRENT                = 0x04

# CALIBRATION REGISTER (R/W)
_REG_CALIBRATION            = 0x05

class BusVoltageRange:
    """Constants for ``bus_voltage_range``"""
    RANGE_16V               = 0x00      # set bus voltage range to 16V
    RANGE_32V               = 0x01      # set bus voltage range to 32V (default)

class Gain:
    """Constants for ``gain``"""
    DIV_1_40MV              = 0x00      # shunt prog. gain set to  1, 40 mV range
    DIV_2_80MV              = 0x01      # shunt prog. gain set to /2, 80 mV range
    DIV_4_160MV             = 0x02      # shunt prog. gain set to /4, 160 mV range
    DIV_8_320MV             = 0x03      # shunt prog. gain set to /8, 320 mV range

class ADCResolution:
    """Constants for ``bus_adc_resolution`` or ``shunt_adc_resolution``"""
    ADCRES_9BIT_1S          = 0x00      #  9bit,   1 sample,     84us
    ADCRES_10BIT_1S         = 0x01      # 10bit,   1 sample,    148us
    ADCRES_11BIT_1S         = 0x02      # 11 bit,  1 sample,    276us
    ADCRES_12BIT_1S         = 0x03      # 12 bit,  1 sample,    532us
    ADCRES_12BIT_2S         = 0x09      # 12 bit,  2 samples,  1.06ms
    ADCRES_12BIT_4S         = 0x0A      # 12 bit,  4 samples,  2.13ms
    ADCRES_12BIT_8S         = 0x0B      # 12bit,   8 samples,  4.26ms
    ADCRES_12BIT_16S        = 0x0C      # 12bit,  16 samples,  8.51ms
    ADCRES_12BIT_32S        = 0x0D      # 12bit,  32 samples, 17.02ms
    ADCRES_12BIT_64S        = 0x0E      # 12bit,  64 samples, 34.05ms
    ADCRES_12BIT_128S       = 0x0F      # 12bit, 128 samples, 68.10ms

class Mode:
    """Constants for ``mode``"""
    POWERDOW                = 0x00      # power down
    SVOLT_TRIGGERED         = 0x01      # shunt voltage triggered
    BVOLT_TRIGGERED         = 0x02      # bus voltage triggered
    SANDBVOLT_TRIGGERED     = 0x03      # shunt and bus voltage triggered
    ADCOFF                  = 0x04      # ADC off
    SVOLT_CONTINUOUS        = 0x05      # shunt voltage continuous
    BVOLT_CONTINUOUS        = 0x06      # bus voltage continuous
    SANDBVOLT_CONTINUOUS    = 0x07      # shunt and bus voltage continuous

class INA219:
    def __init__(self, i2c_bus=1, addr=0x40):
        self.bus = smbus.SMBus(i2c_bus);
        self.addr = addr

        # Set chip to known config values to start
        self._cal_value = 0
        self._current_lsb = 0
        self._power_lsb = 0
        self.set_calibration_32V_2A()

    def read(self,address):
        data = self.bus.read_i2c_block_data(self.addr, address, 2)
        return ((data[0] * 256 ) + data[1])

    def write(self,address,data):
        temp = [0,0]
        temp[1] = data & 0xFF
        temp[0] =(data & 0xFF00) >> 8
        self.bus.write_i2c_block_data(self.addr,address,temp)

    def set_calibration_32V_2A(self):
        """Configures to INA219 to be able to measure up to 32V and 2A of current. Counter
           overflow occurs at 3.2A.
           ..note :: These calculations assume a 0.1 shunt ohm resistor is present
        """
        # By default we use a pretty huge range for the input voltage,
        # which probably isn't the most appropriate choice for system
        # that don't use a lot of power.  But all of the calculations
        # are shown below if you want to change the settings.  You will
        # also need to change any relevant register settings, such as
        # setting the VBUS_MAX to 16V instead of 32V, etc.

        # VBUS_MAX = 32V             (Assumes 32V, can also be set to 16V)
        # VSHUNT_MAX = 0.32          (Assumes Gain 8, 320mV, can also be 0.16, 0.08, 0.04)
        # RSHUNT = 0.1               (Resistor value in ohms)

        # 1. Determine max possible current
        # MaxPossible_I = VSHUNT_MAX / RSHUNT
        # MaxPossible_I = 3.2A

        # 2. Determine max expected current
        # MaxExpected_I = 2.0A

        # 3. Calculate possible range of LSBs (Min = 15-bit, Max = 12-bit)
        # MinimumLSB = MaxExpected_I/32767
        # MinimumLSB = 0.000061              (61uA per bit)
        # MaximumLSB = MaxExpected_I/4096
        # MaximumLSB = 0,000488              (488uA per bit)

        # 4. Choose an LSB between the min and max values
        #    (Preferrably a roundish number close to MinLSB)
        # CurrentLSB = 0.0001 (100uA per bit)
        self._current_lsb = 1  # Current LSB = 100uA per bit

        # 5. Compute the calibration register
        # Cal = trunc (0.04096 / (Current_LSB * RSHUNT))
        # Cal = 4096 (0x1000)

        self._cal_value = 4096

        # 6. Calculate the power LSB
        # PowerLSB = 20 * CurrentLSB
        # PowerLSB = 0.002 (2mW per bit)
        self._power_lsb = .002  # Power LSB = 2mW per bit

        # 7. Compute the maximum current and shunt voltage values before overflow
        #
        # Max_Current = Current_LSB * 32767
        # Max_Current = 3.2767A before overflow
        #
        # If Max_Current > Max_Possible_I then
        #    Max_Current_Before_Overflow = MaxPossible_I
        # Else
        #    Max_Current_Before_Overflow = Max_Current
        # End If
        #
        # Max_ShuntVoltage = Max_Current_Before_Overflow * RSHUNT
        # Max_ShuntVoltage = 0.32V
        #
        # If Max_ShuntVoltage >= VSHUNT_MAX
        #    Max_ShuntVoltage_Before_Overflow = VSHUNT_MAX
        # Else
        #    Max_ShuntVoltage_Before_Overflow = Max_ShuntVoltage
        # End If

        # 8. Compute the Maximum Power
        # MaximumPower = Max_Current_Before_Overflow * VBUS_MAX
        # MaximumPower = 3.2 * 32V
        # MaximumPower = 102.4W

        # Set Calibration register to 'Cal' calculated above
        self.write(_REG_CALIBRATION,self._cal_value)

        # Set Config register to take into account the settings above
        self.bus_voltage_range = BusVoltageRange.RANGE_32V
        self.gain = Gain.DIV_8_320MV
        self.bus_adc_resolution = ADCResolution.ADCRES_12BIT_32S
        self.shunt_adc_resolution = ADCResolution.ADCRES_12BIT_32S
        self.mode = Mode.SANDBVOLT_CONTINUOUS
        self.config = self.bus_voltage_range << 13 | \
                      self.gain << 11 | \
                      self.bus_adc_resolution << 7 | \
                      self.shunt_adc_resolution << 3 | \
                      self.mode
        self.write(_REG_CONFIG,self.config)

    def getShuntVoltage_mV(self):
        self.write(_REG_CALIBRATION,self._cal_value)
        value = self.read(_REG_SHUNTVOLTAGE)
        if value > 32767:
            value -= 65535
        return value * 0.01

    def getBusVoltage_V(self):
        self.write(_REG_CALIBRATION,self._cal_value)
        self.read(_REG_BUSVOLTAGE)
        return (self.read(_REG_BUSVOLTAGE) >> 3) * 0.004

    def getCurrent_mA(self):
        value = self.read(_REG_CURRENT)
        if value > 32767:
            value -= 65535
        return value * self._current_lsb

    def getPower_W(self):
        self.write(_REG_CALIBRATION,self._cal_value)
        value = self.read(_REG_POWER)
        if value > 32767:
            value -= 65535
        return value * self._power_lsb

def getBatteryData():
    # Generate the data values. 
    ina219        = INA219(addr=0x43)                  # Create an INA219 instance.
    bus_voltage   = ina219.getBusVoltage_V()           # Voltage on V- (load side)
    shunt_voltage = ina219.getShuntVoltage_mV() / 1000 # Voltage between V+ and V- across the shunt
    current       = ina219.getCurrent_mA()             # Current in mA
    power         = ina219.getPower_W()                # Power in W
    p             = (bus_voltage - 3)/1.2*100          # Percentage.
    if(p > 100):p = 100
    if(p < 0):p = 0
    
    # Store the data values to an object.
    jsonObj = {}
    jsonObj['V']  = (bus_voltage)
    jsonObj['A']  = (current/1000)
    jsonObj['W']  = (power)
    jsonObj['%']  = (p)
    jsonObj['PV'] = (bus_voltage + shunt_voltage)
    jsonObj['SV'] = (shunt_voltage)

    # Return the object. 
    return jsonObj

def genLookupForNode():
    for key, val in tile_coords.items():
        tileIds_node.update( {key : len(tileIds)} )
        tileIds.append( key )

def getTileImage(key, asType):
    # tilesetImage
    # tileWidth
    # tileHeight
    # outputWidth
    # outputHeight

    # Make sure that the requested key exists.
    if tile_coords.get(key) == None:
        coords = tile_coords["nochar"]
    else:
        coords = tile_coords[key]
    
    # Generate the coords.
    left   = coords['L']*tileWidth
    top    = coords['T']*tileHeight
    right  = left+tileWidth
    bottom = top+tileHeight

    box          = (left, top, right, bottom)
    tileImage    = tilesetImage.crop(box)

    # Return the data as the type that was requested.
    if asType == "image":
        return tileImage
    elif asType == "nparray":
        img_byte_arr = io.BytesIO()
        tileImage.save(img_byte_arr, format='PNG')
        return tileImage

def test1():
    im = tilesetImage
    start1 = time.time()
    pix = rgbaImgToBGRA(im)
    end1 = time.time()
    start2 = time.time()
    fb[:] = pix
    end2 = time.time()
    print(f"rgbaImgToBGRA: {format( ((end1 - start1) * 1000), '.2f') } ms")
    print(f"update lcd   : {format( ((end2 - start2) * 1000), '.2f') } ms")

# def updateVram(_VRAM):
def genBox(x, y):
    # Generate the destination coords.
    left   = x * tileWidth
    top    = y * tileHeight
    right  = left + (tileWidth)
    bottom = top  + (tileHeight)
    box = (left, top, right, bottom)

    return box

def drawTile(tileName, box, destImage):
    # Generate the tile image if needed. Use the cached copy otherwise.
    # if ImgCache.get(tileName) == None:
    #     ImgCache[tileName] = getTileImage(tileName, "image")
    
    # # Get the tile image.
    # tileImg = ImgCache[tileName] 
    tileImg =  getTileImage(tileName, "image") 

    # Paste the tile image to the lcdImage
    destImage.paste(tileImg, (box[0], box[1]), tileImg)
    # destImage.paste(tileImg, box, tileImg)

def clearImage(image):
    draw = ImageDraw.Draw(image)
    draw.rectangle([(0,0),image.size], fill = (0,0,0, 255) )

def updateVram(_VRAM):
    # _VRAM = np.array(_VRAM, dtype='uint8')
    # f_VRAM = _VRAM.flatten()
    clearImage(lcdImage)
    
    # Update the framebuffer.
    # pix = rgbaImgToBGRA(tilesetImage2)
    pix = rgbaImgToBGRA(lcdImage)
    fb[:] = pix

    # Return the pix for the framebuffer.
    return pix

def OLDupdateVram(_VRAM):
    _VRAM = np.array(_VRAM)
    clearImage(lcdImage)
    for y in range(len(_VRAM)):
        for x in range(len(_VRAM[y])):
            box = genBox(x,y)
            for v in range(len(_VRAM[y][x])):
                tileId = _VRAM[y][x][v]
                tileName = tileIds[tileId]
                try:
                    drawTile(tileName, box, lcdImage)
                except Exception as ex:
                    print(f"error2, ex: {ex}")
    
    # Update the framebuffer.
    # pix = rgbaImgToBGRA(tilesetImage2)
    pix = rgbaImgToBGRA(lcdImage)
    fb[:] = pix

    # Return the pix for the framebuffer.
    return pix

def rgbaImgToBGRA(img):
    # rgbaToBGRA(n, pix)

    # Get the dimensions of the image.
    w, h = img.size

    # Convert image to array.
    src_n = np.array(img)

    # Create and zero-out a new numpy array.
    pix = np.zeros(shape = (h, w, 4), dtype = np.uint8)

    # Convert.
    pix[:,:, [2,1,0,3]] = src_n[:,:, [0,1,2,3]]

    # Return.
    return pix

def is_json(myjson):
    resp = False
    try:
        resp = json.loads(myjson)
    except ValueError as e:
        return False
    return resp

if __name__=='__main__':
    # Fill the screen with a single color. 
    fb[:] = [255,0,0,255]
    time.sleep(0.1)

    use_web_server = 0
    use_websockets_server = 0

    # Check for valid command-line args.
    if len(sys.argv) == 3:
        if sys.argv[1] == "ws":
            use_websockets_server = 1
        elif sys.argv[1] == "http":
            use_web_server = 1
        else:
            print(f"Invalid argument: {sys.argv[1]}")
            print(f"Valid arguments are: 'ws', 'http'")
        PORT=int(sys.argv[2])
    else: 
        print("ERROR: Need to specify TYPE ['ws', 'http'] and PORT number.")
        sys.exit(0)

    # print(f"argv: {str(sys.argv)}")

    # TEST1
    test1()
    time.sleep(0.1)
    
    genLookupForNode()

    HOST_NAME="0.0.0.0"   # Listen on all interfaces.
    # HOST_NAME="127.0.0.1" # Listen only on the loopback interface.
    
    if use_web_server == 1:
        class web_server(SimpleHTTPRequestHandler):
            """Python HTTP Server that handles GET and POST requests"""
            def do_GET(self):
                # Parse the url
                parsed_url = urlparse(self.path)
                parsed_qs  = parse_qs(parsed_url.query)
                path=parsed_url.path

                if path == '/favicon.ico':
                    self.send_response(200, "OK")
                    # self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    return

                # print(f"self.path : {self.path}")
                # print(f"path      : {path}")
                # print(f"parsed_url: {parsed_url}")
                # print(f"parsed_qs : {parsed_qs}")
                # print(f"qs 1      : {str(parsed_qs)}")

                if path == '/getBatteryData':
                    self.send_response(200, "OK")
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(bytes(json.dumps(getBatteryData(), ensure_ascii=False), 'utf-8'))

                elif path == '/ping':
                    self.send_response(200, "OK")
                    self.send_header('Content-Type', 'text/plain')
                    self.end_headers()
                    self.wfile.write(bytes("PONG", 'utf-8'))

                elif path == '/getGetTileImage':
                    self.send_response(200, "OK")
                    self.send_header('Content-Type', 'text/plain')
                    self.end_headers()

                    print(f"{parsed_qs['tile'][0]}")
                    img = getTileImage( parsed_qs['tile'][0], "image" )
                    # img = getTileImage( parsed_qs['tile'][0], "nparray" )
                    self.wfile.write( img )

                else:
                    self.send_response(200, "OK")
                    self.send_header('Content-Type', 'text/plain')
                    self.end_headers()
                    self.wfile.write(bytes("UNKNOWN REQUEST", 'utf-8'))

        print(f"INA219_srv: \"web_server\" started http://{HOST_NAME}:{PORT}")
        server = HTTPServer((HOST_NAME, PORT), web_server)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            server.server_close()
            print("Server stopped successfully")
            sys.exit(0)
    elif use_websockets_server == 1:
        class websockets_server(WebSocket):
            def handle(self):
                # Check if the data is JSON and get it if it is.
                jsonObj = is_json(self.data)

                # JSON-based requests.
                if jsonObj:
                    if jsonObj['mode'] == "updateVram":
                        _VRAM = jsonObj['data']

                        # Pass the _VRAM, draw to screen, return framebuffer.
                        start1 = time.time()
                        try:
                            resp = updateVram(_VRAM)
                        except Exception as ex:
                            print(f"Error in updateVram, ex:{ex}")
                            resp = rgbaImgToBGRA(tilesetImage2)
                            fb[:] = resp
                        end1 = time.time()
                        
                        print(f"updateVram: {format( ((end1 - start1) * 1000), '.2f') } ms")
                        self.send_message(resp.tobytes())

                    # CATCH-ALL.
                    else:
                        jsonObj = {}
                        jsonObj['mode'] = "UNKNOWN_REQUEST"
                        jsonObj['data'] = self.data
                        self.send_message( json.dumps(jsonObj, ensure_ascii=False) )
                    
                # TEXT-based requests.
                else: 
                    # Initial connectivity test.
                    if self.data == "ping":
                        jsonObj = {}
                        jsonObj['mode'] = "ping"
                        jsonObj['data'] = "pong"
                        self.send_message( json.dumps(jsonObj, ensure_ascii=False) )

                    # Request battery data.
                    elif self.data == "getBatteryData":
                        jsonObj = {}
                        jsonObj['mode'] = "getBatteryData"
                        jsonObj['data'] = getBatteryData()
                        self.send_message( json.dumps(jsonObj, ensure_ascii=False) )

                    # Provided to node as a lookup to the tile ids used by Python.
                    elif self.data == "getTileIds":
                        jsonObj = {}
                        jsonObj['mode'] = "getTileIds"
                        jsonObj['data'] = tileIds_node
                        self.send_message( json.dumps(jsonObj, ensure_ascii=False) )

                    # DEBUG.
                    elif self.data == "getPythonTileIds":
                        jsonObj = {}
                        jsonObj['mode'] = "getPythonTileIds"
                        jsonObj['data'] = tileIds
                        self.send_message( json.dumps(jsonObj, ensure_ascii=False) )

                    # CATCH-ALL.
                    else:
                        jsonObj = {}
                        jsonObj['mode'] = "UNKNOWN_REQUEST"
                        jsonObj['data'] = self.data
                        self.send_message( json.dumps(jsonObj, ensure_ascii=False) )


            def connected(self):
                print(self.address, 'CONNECTED')
                jsonObj = {}
                jsonObj['mode'] = "CONNECT"
                jsonObj['data'] = "CONNECTED"
                self.send_message( json.dumps(jsonObj, ensure_ascii=False) )

            def handle_close(self):
                print(self.address, 'CLOSED', self)

        print(f"INA219_srv: \"websockets_server\" started http://{HOST_NAME}:{PORT}")
        server = WebSocketServer(HOST_NAME, PORT, websockets_server)
        server.serve_forever()
    else:
        print("Invalid server selection.")
    

