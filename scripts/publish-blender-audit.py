"""Build a browsable audit artifact from completed Blender renders and review notes.
Python with Pillow/NumPy; run from the repository root with the audit export root.
"""
import hashlib
import json
import sys
from pathlib import Path
import numpy as np
from PIL import Image

root = Path(sys.argv[1]).resolve()
out = Path('public/audits/blender')
(out / 'renders').mkdir(parents=True, exist_ok=True)
book = json.loads(Path('src/data/brahmachari.json').read_text(encoding='utf-8'))
book_by_id = {e['id']: e for e in book['entries']}
prior = {e['id']: e for e in json.loads(Path('scripts/book/model-audit.json').read_text(encoding='utf-8'))}
review = json.loads(Path('scripts/book/blender-review.json').read_text(encoding='utf-8'))
records = {}
diagnostics = []
for group, expected in [('human',108),('reference',108),('hyp-human',15),('hyp-reference',15)]:
    directory = root / group
    inventory = json.loads((directory/'inventory.json').read_text(encoding='utf-8'))
    report = json.loads((directory/'blender-report.json').read_text(encoding='utf-8'))
    assert len(inventory) == len(report['models']) == expected, f'Incomplete Blender batch: {group}'
    assert report.get('backfaceCulling'), f'Outdated render settings: {group}'
    by_id = {r['id']: r for r in report['models']}
    triangles = np.fromfile(directory/'indices.bin', dtype=np.uint32).reshape(-1,3)
    rest = np.fromfile(directory/'rest.bin', dtype=np.float32).reshape(-1,3)
    normals = np.fromfile(directory/'rest.normals.bin', dtype=np.float32).reshape(-1,3)
    cross = np.cross(rest[triangles[:,1]]-rest[triangles[:,0]], rest[triangles[:,2]]-rest[triangles[:,0]])
    baseline_opposed = int(((cross*normals[triangles].mean(axis=1)).sum(axis=1)<-1e-10).sum())
    for entry in inventory:
        r = by_id[entry['id']]
        assert hashlib.sha256((directory/(entry['id']+'.bin')).read_bytes()).hexdigest() == r['meshSha256']
        assert len(r['renders']) == 3
        collection = 'hyp' if group.startswith('hyp-') else 'book'
        key = collection + '/' + entry['id']
        assert entry['order'] in review['reviewed'][collection+'-'+entry['style']], f'Visual review incomplete: {key} {group}'
        style = entry['style']
        if key not in records:
            b = book_by_id.get(entry['id']) if collection == 'book' else None
            records[key] = {
                'id':entry['id'], 'collection':collection, 'order':entry['order'],
                'name':b['iast'] if b else entry['name'],
                'english':b['english'] if b else '',
                'source':entry['imageId'],
                'picture':'../..'+b['hero'] if b else None,
                'url':'../../..'+('/brahmachari/' if b else '/asana/')+entry['id'],
                'note':review['findings'].get(key, ''),
                'sourceLimitation':prior[entry['id']]['limitation'] if b else 'HYP final pose only. Animation frames were not rendered in this Blender batch.',
                'styles':{},
            }
        images = []
        for filename in r['renders']:
            source = directory/filename
            assert source.exists(), source
            destination = out/'renders'/f'{group}-{source.stem}.webp'
            with Image.open(source) as image:
                assert image.size == (420,420)
                image.convert('RGB').save(destination, 'WEBP', quality=88, method=6)
            images.append('renders/'+destination.name)
        r['baselineOpposingNormals'] = baseline_opposed
        r['collection'] = collection
        diagnostics.append(r)
        records[key]['styles'][style] = {'images':images, 'diagnostics':r}
assert len(records) == 123
payload = {'date':review['date'], 'blenderVersion':report['blenderVersion'], 'engine':report['engine'],
           'scope':'108 book studies plus 15 secondary HYP final poses; both styles; three views each',
           'findings':review['summary'], 'models':list(records.values())}
(out/'audit-data.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(out/'diagnostics.json').write_text(json.dumps(diagnostics,indent=2)+'\n',encoding='utf-8')
template = Path('scripts/blender-audit-template.html').read_text(encoding='utf-8')
(out/'index.html').write_text(template.replace('__AUDIT_DATA__',json.dumps(payload,ensure_ascii=False).replace('</','<\\/')),encoding='utf-8')
print(f'Published {len(records)} audit records and {sum(len(m["styles"][s]["images"]) for m in records.values() for s in m["styles"])} Blender renders to {out}')
