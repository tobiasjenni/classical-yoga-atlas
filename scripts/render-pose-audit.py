import json, sys, math
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps
root=Path(sys.argv[1])
entries=json.loads((root/'inventory.json').read_text(encoding='utf-8'))
indices=np.fromfile(root/'indices.bin',dtype=np.uint32).reshape(-1,3)
colors=np.fromfile(root/'colors.bin',dtype=np.float32).reshape(-1,3)
facecolors=colors[indices].mean(axis=1)
def audit_font(size):
    for name in ('C:/Windows/Fonts/arial.ttf', 'DejaVuSans.ttf'):
        try: return ImageFont.truetype(name,size)
        except OSError: pass
    return ImageFont.load_default()
font=audit_font(17)
small=audit_font(13)
W,H=250,240
def render(v,yaw):
    angle=math.radians(yaw); elev=math.radians(8)
    right=np.array([math.cos(angle),0,-math.sin(angle)])
    toward=np.array([math.sin(angle)*math.cos(elev),math.sin(elev),math.cos(angle)*math.cos(elev)])
    up=np.cross(toward,right)
    proj=v@np.array([right,up,toward]).T
    lo=proj[:,:2].min(axis=0); hi=proj[:,:2].max(axis=0)
    scale=min((W-28)/(hi[0]-lo[0]),(H-34)/(hi[1]-lo[1]))
    pix=(proj[:,:2]-(lo+hi)/2)*scale
    pix[:,0]+=W/2;pix[:,1]=H/2-pix[:,1]
    tri=proj[indices]; normals=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0])
    normals/=np.maximum(np.linalg.norm(normals,axis=1)[:,None],1e-8)
    light=np.array([-.3,.7,.65]);light/=np.linalg.norm(light)
    shade=.48+.52*np.clip(normals@light,0,1)
    rgb=(np.clip(facecolors*shade[:,None],0,1)**(1/2.2)*255).astype(np.uint8)
    im=Image.new('RGB',(W,H),'#f1f1eb');draw=ImageDraw.Draw(im)
    for i in np.argsort(tri[:,:,2].mean(axis=1)):
      if normals[i,2]>0: draw.polygon([tuple(p) for p in pix[indices[i]]],fill=tuple(rgb[i]))
    draw.text((8,5),{0:'Front',90:'Side',-135:'Back 3/4'}[yaw],font=small,fill='#516057')
    return im
selection=set(sys.argv[2].split(',')) if len(sys.argv)>2 else None
for start in range(0,len(entries),6):
    if selection and not any(str(e['order']) in selection for e in entries[start:start+6]):continue
    sheet=Image.new('RGB',(1000,6*(H+30)), '#ffffff');draw=ImageDraw.Draw(sheet)
    for row,e in enumerate(entries[start:start+6]):
      y=row*(H+30)
      draw.text((8,y+5),f"{e['order']:03} {e['name']} | {e['imageId']}",font=font,fill='#172c24')
      source=ImageOps.contain(Image.open(e['image']).convert('RGB'),(W-12,H-4))
      sheet.paste(source,((W-source.width)//2,y+30+(H-source.height)//2))
      v=np.fromfile(root/(e['id']+'.bin'),dtype=np.float32).reshape(-1,3)
      for col,yaw in enumerate([0,90,-135]):sheet.paste(render(v,yaw),((col+1)*W,y+30))
    sheet.save(root/f'sheet-{start//6+1:02}.jpg',quality=92)
print('Rendered audit sheets')
