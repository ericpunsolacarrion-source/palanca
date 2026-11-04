# Catálogo completo de logos (v5): las marcas revisadas a mano (logosMarcas)
# + todo Simple Icons (CC0), con reconocimiento estricto. Escribe:
#   src/lib/logos/indice.js       qué marcas hay y cómo se reconocen (ligero)
#   src/lib/logos/dibujos-<x>.js  los dibujos, por inicial (se cargan a demanda)
# Uso: ver scripts/logos/README.md (LOGOS_TMP con los paquetes descargados).
import json, os, re, glob, unicodedata
TMP = os.environ.get('LOGOS_TMP', '/tmp/palanca-logos')
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../..')
SI = f'{TMP}/si/pkg/package'
OUT = f'{RAIZ}/src/lib/logos'
os.makedirs(OUT, exist_ok=True)

def norm(t):
    t = ''.join(c for c in unicodedata.normalize('NFD', t.lower()) if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]+', ' ', t).strip()

PALABRAS = set()
for f in glob.glob(f'{TMP}/dic/x-*/package/index.json'):
    PALABRAS |= {norm(w) for w in json.load(open(f))}

def lum(h):
    h = h.lstrip('#')
    if len(h) == 3: h = ''.join(c * 2 for c in h)
    r, g, b = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    f = lambda v: v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)

# 1) Las revisadas a mano (con sus patrones y colores afinados)
# (scripts/logos/curadas.json lo genera a_app.py a partir de la hoja revisada)
curadas = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'curadas.json')))

# Como el icono de la app en el móvil (fondo y color del símbolo)
APP = {
  'netflix': ('#000000', '#E50914'), 'spotify': ('#000000', '#1ED760'), 'youtube': ('#FFFFFF', '#FF0000'),
  'youtubemusic': ('#000000', '#FF0000'), 'applemusic': ('#FA243C', '#FFFFFF'), 'appletv': ('#000000', '#FFFFFF'),
  'twitch': ('#9146FF', '#FFFFFF'), 'uber': ('#000000', '#FFFFFF'), 'ubereats': ('#06C167', '#000000'),
  'paypal': ('#003087', '#FFFFFF'), 'revolut': ('#191C1F', '#FFFFFF'), 'n26': ('#FFFFFF', '#1D1D1B'),
  'airbnb': ('#FF385C', '#FFFFFF'), 'bookingdotcom': ('#003580', '#FFFFFF'), 'duolingo': ('#58CC02', '#FFFFFF'),
  'tinder': ('#FF4458', '#FFFFFF'), 'claude': ('#D97757', '#FFFFFF'), 'anthropic': ('#F0EEE6', '#141413'),
  'openai': ('#000000', '#FFFFFF'), 'google': ('#FFFFFF', '#4285F4'), 'amazon': ('#232F3E', '#FF9900'),
}
for e in curadas:
    if e['k'] in APP:
        e['bg'], e['fg'] = APP[e['k']]

dibujos = {}   # grupo -> {k: {vb, d|body}}
indice = []
def grupo(k):
    c = k[0]
    return c if 'a' <= c <= 'z' else '0'
vistos = set()
for e in curadas:
    k = e['k']; vistos.add(k)
    fila = [k, e['n'], e['re'], e['bg'], e['fg'], e.get('e', 0.56), '', e.get('mono', '')]
    if not e.get('pendiente'):
        g = grupo(k); fila[6] = g
        dibujos.setdefault(g, {})[k] = {'vb': e['vb'], **({'d': e['d']} if e.get('d') else {'body': e['body']})}
    indice.append(fila)
n_curadas = len(indice)

# 2) Todo Simple Icons con reconocimiento estricto
si = json.load(open(f'{SI}/data/simple-icons.json'))
def slug(t):
    t = t.lower().replace('+', 'plus').replace('.', 'dot').replace('&', 'and')
    t = ''.join(c for c in unicodedata.normalize('NFD', t) if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]', '', t)
