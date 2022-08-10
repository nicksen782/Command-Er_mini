# SHARED
import sys
import json
import io
import time
import timeit
# SHARED

# GRAPHICS
from PIL import Image, ImageDraw
import numpy as np
import cv2
# GRAPHICS

#
coordsByIndex=False
indexByCoords=False
#

with open('public/shared/config.json', 'r') as myfile:
    config = myfile.read()
    config = json.loads(config)

with open('public/shared/coordsByIndex.json', 'r') as myfile:
    coordsByIndex = json.loads(myfile.read())

with open('public/shared/indexByCoords.json', 'r') as myfile:
    indexByCoords = json.loads(myfile.read())

with open('public/shared/tileCoords.json', 'r') as myfile:
    tileCoords = json.loads(myfile.read())

with open('public/shared/tilenamesByIndex.json', 'r') as myfile:
    tilenamesByIndex = json.loads(myfile.read())

class C_Graphics:
    parent=False

    PIL_tilesetImage=False
    PIL_tileImageCache=False
    PIL_lcdImage=False
    PIL_lcdImage_draw=False

    OCV_tilesetImage=False
    OCV_tileImageCache=False
    OCV_lcdImage=False
    OCV_lcdImage_draw=False

    tileWidth=False
    tileHeight=False
    rows=False
    cols=False
    outputWidth=False
    outputHeight=False
    tilesInCol=False
    fb=False
    _VRAM=False

    currentlyDrawing=False

    def __init__(self, parent):
        self.parent = parent
        print(f"GRAPHICS START (OCV)")

    def __init__(self, parent):
        self.parent = parent
        gfx = self.parent.config['python']['gfx']
        print(f"GRAPHICS START ({gfx})")

        # Set the dimensions for the tiles/display.
        self.tilesetFile  = config['lcd']['tileset']['file']
        self.tileWidth    = config['lcd']['tileset']['tileWidth']
        self.tileHeight   = config['lcd']['tileset']['tileHeight']
        self.rows         = config['lcd']['tileset']['rows']
        self.cols         = config['lcd']['tileset']['cols']
        self.outputWidth  = config['lcd']['width']
        self.outputHeight = config['lcd']['height']
        self.tilesInCol   = config['lcd']['tileset']['tilesInCol']

        # Map the screen as Numpy array
        # N.B. Numpy stores in format HEIGHT then WIDTH, not WIDTH then HEIGHT!
        # c is the number of channels, 4 because BGRA
        self.fb = np.memmap('/dev/fb0', dtype='uint8', mode='r+', shape=(config['lcd']['height'],config['lcd']['width'],4)) 

        # VRAM (internal)
        # self._VRAM = np.array(_VRAM)
        self._VRAM = np.zeros(shape = (self.rows * self.cols *3), dtype = np.uint8)

        if gfx == "PIL":
            # Get and load the tileset image.
            self.PIL_tilesetImage = Image.open("public/shared/" + self.tilesetFile) 

            # Create the image to draw to the lcd (think: canvas.)
            self.PIL_lcdImage = Image.new(mode="RGBA", size=(config['lcd']['width'], config['lcd']['height']))
            self.PIL_lcdImage_draw = ImageDraw.Draw(self.PIL_lcdImage)

            # Clear the LCD screen.
            self.PIL_progressImage("color", 4)

            # Create the tile image cache.
            self.PIL_tileImageCache = [0]* len(tileCoords)
            i=0
            for key in tileCoords:
                self.PIL_tileImageCache[i] = self.PIL_getTileImage(key, "image") 
                i+=1

        elif gfx == "OCV":
            # https://docs.opencv.org/3.4/d8/d01/group__imgproc__color__conversions.html
            print("OCV")
            # Get and load the tileset image.
            self.OCV_tilesetImage = cv2.imread("public/shared/" + self.tilesetFile, cv2.IMREAD_UNCHANGED) 
            self.OCV_tilesetImage = cv2.cvtColor(self.OCV_tilesetImage, cv2.COLOR_BGR2BGRA)

            # Create the image to draw to the lcd (think: canvas.)
            self.OCV_lcdImage = np.zeros((self.outputHeight,self.outputWidth,4), np.uint8)

            # Clear the LCD screen.
            self.OCV_progressImage("color", 5)
            time.sleep(0.25)
            self.OCV_progressImage("color", 1)
            time.sleep(0.25)
            self.OCV_progressImage("color", 2)
            time.sleep(0.25)
            self.OCV_progressImage("color", 3)
            time.sleep(0.25)
            self.OCV_progressImage("color", 4)
            time.sleep(0.25)

            # Create the tile image cache.
            self.OCV_tileImageCache = [0]* len(tileCoords)
            i=0
            for key in tileCoords:
                self.OCV_tileImageCache[i] = self.OCV_getTileImage(key, "image") 
                i+=1

            # Draw some test tiles.
            self.OCV_drawTile(32, 1, 1, self.OCV_lcdImage)
            self.OCV_drawTile(33, 1, 3, self.OCV_lcdImage)
            self.fb[:] = self.OCV_lcdImage
    
    # OCV: Fills the screen with a color or an image.
    def OCV_progressImage(self, type, which):
        if type == "color":
            # RED
            if which == 1:
                self.OCV_lcdImage[:] = (255,0,0, 255)
            # GREEN
            elif which == 2:
                self.OCV_lcdImage[:] = (0,255,0, 255)
            # BLUE
            elif which == 3:
                self.OCV_lcdImage[:] = (0,0,255, 255)
            # BLACK
            elif which == 4:
                self.OCV_lcdImage[:] = (0,0,0, 255)
            elif which == 5:
                self.OCV_lcdImage[:] = (255,255,255, 255)
            # INVALID
            else:
                print(f"{type}, {which} - INVALID 'which'")
                return
        
        # elif type == "image":
            # if which == 1:
                # image = Image.open("public/shared/" + "tileset_8x8.png") 
            # elif which == 2:
                # image = Image.open("public/shared/" + "tileset_8x8.png") 
            # elif which == 3:
                # image = Image.open("public/shared/" + "tileset_8x8.png") 
            # else:
                # print(f"{type}, {which} - INVALID 'which'")
                # return

        # OUTPUT
        self.fb[:] = self.OCV_lcdImage

    # OCV: USED ONLY DURING __init__
    def OCV_getTileImage(self, key, asType):
        # Make sure that the requested key exists.
        if tileCoords.get(key) == None:
            coords = tileCoords["nochar"]
        else:
            coords = tileCoords[key]

        left   = coords['L'] * self.tileWidth
        top    = coords['T'] * self.tileHeight
        right  = left + self.tileWidth
        bottom = top  + self.tileHeight

        # Crop the image.
        cropped_img = self.OCV_tilesetImage[top:bottom, left:right]
        # OCV_getTileImage: @, image, 256, (8, 8, 4)
        # print(f"OCV_getTileImage: key:{key}, asType:{asType}, size:{cropped_img.size}, shape:{cropped_img.shape}")
        return cropped_img

    # OCV: Draws a tile to an image.
    def OCV_drawTile(self, tileId, x, y, image):
        y_start = (y*self.tileHeight)
        y_end   = (y*self.tileHeight) + self.tileHeight
        x_start = (x*self.tileWidth)
        x_end   = (x*self.tileWidth) + self.tileWidth

        # OCV_drawTile: tileId:67, x:0, y:0, size:256, shape:(8, 8, 4)
        # print(f"OCV_drawTile: tileId:{tileId}, x:{x}, y:{y}, size:{self.OCV_tileImageCache[tileId].size}, shape:{self.OCV_tileImageCache[tileId].shape}")

        # y_start:0, y_end:8, x_start:0, x_end:8
        # print(f"y_start:{y_start}, y_end:{y_end}, x_start:{x_start}, x_end:{x_end}")

        image[y_start:y_end, x_start:x_end] = self.OCV_tileImageCache[tileId]

    def OCV_getDrawLoopDrawCoords(self, xcol, yrow):
        y_start = (yrow*self.tileHeight)
        y_end   = (yrow*self.tileHeight) + self.tileHeight
        x_start = (xcol*self.tileWidth)
        x_end   = (xcol*self.tileWidth) + self.tileWidth
        return (y_start, y_end, x_start, x_end)

    # OCV: Updates the LCD display by using VRAM provided.
    def OCV_drawLoopDraw(self, _VRAM, _VRAM_index, xcol, yrow, changed):
        # return
        # Get copies of the required tiles. (Otherwise the assignment is by reference.)
        # if changed[0]:
        #     layer1 = self.OCV_tileImageCache[_VRAM[_VRAM_index + 0]].copy()
        # if changed[1]:
        #     layer1 = self.OCV_tileImageCache[_VRAM[_VRAM_index + 0]].copy()
        #     layer2 = self.OCV_tileImageCache[_VRAM[_VRAM_index + 1]].copy()
        # if changed[2]:
        #     layer1 = self.OCV_tileImageCache[_VRAM[_VRAM_index + 0]].copy()
        #     layer2 = self.OCV_tileImageCache[_VRAM[_VRAM_index + 1]].copy()
        #     layer3 = self.OCV_tileImageCache[_VRAM[_VRAM_index + 2]].copy()

        layer1 = self.OCV_tileImageCache[_VRAM[_VRAM_index + 0]].copy()
        layer2 = self.OCV_tileImageCache[_VRAM[_VRAM_index + 1]].copy()
        # layer3 = self.OCV_tileImageCache[_VRAM[_VRAM_index + 2]].copy()

        # https://stackoverflow.com/a/44623098/2731377
        # Copy the first layer into the resulting image
        res      = layer1[:] 

        # Copy only the pixels that have an alpha value > 0
        cnd      = layer2[:, :, 3] != 0
        res[cnd] = layer2[cnd]
        # cnd      = layer3[:, :, 3] != 0
        # res[cnd] = layer3[cnd]

        # Draw the new image.
        coords = self.OCV_getDrawLoopDrawCoords(xcol, yrow)
        self.OCV_lcdImage[coords[0]:coords[1], coords[2]:coords[3]] = res

    def OCV_updateVram(self, _VRAM_bytearray):
        # Create a type-view of the bytearray.
        _VRAM = np.frombuffer(_VRAM_bytearray, dtype="uint8") 

        # DRAWING LOOP.
        for index in range(0, (self.rows*self.cols), 1):
            # Get xcol, yrow, _VRAM_index by using the index.
            xcol=coordsByIndex[index][0]
            yrow=coordsByIndex[index][1]
            _VRAM_index=coordsByIndex[index][2]

            # Check if we are going to do a write this time.
            # doDraw=False
            doDraw=True
            changed =[False]*self.tilesInCol
            for v in range(self.tilesInCol):
                # Set doDraw if the tile_id and tile_id_old are different.
                thisIndex = _VRAM_index + v
                if _VRAM[thisIndex] != self._VRAM[thisIndex]:
                    doDraw=True
                    changed[v] = True
                    # break

            if doDraw:
                self.OCV_drawLoopDraw(_VRAM, _VRAM_index, xcol, yrow, changed)
        #
        self._VRAM = _VRAM

        # SEND THE UPDATE TO THE LCD.
        self.fb[:] = self.OCV_lcdImage

    # PIL
    def PIL_progressImage(self, type, which):
        if type == "color":
            image = Image.new(mode="RGBA", size=(config['lcd']['width'], config['lcd']['height']))
            draw = ImageDraw.Draw(image)

            # RED
            if which == 1:
                draw.rectangle([(0,0),image.size], fill = (255,0,0, 255) )
            # GREEN
            elif which == 2:
                draw.rectangle([(0,0),image.size], fill = (0,255,0, 255) )
            # BLUE
            elif which == 3:
                draw.rectangle([(0,0),image.size], fill = (0,0,255, 255) )
            # BLACK
            elif which == 4:
                draw.rectangle([(0,0),image.size], fill = (0,0,0, 255) )
            # INVALID
            else:
                print(f"{type}, {which} - INVALID 'which'")
                return

        elif type == "image":
            if which == 1:
                image = Image.open("public/shared/" + "tileset_8x8.png") 
            elif which == 2:
                image = Image.open("public/shared/" + "tileset_8x8.png") 
            elif which == 3:
                image = Image.open("public/shared/" + "tileset_8x8.png") 
            else:
                print(f"{type}, {which} - INVALID 'which'")
                return
        
        # OUTPUT
        pix = self.PIL_rgbaImgToBGRA(image)
        self.fb[:] = pix

    def PIL_rgbaImgToBGRA(self, img):
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
    
    def PIL_getTileImage(self, key, asType):
        # tilesetImage
        # tileWidth
        # tileHeight
        # outputWidth
        # outputHeight

        # Make sure that the requested key exists.
        if tileCoords.get(key) == None:
            coords = tileCoords["nochar"]
        else:
            coords = tileCoords[key]
        
        # Generate the coords.
        left   = coords['L'] * self.tileWidth
        top    = coords['T'] * self.tileHeight
        right  = left + self.tileWidth
        bottom = top  + self.tileHeight

        box          = (left, top, right, bottom)
        tileImage    = self.PIL_tilesetImage.crop(box)

        # Return the data as the type that was requested.
        if asType == "image":
            return tileImage
        elif asType == "nparray":
            img_byte_arr = io.BytesIO()
            tileImage.save(img_byte_arr, format='PNG')
            return tileImage

    def PIL_updateVram(self, _VRAM_bytearray):
        _VRAM = np.frombuffer(_VRAM_bytearray, dtype="uint8") 

        for index in range(0, (self.rows*self.cols), 1):
            _VRAM = np.frombuffer(_VRAM_bytearray, dtype="uint8") 

            # Get xcol, yrow, _VRAM_index by using the index.
            xcol=coordsByIndex[index][0]
            yrow=coordsByIndex[index][1]
            _VRAM_index=coordsByIndex[index][2]
            
            # Create the left and top box.
            box = (xcol * self.tileWidth, yrow * self.tileHeight)
            dims = ( box[0]+self.tileWidth, box[1]+self.tileHeight )

            # Check if we are going to do a write this time.
            doDraw=False
            # doDraw=True
            for v in range(self.tilesInCol):
                # Set doDraw if the tile_id and tile_id_old are different.
                thisIndex = _VRAM_index + v
                if _VRAM[thisIndex] != self._VRAM[thisIndex]:
                    doDraw=True
                    break

            if doDraw:
                # Create the new replacement tile.
                newTile = Image.new(mode="RGBA", size=(self.tileWidth, self.tileHeight), color="black" ) 
                # self.PIL_lcdImage.paste(newTile, (box[0], box[1]), newTile)
                self.PIL_lcdImage_draw.rectangle((box[0], box[1], dims[0], dims[1]), fill=(0, 0, 0, 0))
                
                for v in range(self.tilesInCol):
                    # Get the tile id.
                    tile_id = _VRAM[_VRAM_index + v]

                    # Draw the tile to new tile.
                    newTile.paste(self.PIL_tileImageCache[tile_id], (0, 0), self.PIL_tileImageCache[tile_id])
                    
                    # Draw the tile to the lcdImage
                    # self.PIL_lcdImage.paste(self.PIL_tileImageCache[tile_id], (box[0], box[1]), self.PIL_tileImageCache[tile_id])
                    
                    # Draw the new tile to the lcdImage
                    # self.PIL_lcdImage.paste(self.PIL_tileImageCache[tile_id], (box[0], box[1]), self.PIL_tileImageCache[tile_id])

                # Draw the new tile to the lcdImage
                # self.PIL_lcdImage.paste(self.PIL_tileImageCache[tile_id], (box[0], box[1]), self.PIL_tileImageCache[tile_id])
                self.PIL_lcdImage.paste(newTile, (box[0], box[1]), newTile)
        
        # Update local _VRAM.
        self._VRAM = _VRAM

        # Update the framebuffer.
        pix = self.PIL_rgbaImgToBGRA(self.PIL_lcdImage)

        self.fb[:] = pix
