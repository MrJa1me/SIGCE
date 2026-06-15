import csv, os

# Create HTML version of planilla de pruebas
csv_path = os.path.join(os.path.dirname(__file__), 'planilla-pruebas.csv')
html_path = os.path.join(os.path.dirname(__file__), 'planilla-pruebas.html')

with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.reader(f, delimiter=';')
    rows = list(reader)

html = '''<!DOCTYPE html>
<html lang="es-CL">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Planilla de Pruebas - SIGCE</title>
<style>
body { font-family: 'Segoe UI', sans-serif; margin: 20px; background: #f8f9fa; }
h1 { color: #003366; border-bottom: 3px solid #C8A020; padding-bottom: 10px; }
table { border-collapse: collapse; width: 100%; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
th { background: #003366; color: white; padding: 10px 8px; text-align: left; font-size: 0.85em; }
td { padding: 8px; border-bottom: 1px solid #dee2e6; font-size: 0.85em; vertical-align: top; }
tr:hover { background: #f0f4ff; }
.stats { margin-bottom: 20px; display: flex; gap: 20px; }
.stat { padding: 10px 20px; background: white; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
.stat span { font-weight: 700; color: #003366; }
</style>
</head>
<body>
<h1>Planilla de Casos de Prueba — SIGCE</h1>
<p>Basado en ISO/IEC 25010 | Evaluacion Parcial N 3 - Ingenieria de Software</p>
'''

pendientes = sum(1 for r in rows[1:] if r[8] == 'Pendiente')
aprobados = sum(1 for r in rows[1:] if r[8] == 'Aprobado')

html += f'''<div class="stats">
<div class="stat">Total: <span>{len(rows)-1}</span></div>
<div class="stat">Pendientes: <span>{pendientes}</span></div>
</div>
'''

html += '<table><thead><tr>'
for h in rows[0]:
    html += f'<th>{h}</th>'
html += '</tr></thead><tbody>'

for r in rows[1:]:
    html += '<tr>'
    for i, c in enumerate(r):
        cls = ''
        if c == 'Pendiente':
            cls = ' style="color:#856404;font-weight:600;"'
        elif c == 'Aprobado':
            cls = ' style="color:#155724;font-weight:600;"'
        html += f'<td{cls}>{c}</td>'
    html += '</tr>'

html += '</tbody></table></body></html>'

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)

print(f'Creado: {html_path}')

# Create HTML version of control de cambios
csv_path2 = os.path.join(os.path.dirname(__file__), 'control-cambios.csv')
html_path2 = os.path.join(os.path.dirname(__file__), 'control-cambios.html')

with open(csv_path2, 'r', encoding='utf-8') as f:
    reader = csv.reader(f, delimiter=';')
    rows2 = list(reader)

html2 = '''<!DOCTYPE html>
<html lang="es-CL">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Control de Cambios - SIGCE</title>
<style>
body { font-family: 'Segoe UI', sans-serif; margin: 20px; background: #f8f9fa; }
h1 { color: #003366; border-bottom: 3px solid #C8A020; padding-bottom: 10px; }
table { border-collapse: collapse; width: 100%; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
th { background: #003366; color: white; padding: 10px 8px; text-align: left; font-size: 0.85em; }
td { padding: 8px; border-bottom: 1px solid #dee2e6; font-size: 0.85em; vertical-align: top; }
tr:hover { background: #f0f4ff; }
.tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.8em; font-weight: 600; }
.tag-creacion { background: #cce5ff; color: #004085; }
.tag-correccion { background: #fff3cd; color: #856404; }
.tag-evolutivo { background: #d4edda; color: #155724; }
</style>
</head>
<body>
<h1>Registro de Control de Cambios — SIGCE</h1>
<p>Historial de versiones del prototipo | Evaluacion Parcial N 3</p>
'''

html2 += '<table><thead><tr>'
for h in rows2[0]:
    html2 += f'<th>{h}</th>'
html2 += '</tr></thead><tbody>'

for r in rows2[1:]:
    html2 += '<tr>'
    for i, c in enumerate(r):
        if i == 5:
            cls_map = {'Creacion': 'tag-creacion', 'Correccion': 'tag-correccion', 'Evolutivo': 'tag-evolutivo'}
            # Normalize for matching
            c_norm = c.replace('ó', 'o').replace('ó', 'o')
            tag_cls = ''
            for k, v in cls_map.items():
                if k in c_norm or c_norm in k:
                    tag_cls = v
                    break
            html2 += f'<td><span class="tag {tag_cls}">{c}</span></td>'
        else:
            html2 += f'<td>{c}</td>'
    html2 += '</tr>'

html2 += '</tbody></table></body></html>'

with open(html_path2, 'w', encoding='utf-8') as f:
    f.write(html2)

print(f'Creado: {html_path2}')
