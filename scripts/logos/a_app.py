import json, glob, re
import os
D=os.environ.get('LOGOS_TMP', '/tmp/palanca-logos')
items=json.load(open(f'{D}/logos.json'))
S={}
for f in glob.glob(f'{D}/sets/x-*/package/icons.json'):
    d=json.load(open(f)); S[d['prefix']]=d
def ico(ref):
    p,n=ref.split(':'); d=S[p]; ic=d['icons'][n]
    return ic.get('width',d.get('width',24)), ic.get('height',d.get('height',24)), ic['body']
EXTRA={ # clave: (fuente iconify, fondo, color, escala, licencia)
 'primevideo':('simple-icons:primevideo','#00A8E1','#ffffff',0.8,'CC0 · Simple Icons'),
 'openai':('simple-icons:openai','#0D0D0D','#ffffff',0.56,'CC0 · Simple Icons'),
 'linkedin':('simple-icons:linkedin','#0A66C2','#ffffff',0.56,'CC0 · Simple Icons'),
 'canva':('simple-icons:canva','#7D2AE8','#ffffff',0.6,'CC0 · Simple Icons'),
 'amazon':('simple-icons:amazon','#232F3E','#FF9900',0.6,'CC0 · Simple Icons'),
 'microsoft':('logos:microsoft-icon','#F3F3F3','#000000',0.5,'CC0 · SVG Logos'),
 'adobe':('simple-icons:adobe','#FA0F00','#ffffff',0.56,'CC0 · Simple Icons'),
 'xbox':('simple-icons:xbox','#107C10','#ffffff',0.6,'CC0 · Simple Icons'),
 'nintendo':('simple-icons:nintendo','#E60012','#ffffff',0.8,'CC0 · Simple Icons'),
 'disneyplus':('streamline-logos:disney-plus-logo-solid','#0E1B4D','#ffffff',0.66,'CC BY 4.0 · Streamline'),
}
ANCHOS={'aliexpress','coinbase','zoom','ubereats','easyjet','americanexpress','ebay','kfc','hbomax','fnac','uber','visa','etsy','zara','tidal','peugeot','lidl'}
# patrón de reconocimiento sobre el texto normalizado (minúsculas, sin acentos, separado por espacios)
PAT={'youtubemusic':r'youtube music','appletv':r'apple tv','applemusic':r'apple music','applepay':r'apple pay','googledrive':r'google (drive|one)','googlegemini':r'gemini','googleplay':r'google play','googlepay':r'google pay',
 'ubereats':r'uber eats|ubereats','hbomax':r'hbo','max':r'^max$','primevideo':r'prime video|primevideo|amazon prime|prime amazon','amazon':r'amazon|amzn',
 'openai':r'openai|chatgpt','claude':r'claude','anthropic':r'anthropic','mistralai':r'mistral','perplexity':r'perplexity','disneyplus':r'disney','paramountplus':r'paramount',
 'youtube':r'youtube','google':r'google','apple':r'apple|itunes','icloud':r'icloud','microsoft':r'microsoft|msft|office 365|xbox game pass','xbox':r'xbox','playstation':r'playstation|psn','nintendo':r'nintendo','epicgames':r'epic games',
 'bookingdotcom':r'booking','americanexpress':r'^(american express|amex)$','aldisud':r'aldi','handm':r'h m|hm hennes|^h&m','elcorteingles':r'corte ingles','leroymerlin':r'leroy merlin','mediamarkt':r'media ?markt','justeat':r'just eat','burgerking':r'burger king',
 'airfrance':r'air france','easyjet':r'easyjet','traderepublic':r'trade republic',
 'o2':r'(^| )o2( |$)','bp':r'(^| )bp( |$)',
 'dia':r'^dia$|supermercados? dia|dia retail|^dia supermercado|^(tarj|compra) dia( |$)', 'seat':r'^seat$|seat (concesionario|servicio)', 'visa':r'^visa$','mastercard':r'^mastercard$','applepay':r'^apple pay$','googlepay':r'^google pay$','max':r'^max$'}
def patron(k,nombre):
    if k in PAT: return PAT[k]
    import unicodedata
    t=''.join(c for c in unicodedata.normalize('NFD',nombre.lower()) if unicodedata.category(c)!='Mn')
    t=re.sub(r'[^a-z0-9ñ]+',' ',t).strip()
    return '(^| )'+re.escape(t).replace('\\ ',' ')+'( |$)'
ent=[]; vistos=set()
orden=[]
for g,fila in items:
    for it in fila: orden.append(it)
# más específicos antes (los que contienen otro nombre)
def peso(it): return -len(patron(it['slug'],it['nombre']))
for it in orden:
    k=it['slug']
    if k in vistos: continue
    vistos.add(k)
    e={'k':k,'n':it['nombre'],'re':patron(k,it['nombre']),'bg':it['bg'],'fg':it['fg']}
    if it['oficial']:
        e['vb']='0 0 24 24'; e['d']=it['path']; e['e']=0.76 if k in ANCHOS else 0.56; e['lic']='CC0 · Simple Icons'
    elif k in EXTRA:
        ref,bg,fg,esc,lic=EXTRA[k]; w,h,body=ico(ref)
        e.update(bg=bg,fg=fg,vb=f'0 0 {w} {h}',body=body,e=esc,lic=lic)
    else:
        e['mono']=it['mono']; e['pendiente']=True
    ent.append(e)
# prioridad: patrones más largos primero, para que "youtube music" gane a "youtube"
ent.sort(key=lambda e: -len(e['re']))
js='''// LOGOS DE MARCAS (v5) — generado por scripts de diseño; no editar a mano.
// Logos oficiales de colecciones abiertas, empaquetados (nada se pide a
// internet): Simple Icons (CC0), SVG Logos (CC0), Streamline (CC BY 4.0, solo
// Disney+). Marcas sin logo libre todavía: color + monograma (pendiente: true).
// Las marcas son de sus dueños; aquí solo identifican en qué gastas.
// Campos: k clave, n nombre, re patrón sobre el texto normalizado, bg/fg
// colores, vb viewBox, d (path) o body (SVG interior), e escala del símbolo.
export const LOGOS = '''+json.dumps(ent,ensure_ascii=False,separators=(',',':'))+'\n'
open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../src/lib/logosMarcas.js'),'w').write(js)
print(len(ent), sum(1 for e in ent if not e.get('pendiente')), len(js))
