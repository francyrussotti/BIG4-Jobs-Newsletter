import sys,os
d=sys.argv[1]
js=''.join(open(os.path.join(d,'src',f),encoding='utf8').read()+'\n' for f in ['verbal-original.js','verbal-more.js','verbal-kviz.js','gen.js','method.js','coach.js','app.js'])
js=js.replace('</script','<\\/script')
shell=open(os.path.join(d,'src','shell.html'),encoding='utf8').read()
os.makedirs(os.path.join(d,'dist'),exist_ok=True)
open(os.path.join(d,'dist','index.html'),'w',encoding='utf8').write(shell.replace('/*__DATA__*/',js))
