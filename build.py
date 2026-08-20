#!/usr/bin/env python3
"""Pack index.html into dist/ for js13k.

No JS parser is available offline, so this works on a scanner that splits the
script into code and string-literal segments. Comments and indentation go, then
top-level names get single-letter aliases -- but only names that are never used
as a property, an object key, or inside a string, and rewriting only ever
touches code segments so display text is never mangled."""
import os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC, OUT, LIMIT = os.path.join(HERE, 'index.html'), os.path.join(HERE, 'dist'), 13312

def segments(js):
    """[(is_string, text), ...] -- comments dropped."""
    seg, buf, i, n = [], [], 0, len(js)
    while i < n:
        c = js[i]
        if c in '\'"`':
            seg.append((0, ''.join(buf))); buf = []
            j, q = i + 1, c
            while j < n:
                if js[j] == '\\': j += 2; continue
                if js[j] == q: break
                j += 1
            seg.append((1, js[i:j+1])); i = j + 1; continue
        if c == '/' and i + 1 < n and js[i+1] == '/':
            while i < n and js[i] != '\n': i += 1
            continue
        if c == '/' and i + 1 < n and js[i+1] == '*':
            i = js.index('*/', i) + 2; continue
        buf.append(c); i += 1
    seg.append((0, ''.join(buf)))
    return seg

def squeeze(code):
    code = '\n'.join(l.strip() for l in code.split('\n'))
    code = re.sub(r'\n+', '\n', code)
    return re.sub(r'\s*([=+\-*/%<>!&|^~,;:?{}()\[\]])\s*', r'\1', code)

def renamable(js_code, strings):
    names = set(re.findall(r'\bfunction\s+([A-Za-z_$][\w$]*)', js_code))
    for m in re.finditer(r'\b(?:const|let)\s+([^=;\n]+?)=', js_code):
        for part in m.group(1).split(','):
            part = part.strip()
            if re.fullmatch(r'[A-Za-z_$][\w$]*', part): names.add(part)
    blob = ''.join(strings)
    out = []
    for n in names:
        if len(n) < 3: continue
        if re.search(r'\.\s*%s\b' % n, js_code): continue     # a property somewhere
        if re.search(r'\b%s\s*:' % n, js_code): continue      # an object key somewhere
        if re.search(r'\b%s\b' % n, blob): continue           # shows up in text
        out.append(n)
    return sorted(out, key=lambda n: -(len(n) * js_code.count(n)))

# Property names that belong to this game alone -- never DOM, canvas, Math or
# JSON members. Renaming these is only safe because every occurrence (obj.prop,
# {prop: ...} and shorthand) lives in a code segment and gets the same alias.
PROPS = ['parts','segs','tiles','ramps','life','shards','stolen','prism','drain','paint',
         'links','spawn','holds','flash','stun','dash','ents','seen','goal','burst',
         'start','pop','tel','tmr','hx','hy','mp','iv']

def pack(js):
    seg = segments(js)
    code = ''.join(t for s, t in seg if not s)
    strings = [t for s, t in seg if s]
    used = set(re.findall(r'\b[A-Za-z_$][\w$]*\b', code)) | set(re.findall(r'\w+', ''.join(strings)))
    az = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
    free = [a for a in az if a not in used] + [a + b for a in az for b in az if a + b not in used]
    ren = {}
    for n in PROPS + renamable(code, strings):
        if not free: break
        s = free.pop(0)
        if len(s) < len(n) and n not in ren: ren[n] = s
        elif len(s) >= len(n): free.insert(0, s)
    rx = re.compile(r'\b(%s)\b' % '|'.join(map(re.escape, sorted(ren, key=len, reverse=True)))) if ren else None
    out = []
    for is_str, txt in seg:
        if is_str: out.append(txt)
        else:
            if rx: txt = rx.sub(lambda m: ren[m.group(1)], txt)
            out.append(squeeze(txt))
    return ''.join(out), len(ren)

def main():
    html = open(SRC, encoding='utf-8').read()
    head, rest = html.split('<script>', 1)
    js, tail = rest.split('</script>', 1)
    packed, nren = pack(js)
    head = re.sub(r'\n\s*', '', head)
    out = head + '<script>' + packed + '</script>' + tail.strip()
    os.makedirs(OUT, exist_ok=True)
    dist = os.path.join(OUT, 'index.html')
    open(dist, 'w', encoding='utf-8').write(out)
    subprocess.run(['node', '-e',
                    'new Function(require("fs").readFileSync(process.argv[1],"utf8")'
                    '.split("<script>")[1].split("</script>")[0])', dist], check=True)
    zp = os.path.join(OUT, 'game.zip')
    if os.path.exists(zp): os.remove(zp)
    subprocess.run(['zip', '-qXj9', zp, dist], check=True)
    z = os.path.getsize(zp)
    print('renamed %d names | raw %d | zipped %d / %d (%+d)' % (nren, len(out.encode()), z, LIMIT, LIMIT - z))
    return 0 if z <= LIMIT else 1

sys.exit(main())
