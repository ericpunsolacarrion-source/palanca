// GENERADO con npm run motor:api desde src/servidor/motorServidor.js. No editar a mano.

// src/lib/privacidad.js
var CLAVE = "palanca_ocultar_importes";
var oculto = (() => {
  try {
    return localStorage.getItem(CLAVE) === "1";
  } catch {
    return false;
  }
})();

// src/lib/categorias.js
var CATEGORIA_INVERSION = "Inversion";
var CATEGORIA_AJUSTE = "Ajuste";
var CATEGORIA_TRASPASO = "Ahorro";
var CATEGORIA_DESDE_AHORRO = "Desde ahorro";
var NOMBRES_DEVOLUCION = /^(devolucion|devoluciones|reembolso|reembolsos|devolucion compra|devoluciones compras)$/;
function esDevolucion(movimiento) {
  if (movimiento.tipo !== "ingreso") return false;
  const n = String(movimiento.categoria?.nombre ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  return NOMBRES_DEVOLUCION.test(n);
}
function esInversion(movimiento) {
  return movimiento.categoria?.nombre === CATEGORIA_INVERSION;
}
function esAjuste(movimiento) {
  return movimiento.categoria?.nombre === CATEGORIA_AJUSTE;
}
function esTraspaso(movimiento) {
  const n = movimiento.categoria?.nombre;
  return movimiento.tipo === "gasto" ? n === CATEGORIA_TRASPASO : n === CATEGORIA_DESDE_AHORRO;
}
function esRetiradaInversion(movimiento) {
  return movimiento.tipo === "ingreso" && esInversion(movimiento);
}

// src/lib/comercios.js
function normalizarTexto(t) {
  return String(t ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ]+/g, " ").trim();
}
var raiz = (palabra) => palabra.length > 3 ? palabra.replace(/s$/, "").replace(/e$/, "") : palabra;
var forma = (t) => normalizarTexto(t).split(" ").filter(Boolean).map(raiz).join(" ");
var formaEtiqueta = forma;
function distancia(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j += 1) d[0][j] = j;
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const coste = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + coste);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[m][n];
}
var tolerancia = (len) => len >= 9 ? 2 : len >= 5 ? 1 : 0;
var RUIDO = new Set(
  `compra compras pago pagos tarjeta tarj tarjetas tj tjt card visa mastercard debito credito recibo recibos adeudo adeudos
  cargo cargos domiciliacion domiciliado domic transaccion operacion contactless apple google pay en de del la el los las
  con num ref www com es net org sl sa slu sau sl inc ltd eu europe payments payment bv sarl gmbh ab srl llc co
  paypal sumup zettle izettle stripe sq redsys tpv pos xxxx xxx xxxxxxxx fecha valor oficina suc
  devolucion devoluciones reembolso reembolsos abono anulacion anulada refund
  transferencia transf trf favor emitida emitido recibida recibido from to`.split(/\s+/)
);
function claveComercio(texto) {
  const palabras = normalizarTexto(texto).split(" ").map((p) => p.replace(/\d+/g, "")).filter((p) => p.length > 1 && !RUIDO.has(p) && !/^x{2,}$/.test(p));
  return palabras.slice(0, 3).join(" ");
}
var PREFIJOS = new Set(`compra compras pago pagos tarjeta tarj tj tjt recibo adeudo cargo domiciliacion transaccion operacion contactless paypal sumup zettle izettle stripe sq redsys tpv xxxx devolucion devoluciones reembolso reembolsos abono anulacion anulada refund`.split(" "));
var DELANTE = new Set("con en de del a al favor emitida emitido recibida recibido transferencia transf trf from to payment".split(" "));
var SOCIEDAD = new Set("sl sa slu sau slne sll sc cb".split(" "));
var ENTRADILLA = /^(pago (con tarjeta )?en|compra en|transferencia (emitida|recibida)( a| de)?|transferencia a favor de|payment from|card payment to|to|from)\s+/i;
function sinEntradilla(texto) {
  let t = String(texto).trim().replace(ENTRADILLA, "");
  t = t.replace(/^nómina recibida\b/i, "N\xF3mina").replace(/[\s,]+(s\.?\s?l\.?u?|s\.?\s?a\.?u?)$/i, "");
  return t.trim() || String(texto).trim();
}
function presentable(texto) {
  const palabras = normalizarTexto(texto).split(" ").map((p) => p.replace(/\d+/g, "")).filter((p) => p && !PREFIJOS.has(p) && !/^x{2,}$/.test(p));
  while (palabras.length > 1 && DELANTE.has(palabras[0])) palabras.shift();
  while (palabras.length > 1 && SOCIEDAD.has(palabras.at(-1))) palabras.pop();
  return bonito(palabras.slice(0, 5).join(" "));
}
var bonito = (t) => String(t).toLowerCase().replace(/(^|[\s(/&.-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
var MARCAS = [
  ["Amazon Prime", /amazon prime|prime video|primevideo/],
  ["Amazon", /amazon|amzn/],
  ["Mercadona", /mercadona/],
  ["Carrefour", /carrefour/],
  ["Lidl", /\blidl\b/],
  ["Aldi", /\baldi\b/],
  ["Dia", /supermercados? dia\b|\bdia retail\b|^dia supermercado|(^|\btarj |\bcompra )dia\b(?! \d)/],
  ["Eroski", /eroski/],
  ["Alcampo", /alcampo/],
  ["Consum", /\bconsum\b/],
  ["Hipercor", /hipercor/],
  ["El Corte Ingl\xE9s", /corte ingles/],
  ["Bonpreu", /bonpreu/],
  ["Condis", /condis/],
  ["Caprabo", /caprabo/],
  ["Ahorramas", /ahorramas/],
  ["Repsol Luz", /repsol (luz|electricidad|vivit)/],
  ["Repsol", /repsol/],
  ["Cepsa", /cepsa|moeve/],
  ["BP", /\bbp\b/],
  ["Galp", /\bgalp\b/],
  ["Shell", /\bshell\b/],
  ["Petronor", /petronor/],
  ["Ballenoil", /ballenoil/],
  ["Plenoil", /plenoil/],
  ["Netflix", /netflix/],
  ["Spotify", /spotify/],
  ["HBO Max", /\bhbo\b|\bmax\.com/],
  ["Disney+", /disney/],
  ["YouTube", /youtube/],
  ["Apple", /apple\.com|itunes|icloud|apple services/],
  ["Google", /google (one|storage|play)|google \*/],
  ["DAZN", /\bdazn\b/],
  ["Filmin", /filmin/],
  ["Movistar", /movistar|telefonica/],
  ["Vodafone", /vodafone/],
  ["Orange", /\borange\b/],
  ["Yoigo", /yoigo/],
  ["M\xE1sM\xF3vil", /masmovil/],
  ["Digi", /\bdigi\b/],
  ["Pepephone", /pepephone/],
  ["Simyo", /simyo/],
  ["Lowi", /\blowi\b/],
  ["O2", /\bo2\b/],
  ["Jazztel", /jazztel/],
  ["Iberdrola", /iberdrola/],
  ["Endesa", /endesa/],
  ["Naturgy", /naturgy/],
  ["Holaluz", /holaluz/],
  ["Octopus Energy", /octopus/],
  ["Mapfre", /mapfre/],
  ["Allianz", /allianz/],
  ["AXA", /\baxa\b/],
  ["Mutua Madrile\xF1a", /mutua madrilena/],
  ["L\xEDnea Directa", /linea directa/],
  ["Sanitas", /sanitas/],
  ["Adeslas", /adeslas/],
  ["DKV", /\bdkv\b/],
  ["Basic-Fit", /basic ?fit/],
  ["McFit", /mcfit/],
  ["Zara", /\bzara\b/],
  ["Primark", /primark/],
  ["IKEA", /\bikea\b/],
  ["Decathlon", /decathlon/],
  ["Leroy Merlin", /leroy merlin/],
  ["MediaMarkt", /media ?markt/],
  ["AliExpress", /aliexpress/],
  ["Shein", /\bshein\b/],
  ["Temu", /\btemu\b/],
  ["Glovo", /glovo/],
  ["Just Eat", /just ?eat/],
  ["Uber Eats", /uber ?eats/],
  ["Uber", /\buber\b/],
  ["Cabify", /cabify/],
  ["Renfe", /renfe/],
  ["Ryanair", /ryanair/],
  ["Vueling", /vueling/],
  ["Iberia", /\biberia\b/],
  ["Booking", /booking/],
  ["Airbnb", /airbnb/],
  ["McDonald's", /mcdonald/],
  ["Burger King", /burger king/],
  ["Starbucks", /starbucks/],
  ["Telepizza", /telepizza/],
  ["Shopify", /shopify/],
  ["Bizum", /^bizum$/]
  // solo si no hay nadie más en el concepto
];
var NOMBRES_MARCA = [...new Set(MARCAS.map(([n]) => n))];
function marcaDe(texto) {
  const t = normalizarTexto(texto);
  const conPuntos = String(texto ?? "").toLowerCase();
  for (const [nombre, patron] of MARCAS) if (patron.test(t) || patron.test(conPuntos)) return nombre;
  return null;
}
function crearDirectorio(alias = []) {
  const porClave = /* @__PURE__ */ new Map();
  for (const a of alias) if (a?.clave && a?.nombre) porClave.set(a.clave, a);
  const claves = [...porClave.keys()];
  function aliasPara(clave2) {
    if (!clave2) return null;
    const exacto = porClave.get(clave2);
    if (exacto) return { alias: exacto, origen: "memoria" };
    const tol = tolerancia(clave2.length);
    if (!tol) return null;
    let mejor = null;
    for (const k of claves) {
      const d = distancia(k, clave2);
      if (d <= tol && (!mejor || d < mejor.d)) mejor = { k, d };
    }
    return mejor ? { alias: porClave.get(mejor.k), origen: "memoria-aprox" } : null;
  }
  function identificar(entrada) {
    const esMov = entrada && typeof entrada === "object";
    const nota = esMov ? entrada.nota : entrada;
    const cuenta = esMov ? entrada.fuente?.nombre : null;
    const texto = nota && String(nota).trim() || cuenta || "";
    const clave2 = claveComercio(texto);
    const recordado = aliasPara(clave2) ?? (cuenta ? aliasPara(claveComercio(cuenta)) : null);
    if (recordado) return { nombre: recordado.alias.nombre, clave: clave2, categoria: recordado.alias.categoria ?? null, origen: recordado.origen };
    if (cuenta && !nota) return { nombre: cuenta, clave: clave2, categoria: null, origen: "apuntado" };
    const marca = marcaDe(texto);
    if (marca && marca !== "Bizum") return { nombre: marca, clave: clave2, categoria: null, origen: "marca" };
    if (cuenta) return { nombre: cuenta, clave: clave2, categoria: null, origen: "apuntado" };
    if (!texto) return { nombre: "", clave: "", categoria: null, origen: "vacio" };
    const enMayusculas = /[A-ZÁÉÍÓÚÑ]/.test(texto) && texto === texto.toUpperCase();
    return { nombre: (enMayusculas ? presentable(texto) : sinEntradilla(texto)) || texto, clave: clave2, categoria: null, origen: "texto" };
  }
  return {
    identificar,
    nombreDe: (entrada) => identificar(entrada).nombre,
    /** Clave de agrupación del comercio REAL (dos textos del mismo sitio → igual). */
    grupoDe: (entrada) => forma(identificar(entrada).nombre),
    alias: () => [...porClave.values()],
    tamano: porClave.size
  };
}
var activo = crearDirectorio([]);
var directorio = () => activo;

// src/lib/categorizar.js
var R = (patron, categoria, extra = {}) => ({ patron, categoria, ...extra });
var TRASPASO_PROPIO = /traspaso|transferencia (a|entre) (mi|cuentas propias)|cuenta (de )?ahorro|cuenta naranja|\bsavings\b|\bvault\b|\bhucha\b|entre cuentas|cuentas propias/;
var BROKERS = /myinvestor|indexa|trade republic|degiro|interactive brokers|finizens|inbestme|openbank broker|fondo indexado|aportacion plan|plan de pensiones|bitpanda|coinbase|binance|revolut invest/;
var REGLAS_GASTO = [
  // Ahorro e inversión (no son consumo)
  R(TRASPASO_PROPIO, "Ahorro"),
  R(BROKERS, "Inversion"),
  // Energía (negociable)
  R(/repsol (luz|electricidad|gas|vivit)|iberdrola|endesa|naturgy|totalenergies|holaluz|octopus|lucera|som energia|\bedp\b|curenergia|baser|factor energia|energia xxi|\bpodo\b|imagina energia|electricidad|\bluz\b|gas natural|butano/, "Suministros", { fijo: "recibo", negociable: "energia" }),
  // Agua (no se cambia de compañía)
  R(/canal de isabel|aigues|emasesa|aguas de|emaya|aqualia|agua\b|suministro agua/, "Suministros", { fijo: "recibo", negociable: "agua" }),
  // Telefonía e internet (negociable)
  R(/movistar|telefonica|vodafone|orange|yoigo|masmovil|digi mobil|\bdigi\b|pepephone|simyo|lowi|\bo2\b|jazztel|finetwork|euskaltel|r cable|telecable|lebara|amena|fibra|telefonia/, "Suministros", { fijo: "recibo", negociable: "telefonia" }),
  // Seguros (negociable)
  R(/mapfre|allianz|\baxa\b|mutua|linea directa|generali|sanitas|adeslas|\bdkv\b|asisa|catalana occidente|zurich|\breale\b|verti|genesis|ocaso|santalucia|caser|liberty|pelayo|seguro|poliza/, "Seguros", { fijo: "recibo", negociable: "seguro" }),
  // Comisiones del banco (evitables)
  R(/comision|cuota (anual )?tarjeta|cuota mantenimiento|mantenimiento cuenta|gastos de mantenimiento|descubierto/, "Comisiones", { fijo: "recibo", negociable: "banco" }),
  // Gimnasio (negociable / revisar uso)
  R(/basic ?fit|mcfit|altafit|viva ?gym|dreamfit|anytime fitness|synergym|holmes place|metropolitan|go fit|gimnasio|\bgym\b|crossfit|fitness/, "Deporte", { fijo: "suscripcion", negociable: "gimnasio" }),
  // Suscripciones digitales (precio fijo: no se negocia, se revisa)
  R(/netflix|spotify|hbo|\bmax\b|disney|prime video|amazon prime|primevideo|apple\.com|itunes|icloud|youtube|dazn|filmin|audible|kindle unlimited|xbox|playstation|nintendo|openai|chatgpt|claude\.ai|anthropic|adobe|microsoft 365|office 365|google (one|storage)|patreon|twitch|tidal|deezer|crunchyroll|atresplayer|rakuten|movistar plus|skyshowtime/, "Suscripciones", { fijo: "suscripcion", negociable: "digital" }),
  // Vivienda
  R(/alquiler|hipoteca|comunidad (de )?propietarios|\bcomunidad\b|\bibi\b|basuras|tasa residuos/, "Vivienda", { fijo: "recibo" }),
  // Supermercado y comida
  R(/mercadona|carrefour|\blidl\b|\baldi\b|\bdia\b|supermercados? dia|eroski|alcampo|consum|hipercor|supercor|bonpreu|condis|caprabo|ahorramas|gadis|froiz|masymas|\bspar\b|bm supermercados|simply|\blupa\b|family cash|hiperdino|coviran|la sirena|supermercado|fruteria|carniceria|panaderia|pescaderia|mercado/, "Comida"),
  // Restaurantes y comida a domicilio
  R(/restaurante|\bbar\b|cafeteria|\bcafe\b|burger king|mcdonald|\bkfc\b|telepizza|domino|just eat|glovo|uber ?eats|deliveroo|starbucks|foster|\bvips\b|goiko|montaditos|taberna|tapas|pizzeria|cerveceria|kebab|sushi/, "Restaurantes"),
  // Transporte
  R(/repsol|cepsa|\bbp\b|galp|shell|petronor|ballenoil|plenoil|gasolinera|carburante|renfe|\bmetro\b|\bemt\b|\btmb\b|cabify|\buber\b|\bbolt\b|free ?now|taxi|blablacar|\balsa\b|parking|aparcamiento|peaje|autopista|via ?t|\bitv\b|iryo|ouigo|bicing|recarga transporte/, "Transporte"),
  // Salud
  R(/farmacia|clinica|dentist|dental|hospital|optica|fisioterap|quiron|vithas|hm hospitales|veterinari/, "Salud"),
  // Viajes
  R(/ryanair|vueling|iberia|booking|airbnb|hotel|expedia|edreams|easyjet|air europa|volotea|trainline/, "Viajes"),
  // Compras
  R(/amazon|amzn|aliexpress|shein|\btemu\b|zara|primark|el corte ingles|mediamarkt|decathlon|ikea|leroy merlin|\bfnac\b|pccomponentes|h&m|\bhm\b|mango|pull ?& ?bear|bershka|stradivarius|vinted|wallapop|apple store|sprinter|druni|primor|\baction\b/, "Compras"),
  // Ocio
  R(/\bcine|yelmo|cinesa|ticketmaster|entradas|steam|teatro|museo|concierto|bolera|escape room/, "Ocio"),
  // Educación
  R(/colegio|universidad|academia|matricula|udemy|coursera|escuela|guarderia|libreria/, "Educaci\xF3n"),
  // Efectivo
  R(/cajero|retirada (de )?efectivo|reintegro/, "Efectivo"),
  // Impuestos y tasas
  R(/agencia tributaria|\baeat\b|hacienda|ayuntamiento|\bdgt\b|multa|seguridad social|autonomo|cuota reta/, "Impuestos")
];
var REGLAS_INGRESO = [
  // Intereses y dividendos SÍ son ingreso, aunque vengan de tu cuenta de ahorro o del bróker.
  R(/intereses|dividendo|remuneracion cuenta|cupon/, "Intereses"),
  // Luego lo que NO es ingreso: tu dinero que vuelve de tu ahorro o de una
  // inversión ("REEMBOLSO FONDO" no es una devolución de compra).
  R(TRASPASO_PROPIO, "Desde ahorro"),
  R(BROKERS, "Inversion"),
  R(/nomina|salario|\bpaga\b|haberes/, "Nomina"),
  R(/pension|jubilacion|seguridad social|\binss\b/, "Pensi\xF3n"),
  R(/desempleo|\bsepe\b|prestacion/, "Prestaciones"),
  R(/devolucion|reembolso|abono compra|refund/, "Devoluciones"),
  R(/bizum|transferencia/, "Transferencias")
];
var sinAcentos = (t) => String(t ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
var CATEGORIAS_BANCO = [
  [/aliment|supermerc|groceries/, "Comida"],
  [/restaura|bares|comida fuera|restaurants/, "Restaurantes"],
  [/vehiculo|transporte|gasolin|combustible|transport/, "Transporte"],
  [/hogar|vivienda|alquiler|hipoteca/, "Vivienda"],
  [/recibos|suministro|utilities|telefon|internet/, "Suministros"],
  [/seguro/, "Seguros"],
  [/salud|farmacia|health|bienestar/, "Salud"],
  [/viaje|travel|hotel/, "Viajes"],
  [/ocio|entretenimiento|entertainment|cultura/, "Ocio"],
  [/compras|shopping|ropa/, "Compras"],
  [/educacion|formacion|education/, "Educaci\xF3n"],
  [/impuesto|tasas|taxes/, "Impuestos"],
  [/efectivo|cajero|cash/, "Efectivo"],
  [/suscripcion|subscription/, "Suscripciones"],
  [/inversion|investment/, "Inversion"],
  [/excluido|traspaso|transfers? between|entre cuentas/, "Ahorro"],
  [/nomina|salario|salary/, "Nomina"]
];
function categoriaDesdeBanco(nombre, tipo = "gasto") {
  const t = sinAcentos(nombre).trim();
  if (!t) return null;
  const hit = CATEGORIAS_BANCO.find(([re]) => re.test(t))?.[1];
  if (!hit) return String(nombre).trim();
  if (tipo === "ingreso") {
    if (hit === "Ahorro") return "Desde ahorro";
    if (hit === "Nomina" || hit === "Inversion") return hit;
    return null;
  }
  return hit === "Nomina" ? null : hit;
}
function reglaPara(concepto, tipo = "gasto") {
  const t = sinAcentos(concepto);
  if (!t.trim()) return null;
  const t2 = t.replace(/[-_*]+/g, " ");
  const reglas = tipo === "ingreso" ? REGLAS_INGRESO : REGLAS_GASTO;
  return reglas.find((r) => r.patron.test(t) || r.patron.test(t2)) ?? null;
}
function crearCategorizador(movimientosExistentes = [], dir = directorio()) {
  const conteo = /* @__PURE__ */ new Map();
  for (const m of movimientosExistentes) {
    const nombre = m.categoria?.nombre;
    const grupo = dir.grupoDe(m);
    if (!nombre || !grupo || nombre === "Ajuste") continue;
    const k = `${m.tipo}|${grupo}`;
    const porCat = conteo.get(k) ?? /* @__PURE__ */ new Map();
    porCat.set(nombre, (porCat.get(nombre) ?? 0) + 1);
    conteo.set(k, porCat);
  }
  const aprendido = /* @__PURE__ */ new Map();
  for (const [k, porCat] of conteo) {
    aprendido.set(k, [...porCat.entries()].sort((a, b) => b[1] - a[1])[0][0]);
  }
  return function categorizar({ nota, tipo = "gasto" }) {
    const id = dir.identificar(nota || "");
    const regla = reglaPara(nota, tipo) ?? (id.nombre ? reglaPara(id.nombre, tipo) : null);
    const extra = { ...regla ? { fijo: regla.fijo, negociable: regla.negociable } : {}, comercio: id.nombre };
    if (id.categoria) return { categoria: id.categoria, origen: "memoria", ...extra };
    const grupo = dir.grupoDe(nota || "");
    const tuya = grupo ? aprendido.get(`${tipo}|${grupo}`) : null;
    if (tuya) return { categoria: tuya, origen: "historial", ...extra };
    if (regla) return { categoria: regla.categoria, origen: "regla", ...extra };
    return { categoria: tipo === "ingreso" ? "Otros ingresos" : "Otros", origen: "defecto", ...extra };
  };
}

// src/lib/importe.js
function aCentimos(valor) {
  if (valor === "" || valor === null || valor === void 0) return null;
  const n = Number(valor);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}
function aEuros(centimos) {
  const n = Number(centimos);
  if (!Number.isFinite(n)) return 0;
  return n / 100;
}

// src/lib/periodo.js
var pad = (n) => String(n).padStart(2, "0");
function normalizarDiaInicio(dia) {
  const n = Number(dia);
  return Number.isInteger(n) && n >= 1 && n <= 28 ? n : 1;
}
var DIA_INICIO = 1;
function configurarPeriodo(dia) {
  DIA_INICIO = normalizarDiaInicio(dia);
  return DIA_INICIO;
}
function sumarMeses(clave2, n) {
  const [y, m] = clave2.split("-").map(Number);
  const t = y * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${pad(t % 12 + 1)}`;
}
function periodoDe(fechaIso, diaInicio = DIA_INICIO) {
  const s = normalizarDiaInicio(diaInicio);
  const natural = fechaIso.slice(0, 7);
  if (s === 1) return natural;
  return Number(fechaIso.slice(8, 10)) >= s ? sumarMeses(natural, 1) : natural;
}
var FMT_CORTO = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" });

// src/lib/movimientosUtils.js
function centimosDe(m) {
  if (m.importe_centimos !== void 0 && m.importe_centimos !== null) {
    return Math.round(Number(m.importe_centimos));
  }
  return aCentimos(m.importe) ?? 0;
}
function esConsumo(m) {
  return m.tipo === "gasto" && !esInversion(m) && !esAjuste(m) && !esTraspaso(m);
}
function categoriaDeDevolucion(m, movimientos = []) {
  const dir = directorio();
  const id = dir.identificar(m);
  if (id.categoria) return id.categoria;
  const grupo = dir.grupoDe(m);
  if (grupo) {
    const conteo = /* @__PURE__ */ new Map();
    for (const x of movimientos) {
      if (!esConsumo(x) || dir.grupoDe(x) !== grupo) continue;
      const c = x.categoria?.nombre ?? "Sin categor\xEDa";
      conteo.set(c, (conteo.get(c) ?? 0) + 1);
    }
    if (conteo.size) return [...conteo.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }
  return reglaPara(m.nota || m.fuente?.nombre || "", "gasto")?.categoria ?? "Devoluciones";
}
function gastoPorCategoria(movimientos) {
  const mapa = /* @__PURE__ */ new Map();
  for (const m of movimientos) {
    if (esConsumo(m)) {
      const nombre = m.categoria?.nombre ?? "Sin categor\xEDa";
      mapa.set(nombre, (mapa.get(nombre) ?? 0) + centimosDe(m));
    } else if (esDevolucion(m)) {
      const nombre = categoriaDeDevolucion(m, movimientos);
      mapa.set(nombre, (mapa.get(nombre) ?? 0) - centimosDe(m));
    }
  }
  for (const [k, v] of mapa) {
    if (v <= 0) mapa.delete(k);
    else mapa.set(k, aEuros(v));
  }
  return mapa;
}
function claveMes(fechaIso) {
  return periodoDe(fechaIso);
}
var FMT_MES_CORTO = new Intl.DateTimeFormat("es-ES", { month: "short" });
var FMT_MES_LARGO = new Intl.DateTimeFormat("es-ES", { month: "long" });
function totalesDe(movimientos) {
  let ingresos = 0;
  let gastos = 0;
  let invertido = 0;
  for (const m of movimientos) {
    if (esAjuste(m) || esTraspaso(m)) continue;
    const importe = centimosDe(m);
    if (esDevolucion(m)) gastos -= importe;
    else if (esInversion(m)) invertido += m.tipo === "ingreso" ? -importe : importe;
    else if (m.tipo === "ingreso") ingresos += importe;
    else gastos += importe;
  }
  const ahorro = ingresos - gastos;
  const ratioAhorro = ingresos > 0 ? ahorro / ingresos * 100 : 0;
  return {
    ingresos: aEuros(ingresos),
    gastos: aEuros(gastos),
    invertido: aEuros(invertido),
    ahorro: aEuros(ahorro),
    ratioAhorro
  };
}
function bolsas(movimientos, hasta = null) {
  let liquidez = 0;
  let invertido = 0;
  let ajusteTotal = 0;
  const lista = movimientos.some(esRetiradaInversion) ? [...movimientos].sort((a, b) => a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : (a.tipo === "ingreso") - (b.tipo === "ingreso")) : movimientos;
  for (const m of lista) {
    if (hasta && m.fecha > hasta) continue;
    if (esTraspaso(m)) continue;
    const importe = centimosDe(m);
    if (esAjuste(m)) {
      const signo = m.tipo === "ingreso" ? 1 : -1;
      ajusteTotal += signo * importe;
      liquidez += signo * importe;
      continue;
    }
    if (esRetiradaInversion(m)) {
      liquidez += importe;
      invertido -= Math.min(importe, invertido);
      continue;
    }
    if (m.tipo === "ingreso") liquidez += importe;
    else if (esInversion(m)) {
      invertido += importe;
      liquidez -= importe;
    } else liquidez -= importe;
  }
  return {
    bolsaInversion: aEuros(invertido),
    bolsaLiquidez: aEuros(liquidez),
    patrimonio: aEuros(invertido + liquidez),
    ajusteTotal: aEuros(ajusteTotal)
  };
}

// src/lib/plantillaPalanca.js
var COLUMNAS_PLANTILLA = ["Fecha", "Tipo", "Concepto", "Categor\xEDa", "Importe", "Plataforma", "Activo"];
var sinTildes = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
var clave = (s) => sinTildes(s).replace(/[^a-z ]/g, " ").split(" ").filter((w) => w && !["de", "del", "al", "a", "en", "el", "la", "los", "las", "mi", "mis"].includes(w)).map((w) => w.length > 4 && w.endsWith("es") && !w.endsWith("ses") ? w.slice(0, -2) : w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w).join(" ");
var TIPOS = [
  { nombre: "Gasto", claves: ["gasto", "expense"], tipo: "gasto" },
  { nombre: "Ingreso", claves: ["ingreso", "income"], tipo: "ingreso" },
  { nombre: "Devoluci\xF3n", claves: ["devolucion", "reembolso", "abono"], tipo: "ingreso", categoria: "Devoluciones" },
  { nombre: "Traspaso a ahorro", claves: ["traspaso ahorro", "traspaso", "ahorro"], tipo: "gasto", categoria: CATEGORIA_TRASPASO },
  { nombre: "Desde ahorro", claves: ["desde ahorro"], tipo: "ingreso", categoria: CATEGORIA_DESDE_AHORRO },
  // Banco → bróker: el dinero sigue siendo tuyo y aún no está invertido
  // (efectivo en el bróker). Neutro, como un traspaso a tu ahorro.
  { nombre: "Aportaci\xF3n al br\xF3ker", claves: ["aportacion broker", "aportacion", "transferencia broker", "ingreso broker", "deposito broker", "recarga broker"], tipo: "gasto", categoria: CATEGORIA_TRASPASO },
  { nombre: "Retirada del br\xF3ker", claves: ["retirada broker", "retirada", "retiro broker", "retiro"], tipo: "ingreso", categoria: CATEGORIA_DESDE_AHORRO },
  { nombre: "Compra inversi\xF3n", claves: ["compra inversion", "compra", "inversion", "compra accion", "compra etf", "compra fondo", "compra valor", "invertido"], tipo: "gasto", inversion: true },
  { nombre: "Venta inversi\xF3n", claves: ["venta inversion", "venta", "venta accion", "venta etf", "venta fondo", "desinversion"], tipo: "ingreso", inversion: true },
  { nombre: "Inter\xE9s", claves: ["interes", "intereses"], tipo: "ingreso", categoria: "Intereses" },
  { nombre: "Dividendo", claves: ["dividendo"], tipo: "ingreso", categoria: "Dividendos" }
];
var TIPOS_PLANTILLA = TIPOS.map((t) => t.nombre);
var PORCLAVE = new Map(TIPOS.flatMap((t) => t.claves.map((c) => [clave(c), t])));
var SOLO_PLANTILLA = new Set(
  TIPOS.filter((t) => t.nombre !== "Gasto" && t.nombre !== "Ingreso").flatMap((t) => t.claves.map(clave)).filter((k) => k.includes(" ") || ["inversion", "dividendo", "interes", "intere", "devolucion", "desinversion", "invertido"].includes(k))
);
function tipoDePlantilla(valor) {
  return PORCLAVE.get(clave(valor)) ?? null;
}
var esCategoriaInversion = (c) => /^inversion(es)?$/.test(sinTildes(c));
function esPlantilla(mapeo, filas) {
  if (!((mapeo.tipo ?? -1) >= 0)) return false;
  if ((mapeo.activo ?? -1) >= 0) return true;
  const valores = filas.map((f) => clave(f[mapeo.tipo])).filter(Boolean);
  if (valores.some((v) => SOLO_PLANTILLA.has(v))) return true;
  return (mapeo.plataforma ?? -1) >= 0 && valores.some((v) => ["compra", "venta", "aportacion", "retirada"].includes(v));
}
function traducirTipoPlantilla(valor, conSigno, categoriaFila) {
  const t = tipoDePlantilla(valor);
  if (!t) return null;
  if ((t.nombre === "Gasto" || t.nombre === "Ingreso") && esCategoriaInversion(categoriaFila)) {
    return { tipo: conSigno < 0 ? t.tipo === "gasto" ? "ingreso" : "gasto" : t.tipo, categoria: CATEGORIA_INVERSION, esInversion: true };
  }
  if (conSigno < 0 && t.nombre === "Gasto") return { tipo: "ingreso", categoria: "Devoluciones", esInversion: false };
  if (conSigno < 0 && t.nombre === "Ingreso") return { tipo: "gasto", categoria: categoriaFila || "Otros", esInversion: false };
  if (t.inversion) return { tipo: t.tipo, categoria: CATEGORIA_INVERSION, esInversion: true };
  return { tipo: t.tipo, categoria: t.categoria ?? categoriaFila ?? "", esInversion: false };
}
var INSTRUCCIONES_ASISTENTE = `Convierte mi Excel de finanzas al formato de importaci\xF3n de Palanca. Crea un archivo .xlsx con una pesta\xF1a llamada \xABMovimientos\xBB y estas columnas, en este orden: Fecha | Tipo | Concepto | Categor\xEDa | Importe | Plataforma | Activo.

Reglas generales:
- Una fila por movimiento real. Nada de totales, subtotales, res\xFAmenes ni f\xF3rmulas: solo valores.
- Fecha en dd/mm/aaaa: la fecha real en que se movi\xF3 el dinero. Las filas sin fecha o con fecha futura (previsiones) no las pongas: l\xEDstamelas aparte.
- Importe siempre positivo, en euros (convierte otras monedas al cambio de ese d\xEDa), con coma decimal y sin \xAB\u20AC\xBB.
- Concepto: texto corto y estable. Si regeneras el archivo, no cambies el concepto de las filas que ya exist\xEDan.

Tipo (exactamente uno de estos):
- Gasto: solo mi parte si era compartido. Sacar del cajero = Gasto con categor\xEDa \xABEfectivo\xBB, salvo que ya apunte en qu\xE9 gast\xE9 ese efectivo (entonces no lo pongas). Si pago con la tarjeta del br\xF3ker, tambi\xE9n es Gasto.
- Ingreso: la n\xF3mina, siempre el neto que llega al banco.
- Devoluci\xF3n: reembolsos de compras o bizums que me devuelven parte de algo que pagu\xE9.
- Traspaso a ahorro / Desde ahorro: mover dinero entre mis propias cuentas (por ejemplo, a la cuenta de ahorro). Las transferencias entre dos cuentas corrientes m\xEDas no las pongas.
- Aportaci\xF3n al br\xF3ker / Retirada del br\xF3ker: transferencias entre mi banco y el br\xF3ker.
- Compra inversi\xF3n: comprar acciones, ETF o fondos; el importe es el total pagado, comisi\xF3n incluida.
- Venta inversi\xF3n: el importe es lo realmente recibido.
- Inter\xE9s / Dividendo: lo cobrado.

Categor\xEDa: obligatoria en Gasto, Ingreso y Devoluci\xF3n; vac\xEDa en el resto. Usa preferiblemente: Comida, Restaurantes, Transporte, Vivienda, Suministros, Suscripciones, Seguros, Compras, Salud, Ocio, Deporte, Viajes, Educaci\xF3n, Impuestos, Efectivo, Otros (gastos); N\xF3mina, Otros ingresos (ingresos). Si alguna m\xEDa no encaja, deja mi nombre.

Plataforma (por ejemplo, Trade Republic) y Activo (por ejemplo, NVIDIA): solo en las filas de inversi\xF3n y del br\xF3ker.

Inversiones anteriores: si al empezar el Excel ya ten\xEDa acciones o fondos, a\xF1ade una \xABCompra inversi\xF3n\xBB por cada posici\xF3n con la fecha de la primera fila y lo que me costaron.

Al final, dime: 1) la lista de filas dudosas, sumadas dos veces o que has dejado fuera, y por qu\xE9; 2) la fecha del \xFAltimo movimiento; 3) cu\xE1nto dinero ten\xEDa en el banco y en efectivo en el br\xF3ker en esa fecha, seg\xFAn mis datos (lo confirmar\xE9 yo).`;

// src/lib/importarCsv.js
var COLUMNAS = ["fecha", "tipo", "categoria", "concepto", "importe", "cargo", "abono", "plataforma", "activo", "estado"];
function detectarFilaCabecera(filas) {
  let mejor = 0;
  let puntos = 0;
  for (let i = 0; i < Math.min(filas.length, 40); i += 1) {
    const reconocidas = new Set(filas[i].map(columnaDeCabecera).filter(Boolean));
    if (reconocidas.size >= 2 && reconocidas.size > puntos) {
      mejor = i;
      puntos = reconocidas.size;
      if (reconocidas.has("fecha") && (reconocidas.has("importe") || reconocidas.has("cargo"))) break;
    }
  }
  return mejor;
}
function tablaDesdeFilas(filas) {
  if (!filas.length) return { cabeceras: [], filas: [], inicio: 0 };
  const inicio = detectarFilaCabecera(filas);
  const cabeceras = filas[inicio].map((c) => String(c ?? "").trim());
  const datos = filas.slice(inicio + 1).filter((f) => f.some((c) => String(c ?? "").trim() !== ""));
  return { cabeceras, filas: datos, inicio };
}
var DIACRITICOS = /[̀-ͯ]/g;
function normaliza(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(DIACRITICOS, "").trim();
}
function columnaDeCabecera(cabecera) {
  const h = normaliza(cabecera).replace(/[().:_]/g, " ").replace(/\s+/g, " ").trim();
  if (!h || /^saldo|disponible|divisa|moneda|^n[ºo°]? ?(de )?(cuenta|tarjeta)|referencia/.test(h)) return null;
  if (/^(f |fecha|date|dia\b)|\bdate$/.test(h)) return "fecha";
  if (/^(estado|state|status)$/.test(h)) return "estado";
  if (/^(cargo|cargos|debe|debito|salidas?|gastos?)$/.test(h)) return "cargo";
  if (/^(abono|abonos|haber|credito|entradas?|ingresos?)$/.test(h)) return "abono";
  if (/importe|amount|cantidad|monto|^valor$|^euros?$|^eur$/.test(h)) return "importe";
  if (/^categoria|category|^cat$/.test(h)) return "categoria";
  if (/^tipo$|^type$|^tipo de movimiento$/.test(h)) return "tipo";
  if (/plataforma|broker|^fuente$|^platform$|^cuenta$/.test(h)) return "plataforma";
  if (/^(activo|asset|ticker)$/.test(h)) return "activo";
  if (/concepto|descripcion|description|detalle|^movimiento|operacion|comercio|beneficiario|observaciones|^nota|^concept|establecimiento/.test(h)) return "concepto";
  return null;
}
function detectarMapeo(cabeceras) {
  const mapeo = Object.fromEntries(COLUMNAS.map((c) => [c, -1]));
  cabeceras.forEach((cab, i) => {
    const col = columnaDeCabecera(cab);
    if (col && mapeo[col] < 0) mapeo[col] = i;
  });
  return mapeo;
}
function parseFecha(valor) {
  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) return null;
    return componer(valor.getFullYear(), valor.getMonth() + 1, valor.getDate());
  }
  if (typeof valor === "number") {
    if (valor < 2e4 || valor > 8e4) return null;
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(valor) * 864e5);
    return componer(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  const s = String(valor || "").trim().replace(/[T\s].*$/, "");
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) return componer(Number(m[1]), Number(m[2]), Number(m[3]));
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
  if (m) {
    const anio = m[3].length === 2 ? 2e3 + Number(m[3]) : Number(m[3]);
    return componer(anio, Number(m[2]), Number(m[1]));
  }
  return null;
}
function componer(yy, mm, dd) {
  if (!(yy >= 1900 && yy <= 2100) || mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const iso = `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  const fecha = /* @__PURE__ */ new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(fecha.getTime()) || fecha.getUTCMonth() + 1 !== mm || fecha.getUTCDate() !== dd) return null;
  return iso;
}
function parseImporteConSigno(valor) {
  if (typeof valor === "number") return Number.isFinite(valor) ? Math.round(valor * 100) / 100 : null;
  let s = String(valor || "").trim().replace(/\b(eur|euros?|usd|gbp)\b/gi, "").replace(/[€\s\u00a0]/g, "");
  if (!s) return null;
  let negativo = false;
  if (/^\(.*\)$/.test(s)) {
    negativo = true;
    s = s.slice(1, -1);
  }
  if (s.startsWith("-") || s.startsWith("\u2212")) {
    negativo = !negativo;
    s = s.slice(1);
  } else if (s.startsWith("+")) s = s.slice(1);
  if (s.endsWith("-")) {
    negativo = !negativo;
    s = s.slice(0, -1);
  }
  if (!/^[\d.,]+$/.test(s)) return null;
  const puntos = (s.match(/\./g) || []).length;
  const comas = (s.match(/,/g) || []).length;
  if (puntos && comas) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (comas) {
    s = comas > 1 ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (puntos) {
    if (puntos > 1 || /^\d{1,3}\.\d{3}$/.test(s)) s = s.replace(/\./g, "");
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  const r = Math.round(n * 100) / 100;
  return negativo ? -r : r;
}
function validarFila(campos, mapeo, { signoDecideTipo = false, plantilla = false } = {}) {
  const get = (col) => mapeo[col] >= 0 ? campos[mapeo[col]] : void 0;
  const fecha = parseFecha(get("fecha"));
  if (!fecha) return { ok: false, motivo: "fecha inv\xE1lida" };
  const estado = normaliza(get("estado"));
  if (estado && OPERACION_NO_HECHA.test(estado)) return { ok: false, motivo: `operaci\xF3n no completada (${get("estado")})` };
  const h = /* @__PURE__ */ new Date();
  const hoy = `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}-${String(h.getDate()).padStart(2, "0")}`;
  if (fecha > hoy) return { ok: false, motivo: "fecha futura (a\xFAn no ha ocurrido)" };
  let conSigno = parseImporteConSigno(get("importe"));
  if ((conSigno === null || conSigno === 0) && (mapeo.cargo >= 0 || mapeo.abono >= 0)) {
    const abono = Math.abs(parseImporteConSigno(get("abono")) ?? 0);
    const cargo = Math.abs(parseImporteConSigno(get("cargo")) ?? 0);
    conSigno = Math.round((abono - cargo) * 100) / 100;
  }
  if (conSigno === null || conSigno === 0) return { ok: false, motivo: "importe no v\xE1lido" };
  const importe = Math.abs(conSigno);
  if (plantilla) {
    const t = traducirTipoPlantilla(get("tipo"), conSigno, String(get("categoria") || "").trim());
    if (!t) return { ok: false, motivo: `tipo desconocido ("${get("tipo") ?? ""}")` };
    const plataforma2 = String(get("plataforma") || "").trim();
    const activo2 = String(get("activo") || "").trim();
    let nota2 = String(get("concepto") || "").trim();
    if (activo2 && !normaliza(nota2).includes(normaliza(activo2))) nota2 = nota2 ? `${nota2} \xB7 ${activo2}` : activo2;
    return { ok: true, mov: { fecha, tipo: t.tipo, categoria: t.categoria, nota: nota2, importe, plataforma: plataforma2, esInversion: t.esInversion } };
  }
  let tipoRaw = normaliza(get("tipo"));
  if (tipoRaw === "") tipoRaw = conSigno < 0 || !signoDecideTipo ? "gasto" : "ingreso";
  let tipo;
  let esInversion2 = false;
  if (tipoRaw === "ingreso" || tipoRaw === "income") tipo = "ingreso";
  else if (tipoRaw === "inversion" || tipoRaw === "inversi\xF3n") {
    tipo = "gasto";
    esInversion2 = true;
  } else if (tipoRaw === "gasto" || tipoRaw === "expense" || tipoRaw === "") tipo = "gasto";
  else return { ok: false, motivo: `tipo desconocido ("${get("tipo")}")` };
  let categoria = String(get("categoria") || "").trim();
  let categoriaBanco = "";
  if (!(mapeo.tipo >= 0) && categoria && normaliza(categoria) !== "inversion") {
    categoriaBanco = categoria;
    categoria = "";
  }
  const plataforma = String(get("plataforma") || "").trim();
  if (esInversion2) categoria = "Inversion";
  else if (normaliza(categoria) === "inversion" || normaliza(categoria) === "inversiones") {
    esInversion2 = true;
    categoria = "Inversion";
  }
  const nota = String(get("concepto") || "").trim();
  return {
    ok: true,
    mov: { fecha, tipo, categoria, nota, importe, plataforma, esInversion: esInversion2, ...categoriaBanco ? { categoriaBanco } : {} }
  };
}
var OPERACION_NO_HECHA = /revert|declin|fail|rechaz|denegad|anulad|cancel|pending|pendiente/;
var TIPOS_CONOCIDOS = /* @__PURE__ */ new Set(["ingreso", "income", "gasto", "expense", "inversion", "inversi\xF3n"]);
function claveDuplicado({ fecha, tipo, importe, nota }) {
  return `${fecha}|${tipo}|${Number(importe).toFixed(2)}|${(nota || "").toLowerCase()}`;
}
function procesarFilas(filas, mapeo, clavesExistentes, { inicio = 0 } = {}) {
  const validas = [];
  const errores = [];
  const duplicados = [];
  const clavesLote = /* @__PURE__ */ new Set();
  const signoDecideTipo = mapeo.cargo >= 0 || mapeo.abono >= 0 || mapeo.importe >= 0 && filas.some((c) => (parseImporteConSigno(c[mapeo.importe]) ?? 0) < 0);
  const plantilla = esPlantilla(mapeo, filas);
  if (mapeo.tipo >= 0) {
    const valores = filas.map((c) => normaliza(c[mapeo.tipo])).filter(Boolean);
    const entendidos = valores.filter((v) => TIPOS_CONOCIDOS.has(v) || plantilla && tipoDePlantilla(v)).length;
    if (valores.length && entendidos < valores.length / 2) mapeo = { ...mapeo, tipo: -1 };
  }
  filas.forEach((campos, i) => {
    const res = validarFila(campos, mapeo, { signoDecideTipo, plantilla: plantilla && mapeo.tipo >= 0 });
    if (!res.ok) {
      errores.push({ fila: inicio + i + 2, motivo: res.motivo, campos });
      return;
    }
    const clave2 = claveDuplicado(res.mov);
    if (clavesExistentes.has(clave2) || clavesLote.has(clave2)) {
      duplicados.push(res.mov);
      return;
    }
    clavesLote.add(clave2);
    validas.push(res.mov);
  });
  return { validas, errores, duplicados, plantilla: plantilla && mapeo.tipo >= 0 };
}

// src/lib/revisionImportacion.js
function categorizarFilas(filas, categorizador) {
  return filas.map((f) => {
    if (f.categoria) return { ...f, sugerida: false };
    let c = categorizador({ nota: f.nota, tipo: f.tipo });
    if (c.origen === "defecto" && f.categoriaBanco) {
      const delBanco = categoriaDesdeBanco(f.categoriaBanco, f.tipo);
      if (delBanco) c = { ...c, categoria: delBanco, origen: "banco" };
    }
    const esInv = c.categoria === CATEGORIA_INVERSION;
    return { ...f, categoria: c.categoria, esInversion: f.esInversion || esInv, sugerida: true, negociable: c.negociable };
  });
}
export {
  CATEGORIA_AJUSTE,
  CATEGORIA_INVERSION,
  COLUMNAS_PLANTILLA,
  INSTRUCCIONES_ASISTENTE,
  TIPOS_PLANTILLA,
  bolsas,
  categorizarFilas,
  claveDuplicado,
  claveMes,
  configurarPeriodo,
  crearCategorizador,
  detectarMapeo,
  esAjuste,
  esDevolucion,
  esInversion,
  esRetiradaInversion,
  esTraspaso,
  formaEtiqueta,
  gastoPorCategoria,
  parseFecha,
  parseImporteConSigno,
  procesarFilas,
  tablaDesdeFilas,
  totalesDe
};
