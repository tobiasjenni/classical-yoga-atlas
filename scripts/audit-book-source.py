"""Read-only comparison of the committed atlas against the user's original EPUB.
Run: python scripts/audit-book-source.py /path/to/book.epub
"""
import hashlib
import json
from pathlib import Path, PurePosixPath
import sys
import zipfile
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[1]
book = json.loads((root / 'src/data/brahmachari.json').read_text(encoding='utf-8'))
source = Path(sys.argv[1])
assert hashlib.sha256(source.read_bytes()).hexdigest() == book['sha256'], 'Different EPUB'
with zipfile.ZipFile(source) as archive:
    contents = {}
    image_count = 0
    paragraph_count = 0
    for entry in book['entries']:
        file = entry['file']
        if file not in contents:
            contents[file] = list(ET.fromstring(archive.read('OPS/' + file)).iter())
        nodes = contents[file]
        active = False
        images = []
        paragraphs = []
        headings = 0
        for node in nodes:
            tag = node.tag.split('}')[-1]
            text = ' '.join(' '.join(node.itertext()).split())
            if tag == 'div' and 'title' in node.get('class', ''):
                active = text == entry['russian']
                headings += active
            elif active and tag == 'img':
                images.append(node.get('src'))
            elif active and tag == 'p' and text and text != entry['russian']:
                paragraphs.append(text)
        assert headings == 1, entry['id'] + ': missing or ambiguous source heading'
        assert [PurePosixPath(src).name for src in images] == [i['id'] for i in entry['images']], entry['id'] + ': picture order'
        for src, image in zip(images, entry['images']):
            original = archive.read('OPS/' + src)
            exported = (root / ('public' + image['src'])).read_bytes()
            assert original == exported, entry['id'] + ': altered source picture'
        exported_text = json.loads((root / ('public' + entry['textUrl'])).read_text(encoding='utf-8'))
        assert paragraphs == exported_text['paragraphs'], entry['id'] + ': altered Russian text'
        image_count += len(images)
        paragraph_count += len(paragraphs)
    assert image_count == 185
print(f"Original EPUB verified: {len(book['entries'])} exact headings, {image_count} byte-identical images, {paragraph_count} unchanged Russian paragraphs.")
