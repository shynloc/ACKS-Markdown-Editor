"""Assemble the offline editor. No runtime CDN requests or external assets."""
from pathlib import Path
import base64
import json
import os
import re

ROOT = Path(__file__).resolve().parent
def read(path):
    return (ROOT / path).read_text()
def script(text):
    return text.replace('</script', '<\\/script')

app = read('src/app.js').replace('const ICONS = {}; // ICONS_BUNDLE', 'const ICONS = ' + read('src/icons.json') + ';')
app = app.replace('/*__THEME_RENDER__*/', read('src/theme-render.js'))
app = app.replace('/*__EDITING_TOOLS__*/', read('src/editing-tools.js'))
app = app.replace('/*__SVG_SAFETY__*/', read('src/svg-safety.js'))
app = app.replace('/*__IMPORT_UI__*/', read('src/import-ui.js'))
assets={name:base64.b64encode((ROOT/'src/theme-assets'/f'{name}.png').read_bytes()).decode() for name in ['paper-edge','ink-gesture','glass-ribbon']}
app = app.replace('const THEME_ASSETS = {}; // THEME_ASSETS_BUNDLE', 'const THEME_ASSETS = '+json.dumps(assets)+';')
catalog = re.sub(r'const profiles\s*=\s*\[\]; // MILESTONE_PROFILES', lambda _: 'const profiles='+read('src/milestone-profiles.json')+';', read('src/theme-catalog.js'))
signatures=json.loads(read('src/theme-signatures.json'))
for value in signatures.values():
    if value['type']=='svg': value['svg']=read('src/theme-signatures/'+value['file'])
catalog=re.sub(r'const signatures\s*=\s*\{\}; // THEME_SIGNATURES', lambda _: 'const signatures='+json.dumps(signatures,ensure_ascii=False)+';', catalog)
logo = read('src/logo.svg')
replacements = {
    '/*__CSS__*/': read('src/article.css') + '\n' + read('src/app.css') + '\n' + read('src/theme-revision.css') + '\n' + read('src/milestone-base.css') + '\n' + read('src/milestone-generated.css') + '\n' + read('src/theme-catalog.css') + '\n' + read('src/import.css'),
    '/*__LOGO__*/': 'data:image/svg+xml;base64,' + base64.b64encode(logo.encode()).decode(),
    '/*__MARKED__*/': script(read('vendor/marked.js')),
    '/*__PURIFY__*/': script(read('vendor/purify.js')),
    '/*__CORE__*/': script(read('src/theme-core.js')+'\n'+read('src/theme-revision.js')+'\n'+catalog),
    '/*__MODEL__*/': script(read('src/editor-model.js')),
    '/*__STORE__*/': script(read('src/document-store.js')),
    '/*__DOCIMPORT__*/': script(read('src/document-import.js')),
    '/*__MAMMOTH__*/': script(read('vendor/mammoth.js')),
    '/*__FFLATE__*/': script(read('vendor/fflate.js')),
    '<!--__TOOLS_DIALOG__-->': read('src/tools-dialog.html'),
    '<!--__IMPORT_DIALOG__-->': read('src/import-dialog.html'),
    '/*__APP__*/': script(app),
}
licenses = '\n'.join(read('vendor/' + f) for f in ['LICENSE-marked', 'LICENSE-dompurify', 'LICENSE-phosphor', 'LICENSE-fflate', 'LICENSE-mammoth'])
html = read('src/shell.html').replace('<head>', '<head>\n<!-- Third-party licenses\n' + licenses.replace('-->', '-- >') + '\n-->')
for marker, value in replacements.items():
    html = html.replace(marker, value)
temporary=ROOT/'.md-editor.build.tmp'
temporary.write_text(html)
if (ROOT/'md-editor.html').exists(): os.chmod(temporary,(ROOT/'md-editor.html').stat().st_mode)
temporary.replace(ROOT/'md-editor.html')
(ROOT / 'src/app.compiled.js').write_text(app)
(ROOT / 'src/theme-catalog.compiled.js').write_text(catalog)
print('Built md-editor.html:', len(html.encode()), 'bytes')
