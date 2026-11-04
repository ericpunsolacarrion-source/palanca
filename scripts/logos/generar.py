import json, re, os, sys
import os
TMP = os.environ.get('LOGOS_TMP', '/tmp/palanca-logos')
BASE = f'{TMP}/si/pkg/package'
OUT = TMP
d = json.load(open(f'{BASE}/data/simple-icons.json'))
def slug(t):
    t = t.lower().replace('+', 'plus').replace('.', 'dot').replace('&', 'and')
    return re.sub(r'[^a-z0-9]', '', t)
by = {(x.get('slug') or slug(x['title'])): x for x in d}

GRUPOS = [
  ('Suscripciones y ocio', 'netflix spotify youtube youtubemusic hbomax max primevideo* disneyplus* appletv applemusic dazn crunchyroll twitch patreon paramountplus deezer tidal audible steam playstation xbox* nintendo* epicgames duolingo tinder'),
  ('IA y herramientas', 'anthropic claude openai* perplexity mistralai googlegemini github notion figma canva* adobe* microsoft* dropbox icloud google googledrive zoom linkedin*'),
  ('Supermercados', 'mercadona* carrefour lidl aldisud dia* eroski* alcampo* consum* elcorteingles* auchan'),
  ('Combustible y energía', 'repsol* cepsa* bp* galp* shell iberdrola* endesa* naturgy* holaluz*'),
  ('Telefonía e internet', 'movistar vodafone orange o2 yoigo* masmovil* digi* telefonica'),
  ('Compras y moda', 'amazon* aliexpress shein* temu* ebay vinted wallapop* etsy zara handm mango* primark* uniqlo nike adidas decathlon* ikea leroymerlin mediamarkt fnac pccomponentes*'),
  ('Comida y restaurantes', 'glovo justeat ubereats deliveroo burgerking mcdonalds kfc starbucks telepizza* dominos*'),
  ('Transporte y viajes', 'uber cabify* bolt* blablacar* renfe* ryanair vueling* iberia easyjet airfrance lufthansa emirates klm bookingdotcom airbnb expedia tripadvisor tesla bmw seat toyota volkswagen renault peugeot'),
  ('Bancos, pagos e inversión', 'bbva* santander* caixabank ing* bankinter* openbank* revolut n26 wise traderepublic* myinvestor* bizum* paypal visa mastercard americanexpress binance coinbase'),
  ('Seguros y salud', 'mapfre* allianz* axa* mutuamadrilena* sanitas* adeslas* dkv* lineadirecta* basicfit* mcfit*'),
]
# Marcas sin logo libre: [nombre, fondo, texto, monograma]
MONO = {
 'primevideo': ['Prime Video', '#00A8E1', '#fff', 'prime'], 'disneyplus': ['Disney+', '#113CCF', '#fff', 'D+'],
 'xbox': ['Xbox', '#107C10', '#fff', 'X'], 'nintendo': ['Nintendo', '#E60012', '#fff', 'N'],
 'openai': ['ChatGPT', '#0D0D0D', '#fff', 'GPT'], 'canva': ['Canva', '#00C4CC', '#fff', 'C'], 'adobe': ['Adobe', '#FA0F00', '#fff', 'A'],
 'microsoft': ['Microsoft', '#2F2F2F', '#fff', 'MS'], 'linkedin': ['LinkedIn', '#0A66C2', '#fff', 'in'],
 'mercadona': ['Mercadona', '#00843D', '#fff', 'M'], 'dia': ['Dia', '#E30613', '#fff', 'Dia'], 'eroski': ['Eroski', '#E2001A', '#fff', 'E'],
 'alcampo': ['Alcampo', '#E3001B', '#fff', 'A'], 'consum': ['Consum', '#F39200', '#1a0e00', 'C'], 'elcorteingles': ['El Corte Inglés', '#00843D', '#fff', 'ECI'],
 'repsol': ['Repsol', '#FF8200', '#1a0d00', 'R'], 'cepsa': ['Cepsa', '#E30613', '#fff', 'C'], 'bp': ['BP', '#009B3A', '#FFE600', 'bp'],
 'galp': ['Galp', '#F26722', '#fff', 'G'], 'iberdrola': ['Iberdrola', '#5BA829', '#fff', 'I'], 'endesa': ['Endesa', '#00A1DE', '#fff', 'E'],
 'naturgy': ['Naturgy', '#004571', '#F39200', 'N'], 'holaluz': ['Holaluz', '#FF5A5F', '#fff', 'H'],
 'yoigo': ['Yoigo', '#8B2D8F', '#fff', 'Y'], 'masmovil': ['MásMóvil', '#FFD200', '#1d1d1b', 'M+'], 'digi': ['Digi', '#1E3D8F', '#fff', 'D'],
 'amazon': ['Amazon', '#232F3E', '#FF9900', 'a'], 'shein': ['Shein', '#111111', '#fff', 'S'], 'temu': ['Temu', '#FB7701', '#fff', 'T'],
 'wallapop': ['Wallapop', '#13C1AC', '#fff', 'w'], 'mango': ['Mango', '#111111', '#fff', 'M'], 'primark': ['Primark', '#00A9E0', '#fff', 'P'],
 'decathlon': ['Decathlon', '#0082C3', '#fff', 'D'], 'pccomponentes': ['PcComponentes', '#FF6000', '#fff', 'Pc'],
 'telepizza': ['Telepizza', '#E30613', '#fff', 'T'], 'dominos': ["Domino's", '#006491', '#fff', 'D'],
 'cabify': ['Cabify', '#7145D6', '#fff', 'C'], 'bolt': ['Bolt', '#34D186', '#0b2b1d', 'B'], 'blablacar': ['BlaBlaCar', '#00AFF5', '#fff', 'B'],
 'renfe': ['Renfe', '#8A0F5A', '#fff', 'R'], 'vueling': ['Vueling', '#FFCC00', '#333', 'V'],
 'bbva': ['BBVA', '#004481', '#fff', 'BBVA'], 'santander': ['Santander', '#EC0000', '#fff', 'S'], 'ing': ['ING', '#FF6200', '#fff', 'ING'],
 'bankinter': ['Bankinter', '#FF7300', '#fff', 'B'], 'openbank': ['Openbank', '#E30613', '#fff', 'O'], 'traderepublic': ['Trade Republic', '#111111', '#fff', 'TR'],
 'myinvestor': ['MyInvestor', '#0F2B5B', '#fff', 'MI'], 'bizum': ['Bizum', '#05C3DD', '#0A2540', 'b'],
 'mapfre': ['Mapfre', '#D81E05', '#fff', 'M'], 'allianz': ['Allianz', '#003781', '#fff', 'A'], 'axa': ['AXA', '#00008F', '#fff', 'AXA'],
 'mutuamadrilena': ['Mutua Madrileña', '#003B7A', '#fff', 'MM'], 'sanitas': ['Sanitas', '#0072CE', '#fff', 'S'], 'adeslas': ['Adeslas', '#00A0DF', '#fff', 'A'],
 'dkv': ['DKV', '#00843D', '#fff', 'DKV'], 'lineadirecta': ['Línea Directa', '#E30613', '#fff', 'LD'], 'basicfit': ['Basic-Fit', '#FF7900', '#111', 'BF'], 'mcfit': ['McFit', '#E2001A', '#fff', 'Mc'],
}

