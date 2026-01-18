from PIL import Image
import os

def convert_png_to_ico(png_path, ico_path):
    try:
        img = Image.open(png_path)
        
        # Ensure image is square by cropping to center
        width, height = img.size
        new_size = min(width, height)
        
        left = (width - new_size)/2
        top = (height - new_size)/2
        right = (width + new_size)/2
        bottom = (height + new_size)/2

        img = img.crop((left, top, right, bottom))
        
        # Explicitly resize to 256x256 for the main icon layer
        img_256 = img.resize((256, 256), Image.Resampling.LANCZOS)
        
        # Create a list of sizes for the ICO file
        # 256x256 is CRITICAL for electron-builder
        icon_sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
        
        img_256.save(ico_path, format='ICO', sizes=icon_sizes)
        print(f"Successfully converted {png_path} to {ico_path} with 256x256 layer")
    except Exception as e:
        print(f"Error converting icon: {e}")

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    assets_dir = os.path.join(base_dir, "assets")
    png_icon = os.path.join(assets_dir, "icon.png")
    ico_icon = os.path.join(assets_dir, "icon.ico")
    
    if os.path.exists(png_icon):
        convert_png_to_ico(png_icon, ico_icon)
    else:
        print(f"Source icon not found: {png_icon}")