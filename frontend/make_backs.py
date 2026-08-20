from PIL import Image

img_path = r"C:\Users\acer\.gemini\antigravity\brain\5e766f17-372e-4ec2-ae00-1e26dad97379\chars_back_1787253610974.jpg"
out_path = r"c:\Users\acer\Desktop\synthetic\frontend\public\assets\backs.png"

# The image is 4:1 aspect ratio, let's say it has 8 columns. Let's just crop out the top-left 4 characters from the back.
# Actually it has many characters in a row. We'll just grab a chunk from the top row.
img = Image.open(img_path).convert("RGBA")
width, height = img.size

# Assuming it's a grid, let's just make the white background transparent
datas = img.getdata()
newData = []
for item in datas:
    if item[0] > 240 and item[1] > 240 and item[2] > 240:
        newData.append((255, 255, 255, 0))
    else:
        newData.append(item)

img.putdata(newData)
img.save(out_path, "PNG")
print(f"Saved {out_path} with size {width}x{height}")