def lum(h):
    h = h.lstrip('#'); r, g, b = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    f = lambda v: v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)

def path_de(s):
    svg = open(f'{BASE}/icons/{s}.svg').read()
    return re.search(r' d="([^"]+)"', svg).group(1)

# Ajustes de encuadre/color donde el color oficial no funciona sobre oscuro
AJUSTE = {'google': ('#ffffff', '#4285F4'), 'apple': ('#F5F5F7', '#111'), 'icloud': ('#3693F3', '#fff'), 'anthropic': ('#D97757', '#191919'),
          'claude': ('#D97757', '#fff'), 'github': ('#24292F', '#fff'), 'notion': ('#ffffff', '#111'), 'uber': ('#111', '#fff'), 'zara': ('#111', '#fff'),
          'tidal': ('#111', '#fff'), 'tesla': ('#E31937', '#fff'), 'visa': ('#1A1F71', '#fff'), 'epicgames': ('#2a2a2a', '#fff'), 'audible': ('#F8991C', '#111'),
          'max': ('#002BE7', '#fff'), 'hbomax': ('#5822B4', '#fff'), 'dazn': ('#0C161C', '#F8F8F5'), 'shell': ('#FBCE07', '#DD1D21'),
          'lidl': ('#0050AA', '#FFF000'), 'mcdonalds': ('#DA291C', '#FFC72C'), 'burgerking': ('#D62300', '#F5EBDC'), 'ikea': ('#0058A3', '#FFDA1A'),
          'ryanair': ('#073590', '#F1C933'), 'iberia': ('#D7192D', '#FFC20E'), 'glovo': ('#FFC244', '#00A082'), 'o2': ('#0050FF', '#fff')}

