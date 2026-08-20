from PIL import Image
import os

img_path = r"c:\Users\acer\Desktop\synthetic\frontend\public\assets\sprites.jpg"
out_path = r"c:\Users\acer\Desktop\synthetic\frontend\public\assets\sprites.png"

img = Image.open(img_path).convert("RGBA")
datas = img.getdata()

newData = []
# Replace white (and near-white) with transparent
for item in datas:
    if item[0] > 240 and item[1] > 240 and item[2] > 240:
        newData.append((255, 255, 255, 0))
    else:
        newData.append(item)

img.putdata(newData)
img.save(out_path, "PNG")
print("Successfully converted to transparent PNG")
