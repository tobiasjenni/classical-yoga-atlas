"""Assemble actual Blender outputs alongside source photographs for visual review."""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
root = Path(sys.argv[1])
entries = json.loads((root / 'inventory.json').read_text(encoding='utf-8'))
out = root / 'final-sheets'
out.mkdir(exist_ok=True)
def font(size):
    for name in ('C:/Windows/Fonts/arial.ttf', 'DejaVuSans.ttf'):
        try: return ImageFont.truetype(name, size)
        except OSError: pass
    return ImageFont.load_default()
for start in range(0, len(entries), 6):
    group = entries[start:start + 6]
    if not all((root / 'renders' / f"{e['order']:03}-{e['id']}-{view}.png").exists() for e in group for view in ('front', 'side', 'rear')):
        continue
    image = Image.new('RGB', (1120, len(group) * 310), '#f4f4ee')
    draw = ImageDraw.Draw(image)
    for row, entry in enumerate(group):
        y = row * 310
        draw.text((8, y + 4), f"{entry['order']:03} {entry['name']} | {entry['imageId']} | {entry['style']}", fill='#233c33', font=font(18))
        if entry['image']:
            source = ImageOps.contain(Image.open(entry['image']).convert('RGB'), (274, 274))
            image.paste(source, ((280-source.width)//2, y + 30 + (280-source.height)//2))
        else:
            draw.text((15,y+110),'HYP text reference\nNo source photograph',fill='#4b6255',font=font(18))
        for col, view in enumerate(('front', 'side', 'rear'), 1):
            render = Image.open(root / 'renders' / f"{entry['order']:03}-{entry['id']}-{view}.png").convert('RGB').resize((280,280))
            image.paste(render,(col*280,y+30))
            draw.text((col*280+6,y+31),view,fill='#33473b',font=font(14))
    image.save(out / f'sheet-{start//6+1:02}.jpg', quality=92)
print(f'Assembled {len(list(out.glob("*.jpg")))} Blender comparison sheets in {out}')