items = []
for nombre_grupo, lista in GRUPOS:
    fila = []
    for tok in lista.split():
        s = tok.rstrip('*')
        if s in by and not tok.endswith('*'):
            x = by[s]; hexc = '#' + x['hex']
            bg, fg = AJUSTE.get(s, (hexc, '#ffffff' if lum(hexc) < 0.45 else '#111111'))
            if s not in AJUSTE and lum(bg) < 0.012:  # negro puro: un gris muy oscuro para que se vea el borde
                bg = '#151515'
            fila.append({'slug': s, 'nombre': x['title'], 'bg': bg, 'fg': fg, 'path': path_de(s), 'oficial': True})
        elif s in MONO:
            n, bg, fg, mono = MONO[s]
            fila.append({'slug': s, 'nombre': n, 'bg': bg, 'fg': fg, 'mono': mono, 'oficial': False})
    items.append((nombre_grupo, fila))
json.dump(items, open(f'{OUT}/logos.json', 'w'), ensure_ascii=False)

ANCHOS = {'aliexpress','coinbase','zoom','ubereats','easyjet','americanexpress','ebay','kfc','hbomax','fnac','uber','visa','etsy','zara','tidal','peugeot','lidl'}

def tile(it, t):
    r = round(t * 0.28)
    if it['oficial']:
        g = t * (0.76 if it['slug'] in ANCHOS else 0.56)
        inner = f'<svg width="{g:.0f}" height="{g:.0f}" viewBox="0 0 24 24"><path d="{it["path"]}" fill="{it["fg"]}"/></svg>'
    else:
        m = it['mono']; fs = t * (0.27 if len(m) > 2 else 0.34 if len(m) > 1 else 0.44)
        inner = f'<span style="font-size:{fs:.0f}px">{m}</span>'
    return f'<span class="t" style="width:{t}px;height:{t}px;border-radius:{r}px;background:{it["bg"]};color:{it["fg"]}">{inner}</span>'

total = sum(len(f) for _, f in items); of = sum(1 for _, f in items for i in f if i['oficial'])
secs = []
for g, fila in items:
    celdas = ''.join(f'<figure class="{"" if i["oficial"] else "mono"}">{tile(i, 56)}<figcaption>{i["nombre"]}</figcaption></figure>' for i in fila)
    secs.append(f'<section><h2>{g} <small>{len(fila)}</small></h2><div class="rej">{celdas}</div></section>')
ej = {i['slug']: i for _, f in items for i in f}
filas_ctx = [('netflix', 'Netflix', 'Suscripciones · hoy', '−13,99 €', 'Pagado'), ('claude', 'Claude Pro', 'IA · en 2 días', '−21,60 €', 'En 2 días'), ('mercadona', 'Mercadona', 'Comida · ayer', '−42,35 €', ''), ('spotify', 'Spotify', 'Ocio · mañana', '−10,99 €', 'Mañana'), ('repsol', 'Repsol', 'Transporte · 11 oct', '−54,60 €', ''), ('bbva', 'Nómina (BBVA)', 'Ingreso · 1 nov', '+2.150 €', '')]
ctx = ''.join(f'<div class="fila">{tile(ej[s], 36)}<span class="tx"><b>{n}</b><small>{sub}</small></span><span class="im {"in" if imp.startswith("+") else ""}">{imp}{f"<em>{e}</em>" if e else ""}</span></div>' for s, n, sub, imp, e in filas_ctx)
cal = ''.join(f'<div class="dia"><b>{dd}</b><span class="lg">{"".join(tile(ej[s], 22) for s in ss)}</span><small>{im}</small></div>' for dd, ss, im in [(5, ['netflix'], '14 €'), (7, ['movistar'], '45 €'), (10, ['spotify'], '11 €'), (11, ['youtube', 'appletv'], '22 €'), (12, ['basicfit'], '40 €'), (15, ['iberdrola', 'mapfre'], '128 €'), (31, ['claude', 'openai'], '45 €')])

