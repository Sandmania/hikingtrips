import os

PHOTOS_DIR = 'photos'
THUMBS_DIR = os.path.join(PHOTOS_DIR, 'thumbs')
OUTPUT_FILE = 'index.html'
EXT = '.jpeg'

def get_filenames(directory):
    return {f for f in os.listdir(directory) if f.lower().endswith(EXT)}

def main():
    # Read filenames
    try:
        thumbs = get_filenames(THUMBS_DIR)
        photos = get_filenames(PHOTOS_DIR)
    except FileNotFoundError as e:
        print(f"[ERROR] Missing directory: {e}")
        return

    # Match photos and thumbnails
    matched = thumbs & photos
    only_thumbs = thumbs - photos
    only_photos = photos - thumbs

    if only_thumbs:
        print("[WARNING] Thumbnails without full-sized photos:")
        for f in sorted(only_thumbs):
            print(f" - {f}")
    
    if only_photos:
        print("[WARNING] Full-sized photos without thumbnails:")
        for f in sorted(only_photos):
            print(f" - {f}")
    
    print(f"[INFO] Generating gallery for {len(matched)} matched images...")

    with open(OUTPUT_FILE, 'w') as f:
        f.write(generate_html(sorted(matched)))

    print(f"[DONE] Gallery written to {OUTPUT_FILE}")

def generate_html(filenames):
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Photo Gallery</title>
    <style>
        body {{
            font-family: sans-serif;
            background: #f0f0f0;
            margin: 0;
            padding: 1rem;
        }}
        .gallery {{
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 10px;
        }}
        .gallery img {{
            width: 100%;
            cursor: pointer;
            border-radius: 4px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }}
        .modal {{
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0; top: 0;
            width: 100%; height: 100%;
            background: rgba(0,0,0,0.8);
            align-items: center;
            justify-content: center;
        }}
        .modal img {{
            max-width: 90%;
            max-height: 90%;
            border: 4px solid white;
            border-radius: 8px;
        }}
        .modal:target {{
            display: flex;
        }}
    </style>
</head>
<body>

<h1>Photo Gallery</h1>
<div class="gallery">
    {''.join(generate_img_html(name) for name in filenames)}
</div>

<div id="modal" class="modal" onclick="this.style.display='none'">
    <img id="modal-img" src="" alt="Full size">
</div>

<script>
document.querySelectorAll('.gallery img').forEach(img => {{
    img.addEventListener('click', () => {{
        document.getElementById('modal-img').src = img.dataset.full;
        document.getElementById('modal').style.display = 'flex';
    }});
}});
</script>

</body>
</html>
"""

def generate_img_html(filename):
    thumb_path = f"{THUMBS_DIR}/{filename}".replace("\\", "/")
    full_path = f"{PHOTOS_DIR}/{filename}".replace("\\", "/")
    return f'<img src="{thumb_path}" data-full="{full_path}" alt="{filename}">\n'

if __name__ == '__main__':
    main()