"""Package source and validated static output; never include Git or browser data."""
from pathlib import Path
import hashlib
import json
import shutil
import zipfile

root = Path(__file__).resolve().parent.parent
output = root / 'deliverables'
output.mkdir(exist_ok=True)
folders = ['.github', 'app', 'components', 'hooks', 'lib', 'public', 'src', 'tests', 'scripts', 'docs']
names = ['.gitignore', 'README.md', 'LICENSE', 'package.json', 'pnpm-lock.yaml',
         'pnpm-workspace.yaml', 'components.json', 'index.html', 'next.config.ts',
         'next-env.d.ts', 'tsconfig.json', 'vite.config.ts', 'vite.pages.config.ts']
source = [root / name for name in names]
for folder in folders:
    source.extend(p for p in (root / folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
assert all(p.is_file() for p in source), 'Missing source file'
assert (root / 'out/index.html').is_file(), 'Build first with pnpm build:pages'

archives = [('paper-trail-source.zip', source, root),
            ('paper-trail-static.zip', [p for p in (root / 'out').rglob('*') if p.is_file()], root / 'out')]
manifest = []
for name, files, base in archives:
    path = output / name
    with zipfile.ZipFile(str(path), 'w', zipfile.ZIP_DEFLATED) as archive:
        for item in sorted(files):
            archive.write(str(item), item.relative_to(base).as_posix())
        if name == 'paper-trail-static.zip' and not (base / '.nojekyll').exists():
            archive.writestr('.nojekyll', '')
    with zipfile.ZipFile(str(path)) as archive:
        assert archive.testzip() is None
        entries = archive.namelist()
        assert all(not x.startswith('/') and '..' not in x.split('/') for x in entries)
        assert not any('node_modules/' in x or x.startswith('.git/') or x.endswith('.env') for x in entries)
        if name == 'paper-trail-source.zip':
            for expected in ['.github/workflows/main.yml', 'components/migration-dialog.tsx',
                             'lib/migration.ts', 'pnpm-lock.yaml', 'docs/DEPLOYMENT.zh-CN.md']:
                assert expected in entries
        manifest.append({'file': name, 'entries': len(entries), 'bytes': path.stat().st_size,
                         'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
shutil.copyfile(str(root / 'docs/DEPLOYMENT.zh-CN.md'), str(output / 'DEPLOYMENT.zh-CN.md'))
(output / 'checksums.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
print(json.dumps(manifest, indent=2))