html = f'''<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{{font-family:G;src:url('file:///home/user/palanca/node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2');font-weight:100 900}}
body{{margin:0;padding:44px;width:1920px;box-sizing:border-box;background:#0a100d;color:#edf3ef;font-family:G,system-ui}}
h1{{font-size:36px;margin:0;letter-spacing:-.03em}} .lead{{color:#a9b6af;font-size:16px;margin:8px 0 6px;max-width:1300px;line-height:1.5}}
.ley{{display:flex;gap:26px;color:#a9b6af;font-size:14px;margin:14px 0 30px}} .ley i{{display:inline-block;width:12px;height:12px;border-radius:4px;margin-right:7px;vertical-align:-1px}}
.top{{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-bottom:34px;align-items:start}}
.card{{background:#111916;border:1px solid #1e2a24;border-radius:16px;padding:20px}} .card h3{{margin:0 0 12px;font-size:15px}}
.fila{{display:flex;align-items:center;gap:12px;padding:9px 0;border-top:1px solid #1e2a24}} .fila:first-of-type{{border-top:0}}
.tx{{flex:1;display:flex;flex-direction:column}} .tx b{{font-size:14px;font-weight:550}} .tx small{{font-size:12px;color:#87958d}}
.im{{font-weight:600;font-size:14px;display:flex;flex-direction:column;align-items:flex-end;gap:3px}} .im.in{{color:#6fe4ab}} .im em{{font-style:normal;font-size:11px;font-weight:600;color:#a9b6af;background:#16201b;padding:2px 7px;border-radius:99px}}
.cal{{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}} .dia{{background:#16201b;border:1px solid #1e2a24;border-radius:12px;min-height:84px;padding:8px;display:flex;flex-direction:column;gap:5px}}
.dia b{{font-size:13px}} .dia small{{margin-top:auto;font-size:12px;color:#a9b6af;font-weight:600}} .lg{{display:flex}} .lg .t+.t{{margin-left:-6px}} .lg .t{{box-shadow:0 0 0 2px #16201b}}
section{{margin-bottom:26px}} h2{{font-size:17px;margin:0 0 12px;font-weight:600}} h2 small{{color:#87958d;font-weight:500;font-size:13px;margin-left:6px}}
.rej{{display:grid;grid-template-columns:repeat(14,1fr);gap:12px}}
figure{{margin:0;display:flex;flex-direction:column;align-items:center;gap:7px;padding:12px 4px 10px;background:#111916;border:1px solid #1e2a24;border-radius:14px}}
figure.mono{{border-style:dashed;border-color:#3a4a40}}
figcaption{{font-size:11.5px;color:#a9b6af;text-align:center;line-height:1.25}}
.t{{display:inline-grid;place-items:center;flex:none;font-weight:700;letter-spacing:-.02em;line-height:1;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}}
</style></head><body>
<h1>Logos de comercios y servicios · propuesta</h1>
<p class="lead">{total} marcas. <b>{of} con su logo oficial</b> (colección abierta Simple Icons, licencia libre CC0, dibujos vectoriales: se ven nítidos a cualquier tamaño y no se descarga nada de internet al usar la app). Las <b>{total-of} que no tienen logo libre</b> (muchas españolas: Mercadona, Repsol, BBVA, Iberdrola…) van con su color de marca y su inicial. Todas en el mismo marco: cuadrado redondeado, símbolo centrado al 56 %.</p>
<div class="ley"><span><i style="background:#3dd68c"></i>Borde continuo: logo oficial</span><span><i style="border:1px dashed #87958d"></i>Borde discontinuo: color + inicial (sin logo libre)</span></div>
<div class="top"><div class="card"><h3>Así se ven en una lista (Movimientos, Base)</h3>{ctx}</div><div class="card"><h3>Y en el calendario de cobros, a tamaño pequeño</h3><div class="cal">{cal}</div></div></div>
{''.join(secs)}
</body></html>'''
open(f'{OUT}/logos.html', 'w').write(html)
print(total, of)
