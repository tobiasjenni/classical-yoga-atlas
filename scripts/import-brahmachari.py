"""Import the user-supplied Russian Brahmachari EPUB without republishing the EPUB archive.
Run: python scripts/import-brahmachari.py /path/to/book.epub
Uses section headings and EPUB asset identifiers, never inferred printed page numbers.
"""
import hashlib,json,pathlib,re,sys,zipfile,xml.etree.ElementTree as ET
ROOT=pathlib.Path(__file__).resolve().parents[1]
source=pathlib.Path(sys.argv[1]); rows=[line.split('|') for line in (ROOT/'scripts/book/catalogue.txt').read_text(encoding='utf-8-sig').splitlines() if line.strip()]
ns={'o':'http://www.idpf.org/2007/opf'}
iast_names=(ROOT/'scripts/book/sanskrit.txt').read_text(encoding='utf-8-sig').splitlines()
def devanagari(word):
 vowels={'a':('अ',''),'ā':('आ','ा'),'i':('इ','ि'),'ī':('ई','ी'),'u':('उ','ु'),'ū':('ऊ','ू'),'ṛ':('ऋ','ृ'),'ṝ':('ॠ','ॄ'),'e':('ए','े'),'ai':('ऐ','ै'),'o':('ओ','ो'),'au':('औ','ौ')}
 consonants=dict(zip(['k','kh','g','gh','ṅ','c','ch','j','jh','ñ','ṭ','ṭh','ḍ','ḍh','ṇ','t','th','d','dh','n','p','ph','b','bh','m','y','r','l','v','ś','ṣ','s','h'],list('कखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसह')))
 word=word.lower().replace('-','');out='';pending=False;i=0
 while i<len(word):
  token=word[i:i+2] if word[i:i+2] in vowels or word[i:i+2] in consonants else word[i];i+=len(token)
  if token in vowels:out+=vowels[token][1 if pending else 0];pending=False
  elif token in consonants:out+=('्' if pending else '')+consonants[token];pending=True
  else:out+=({'ṃ':'ं','ḥ':'ः'}.get(token,token));pending=False
 return out+('्' if pending else '')
with zipfile.ZipFile(source) as archive:
 opf=ET.fromstring(archive.read('OPS/content.opf'))
 manifest={e.get('id'):e.get('href') for e in opf.findall('o:manifest/o:item',ns)}
 sections=[]
 for entry in opf.findall('o:spine/o:itemref',ns):
  file=manifest[entry.get('idref')]
  for el in ET.fromstring(archive.read('OPS/'+file)).iter():
   kind=el.tag.split('}')[-1]
   if kind=='div' and 'title' in el.get('class',''):
    sections.append({'heading':' '.join(' '.join(el.itertext()).split()),'file':file,'images':[],'paragraphs':[]})
   elif sections and kind=='img':sections[-1]['images'].append(el.get('src'))
   elif sections and kind=='p':
    text=' '.join(' '.join(el.itertext()).split())
    if text and text!=sections[-1]['heading']:sections[-1]['paragraphs'].append(text)
 start=next(i for i,s in enumerate(sections) if s['heading'].startswith('СИДДХАСАНА'))
 end=next(i for i,s in enumerate(sections) if s['heading'].startswith('СУРЬЯ НАМАСКАР'))
 selected=sections[start:end+1]
 assert len(selected)==len(rows)==109,(len(selected),len(rows))
 out=ROOT/'public/book/brahmachari';out.mkdir(parents=True,exist_ok=True)
 primary={1:3,2:11,9:23,14:29,19:37,23:43,24:46,32:57,37:64,47:76,50:79,59:91,61:94,70:105,71:106,83:122,84:130,108:169,109:175}
 # Section ordinals are one-based within the posture collection.
 links={1:'siddhasana',2:'padmasana',3:'bhadrasana',6:'svastikasana',7:'simhasana',8:'gomukhasana',9:'virasana',10:'dhanurasana',11:'shavasana',14:'matsyendrasana',16:'paschimottanasana',19:'mayurasana',20:'kukkutasana',21:'kurmasana',22:'uttana-kurmasana'}
 differences={3:'The book shows a kneeling seat; the HYP study uses joined feet with open knees.',7:'The book shows a toe-supported squat with heels together; the HYP study uses crossed ankles.',8:'The book explicitly shows a behind-the-back arm clasp. That clasp is not specified in the HYP verse used for the existing study.',9:'The book shows a long lunge. The HYP study interprets a foot-on-thigh seat.',10:'The book shows straight legs overhead in a shoulder-supported fold. The HYP study shows a seated archer configuration, which this book covers separately under Akarna-dhanurasana.',14:'Compare the foot hold and arm wrap closely: the current 3D study simplifies those contacts.',21:'The book shows a forward-inclined kneeling seat with elbows at the abdomen. The HYP study uses a compact crossed-ankle seat.',22:'The book reclines from kneeling with hands on thighs. The HYP study reclines with folded lotus legs and hands behind the neck.'}
 records=[];image_count=0
 for ordinal,(section,row) in enumerate(zip(selected,rows),1):
  name,english,family,summary=row;id=name.lower()
  images=[]
  for asset in section['images']:
   data=archive.read('OPS/'+asset);suffix='.jpg' if data.startswith(b'\xff\xd8') else '.png' if data.startswith(b'\x89PNG') else '.gif'
   stem=pathlib.PurePosixPath(asset).name;filename=stem+suffix
   (out/filename).write_bytes(data)
   images.append({'id':stem,'src':'/book/brahmachari/'+filename,'sha256':hashlib.sha256(data).hexdigest()});image_count+=1
  assert images,id
  hero=(next(i for i in images if i['id']=='Im'+str(primary[ordinal])) if ordinal in primary else images[0])['src']
  paragraphs=section['paragraphs']
  (out/(id+'.json')).write_text(json.dumps({'paragraphs':paragraphs},ensure_ascii=False),encoding='utf-8')
  records.append({'id':id,'order':ordinal,'name':name,'iast':iast_names[ordinal-1],'sanskrit':devanagari(iast_names[ordinal-1]),'english':english,'russian':section['heading'],'family':family,'summary':summary,'file':section['file'],'images':images,'hero':hero,'textUrl':'/book/brahmachari/'+id+'.json','relatedModel':links.get(ordinal),'comparison':differences.get(ordinal),'kind':'sequence' if ordinal==109 else 'posture'})
 document={'title':'Yogāsana Vijñāna','author':'Dhirendra Brahmachari','language':'Russian','filename':source.name,'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'edition':'User-supplied Russian EPUB; translator, publisher and publication year not verified.','locatorPolicy':'Section heading and EPUB image identifier. Reflowable EPUB has no stable printed pagination.','metadataNote':'The EPUB metadata says 1953, while its foreword is dated 29 December 1966. The metadata date is not used as the publication date.','postures':108,'sequences':1,'imageCount':image_count,'entries':records}
 (ROOT/'src/data/brahmachari.json').write_text(json.dumps(document,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(f'Imported {len(records)-1} postures, 1 sequence and {image_count} illustrations; source SHA256 {document["sha256"]}')
