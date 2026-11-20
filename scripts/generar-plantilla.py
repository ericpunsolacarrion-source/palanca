# Genera public/plantilla-palanca.xlsx (la plantilla que se descarga desde
# Importar). Las columnas y los tipos deben coincidir con src/lib/plantillaPalanca.js.
# Uso: python3 scripts/generar-plantilla.py
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.worksheet.datavalidation import DataValidation

COLUMNAS = ['Fecha', 'Tipo', 'Concepto', 'Categoría', 'Importe', 'Plataforma', 'Activo']
TIPOS = ['Gasto', 'Ingreso', 'Devolución', 'Traspaso a ahorro', 'Desde ahorro', 'Aportación al bróker',
         'Retirada del bróker', 'Compra inversión', 'Venta inversión', 'Interés', 'Dividendo']
CAT_GASTO = ['Comida', 'Restaurantes', 'Transporte', 'Vivienda', 'Suministros', 'Suscripciones', 'Seguros', 'Compras',
             'Salud', 'Ocio', 'Deporte', 'Viajes', 'Educación', 'Impuestos', 'Efectivo', 'Otros']
CAT_INGRESO = ['Nómina', 'Otros ingresos']
EJEMPLOS = [
    ['28/10/2026', 'Ingreso', 'Nómina octubre', 'Nómina', '1.450,00', '', ''],
    ['29/10/2026', 'Gasto', 'Mercadona', 'Comida', '42,35', '', ''],
    ['30/10/2026', 'Devolución', 'Devolución Zara', 'Compras', '19,95', '', ''],
    ['30/10/2026', 'Aportación al bróker', 'Transferencia a Trade Republic', '', '500,00', 'Trade Republic', ''],
    ['31/10/2026', 'Compra inversión', 'Compra NVIDIA', '', '251,00', 'Trade Republic', 'NVIDIA'],
    ['01/11/2026', 'Interés', 'Intereses Trade Republic', '', '3,12', 'Trade Republic', ''],
    ['05/11/2026', 'Venta inversión', 'Venta ETF', '', '120,40', 'Trade Republic', 'S&P 500 ETF'],
]
cab = Font(bold=True, color='FFFFFF')
fondo = PatternFill('solid', fgColor='1F2937')

wb = Workbook()
ws = wb.active
ws.title = 'Movimientos'
ws.append(COLUMNAS)
for i, ancho in enumerate([13, 22, 36, 18, 13, 18, 18]):
    ws.column_dimensions['ABCDEFG'[i]].width = ancho
for c in ws[1]:
    c.font, c.fill = cab, fondo
ws.freeze_panes = 'A2'
for fila in range(2, 5001):
    ws.cell(fila, 1).number_format = 'dd/mm/yyyy'
    ws.cell(fila, 5).number_format = '#,##0.00'

listas = wb.create_sheet('Listas')
listas.append(['Tipo', 'Categorías de gasto', 'Categorías de ingreso'])
for i in range(max(len(TIPOS), len(CAT_GASTO))):
    listas.append([TIPOS[i] if i < len(TIPOS) else None, CAT_GASTO[i] if i < len(CAT_GASTO) else None,
                   CAT_INGRESO[i] if i < len(CAT_INGRESO) else None])
for c in listas[1]:
    c.font = Font(bold=True)
listas.column_dimensions['A'].width = 24
listas.column_dimensions['B'].width = 22
listas.column_dimensions['C'].width = 22

dv_tipo = DataValidation(type='list', formula1=f"=Listas!$A$2:$A${len(TIPOS) + 1}", allow_blank=True,
                         showErrorMessage=True, errorTitle='Tipo no válido', error='Elige un tipo de la lista.')
ws.add_data_validation(dv_tipo)
dv_tipo.add('B2:B5000')
# Categoría: se sugiere la lista, pero se puede escribir otra (aviso, no error).
dv_cat = DataValidation(type='list', formula1=f"=Listas!$B$2:$B${len(CAT_GASTO) + 1}", allow_blank=True,
                        showErrorMessage=True, errorStyle='information', errorTitle='Categoría nueva',
                        error='No está en la lista: Palanca la creará como tuya.')
ws.add_data_validation(dv_cat)
dv_cat.add('D2:D5000')

ayuda = wb.create_sheet('Cómo rellenarla', 1)
lineas = [
    'PLANTILLA DE PALANCA',
    'Rellena la pestaña «Movimientos»: una fila por movimiento real. Sin totales ni fórmulas.',
    '',
    'Fecha: dd/mm/aaaa, el día real en que se movió el dinero. Nada de fechas futuras ni filas sin fecha.',
    'Tipo: elige de la lista. Lo que entra o sale lo decide el tipo.',
    'Concepto: texto corto (el comercio, la nómina, la compra…). Si vuelves a subir el archivo, no lo cambies: así no se duplica.',
    'Categoría: en Gasto, Ingreso y Devolución. Puedes usar las tuyas.',
    'Importe: siempre en positivo y en euros (1.234,56).',
    'Plataforma y Activo: solo en filas de inversión y del bróker.',
    '',
    'Qué es cada tipo:',
    '· Gasto: solo tu parte si era compartido. Cajero = Gasto «Efectivo». Pagos con la tarjeta del bróker también son Gasto.',
    '· Ingreso: la nómina, siempre el neto que llega al banco.',
    '· Devolución: reembolsos o bizums que te devuelven parte de algo que pagaste.',
    '· Traspaso a ahorro / Desde ahorro: mover dinero entre tus cuentas (no es gasto ni ingreso).',
    '· Aportación al bróker / Retirada del bróker: transferencias entre tu banco y el bróker (no es gasto ni inversión).',
    '· Compra inversión: comprar acciones, ETF o fondos, comisión incluida. Es lo que cuenta como «invertido».',
    '· Venta inversión: lo que recibes al vender.',
    '· Interés / Dividendo: lo cobrado (cuenta como ingreso).',
    '',
    'Si ya tenías inversiones antes de la primera fila: añade una «Compra inversión» por posición con esa fecha y lo que te costó.',
    'Al subirla, Palanca te pedirá cuánto tenías en el banco y en el bróker el día de tu último movimiento, para cuadrar el saldo.',
    '',
    'Ejemplos (no se importan):',
]
for l in lineas:
    ayuda.append([l])
ayuda['A1'].font = Font(bold=True, size=14)
ayuda.append([f'Ejemplo · {c}' for c in COLUMNAS])
for c in ayuda[ayuda.max_row]:
    c.font = Font(bold=True)
for e in EJEMPLOS:
    ayuda.append(e)
ayuda.column_dimensions['A'].width = 120
for col, ancho in zip('BCDEFG', [22, 32, 18, 13, 18, 16]):
    ayuda.column_dimensions[col].width = ancho
for fila in ayuda.iter_rows(min_row=2, max_row=len(lineas)):
    fila[0].alignment = Alignment(wrap_text=False)

wb.save('public/plantilla-palanca.xlsx')
print('public/plantilla-palanca.xlsx')
