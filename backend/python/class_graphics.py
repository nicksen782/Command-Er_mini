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

class C_Graphics:
    parent=False
    tilesetImage=False
    tileWidth=False
    tileHeight=False
    rows=False
    cols=False
    outputWidth=False
    outputHeight=False
    fb=False
    lcdImage=False
    _VRAM=False

    def __init__(self, parent):
        self.parent = parent
        print(f"GRAPHICS START")

        # Get and load the tileset image.
        self.tilesetFile  = config['lcd']['tileset']['file']
        self.tilesetImage = Image.open("public/shared/" + self.tilesetFile) 

        # Set the dimensions for the tiles/display.
        self.tileWidth    = config['lcd']['tileset']['tileWidth']
        self.tileHeight   = config['lcd']['tileset']['tileHeight']
        self.rows         = config['lcd']['tileset']['rows']
        self.cols         = config['lcd']['tileset']['cols']
        self.outputWidth  = config['lcd']['width']
        self.outputHeight = config['lcd']['height']

        # self.progressImage("color", 4)
        # # Map the screen as Numpy array
        # # N.B. Numpy stores in format HEIGHT then WIDTH, not WIDTH then HEIGHT!
        # # c is the number of channels, 4 because BGRA
        self.fb = np.memmap('/dev/fb0', dtype='uint8', mode='r+', shape=(config['lcd']['height'],config['lcd']['width'],4)) 

        # Create the image to draw to the lcd (think: canvas.)
        self.lcdImage = Image.new(mode="RGBA", size=(config['lcd']['width'], config['lcd']['height']))

        # self.progressImage("color", 1)
        # time.sleep(0.2)
        # self.progressImage("color", 2)
        # time.sleep(0.2)
        # self.progressImage("color", 3)
        # time.sleep(0.2)
        # self.progressImage("color", 4)
        # time.sleep(0.2)

        # VRAM (internal)
        # self._VRAM = np.array(_VRAM)
        self._VRAM = np.zeros(shape = (self.rows, self.cols, 3), dtype = np.uint8)

    def progressImage(self, type, which):
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
        pix = self.rgbaImgToBGRA(image)
        self.fb[:] = pix

    def rgbaImgToBGRA(self, img):
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

    def updateVram(self, _VRAM):
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

