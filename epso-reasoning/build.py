# Rebuilds index.html from the files in src/. Usage: python3 build.py .
import os, sys
d = sys.argv[1] if len(sys.argv) > 1 else '.'
js = ''.join(open(os.path.join(d, 'src', f), encoding='utf8').read() + '\n'
             for f in ['verbal-original.js', 'verbal-more.js', 'verbal-kviz.js', 'gen.js', 'method.js', 'coach.js', 'manual.js', 'app.js'])
js = js.replace('</script', '<\\/script')
shell = open(os.path.join(d, 'src', 'shell.html'), encoding='utf8').read()
open(os.path.join(d, 'index.html'), 'w', encoding='utf8').write(shell.replace('/*__DATA__*/', js))