saltadas = 0
PASARELAS = {'sumup', 'adyen', 'stripe', 'klarna', 'square', 'zettle', 'izettle', 'redsys', 'vivawallet', 'mollie', 'braintree', 'worldpay', 'checkoutdotcom', 'payoneer', 'skrill', 'paysafe', 'afterpay', 'affirm', 'scalapay', 'sequra', 'aplazame', 'googlepay', 'applepay', 'samsungpay'}
for x in si:
    k = x.get('slug') or slug(x['title'])
    if k in vistos or not os.path.exists(f'{SI}/icons/{k}.svg'):
        continue
    t = norm(x['title'])
    if len(t.replace(' ', '')) < 3:
        saltadas += 1; continue
    una = ' ' not in t
    # Una sola palabra que además es palabra corriente (o muy corta), o una
    # pasarela de pago que aparece delante del comercio real («SUMUP *BAR
    # PACO»): solo si es TODO el texto.
    estricta = una and (len(t) <= 4 or t in PALABRAS or k in PASARELAS)
    patron = f'^{re.escape(t)}$' if estricta else f'(^| ){re.escape(t)}( |$)'
    patron = patron.replace('\\ ', ' ')
    hexc = '#' + x['hex']; L = lum(hexc)
    if L < 0.02: bg, fg = '#151515', '#FFFFFF'
    elif L > 0.82: bg, fg = '#FFFFFF', '#111111'
    else: bg, fg = hexc, ('#FFFFFF' if L < 0.45 else '#111111')
    d = re.search(r' d="([^"]+)"', open(f'{SI}/icons/{k}.svg').read()).group(1)
    g = grupo(k)
    dibujos.setdefault(g, {})[k] = {'vb': '0 0 24 24', 'd': d}
    indice.append([k, x['title'], patron, bg, fg, 0.56, g, ''])
    vistos.add(k)

# 3) Iconos reales de app (recortados de capturas de Eric, public/logos/apps/):
#    tienen prioridad sobre el vector. Campo 9 = 1 si hay imagen.
APPS = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'apps.json')))
por_k = {f[0]: f for f in indice}
for f in indice: f.append(0)
for k, (n, pat) in APPS.items():
    if not os.path.exists(f'{RAIZ}/public/logos/apps/{k}.webp'):
        continue
    if k in por_k:
        por_k[k][8] = 1
        if pat: por_k[k][2] = pat
    else:
        if not pat: raise SystemExit(f'falta patrón para {k}')
        indice.append([k, n, pat, '#000000', '#FFFFFF', 0.56, '', '', 1])

# Prioridad: patrones más largos primero (lo específico gana); a igualdad, las revisadas.
orden = {f[0]: i for i, f in enumerate(indice)}
indice.sort(key=lambda f: (-len(f[2]), orden[f[0]]))

cab = ('// LOGOS DE MARCAS — generado por scripts/logos/catalogo.py; no editar a mano.\n'
       '// Simple Icons y SVG Logos (CC0), Streamline (CC BY 4.0, Disney+). Las marcas\n'
       '// son de sus dueños: aquí solo identifican en qué gastas.\n')
open(f'{OUT}/indice.js', 'w').write(cab + '// [clave, nombre, patrón, fondo, símbolo, escala, grupo de dibujo, monograma si no hay logo, 1 si hay icono de app]\n'
    'export const INDICE = ' + json.dumps(indice, ensure_ascii=False, separators=(',', ':')) + '\n')
for f in glob.glob(f'{OUT}/dibujos-*.js'): os.remove(f)
for g, m in dibujos.items():
    open(f'{OUT}/dibujos-{g}.js', 'w').write(cab + 'export default ' + json.dumps(m, ensure_ascii=False, separators=(',', ':')) + '\n')
con = sum(1 for f in indice if f[6] or f[8]); print(f'{sum(1 for f in indice if f[8])} con icono de app · ', end=''); print(f'{len(indice)} marcas · {con} con logo oficial · {len(indice)-con} con monograma · {n_curadas} revisadas a mano · {saltadas} descartadas por nombre corto')
