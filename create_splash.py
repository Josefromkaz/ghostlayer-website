from PIL import Image, ImageDraw, ImageFont
import os

def create_splash():
    # Создаем папку assets, если нет
    if not os.path.exists("assets"):
        os.makedirs("assets")

    # Параметры
    width, height = 400, 250
    bg_color = (33, 150, 243) # Flet Blue
    text_color = (255, 255, 255)
    
    img = Image.new('RGB', (width, height), color=bg_color)
    d = ImageDraw.Draw(img)
    
    # Пытаемся загрузить шрифт, иначе дефолтный
    try:
        font_large = ImageFont.truetype("arial.ttf", 36)
        font_small = ImageFont.truetype("arial.ttf", 14)
    except IOError:
        font_large = ImageFont.load_default()
        font_small = ImageFont.load_default()

    # Рисуем текст
    d.text((width/2, height/2 - 20), "GhostLayer", fill=text_color, anchor="mm", font=font_large)
    d.text((width/2, height/2 + 20), "Loading components...", fill=text_color, anchor="mm", font=font_small)
    
    # Рамка
    d.rectangle([0, 0, width-1, height-1], outline=(255, 255, 255), width=2)

    img.save("assets/splash.png")
    print("Splash screen created: assets/splash.png")

if __name__ == "__main__":
    create_splash()
