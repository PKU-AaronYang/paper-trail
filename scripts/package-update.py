"""Rebuild the cumulative update from current files, never from archived bytes."""
from pathlib import Path
import zipfile

root = Path(__file__).resolve().parent.parent
previous = root / 'deliverables/paper-trail-update-ritual-and-bulk.zip'
target = root / 'deliverables/paper-trail-update-title-divination-fixed.zip'
with zipfile.ZipFile(str(previous)) as archive:
    names = set(archive.namelist())
names.update(['docs/TITLE-DIVINATION-AND-PORTAL-FILTER-UPDATE.md', 'scripts/package-update.py'])
for name in names:
    path = (root / name).resolve()
    assert root in path.parents and path.is_file(), name
with zipfile.ZipFile(str(target), 'w', zipfile.ZIP_DEFLATED) as archive:
    for name in sorted(names):
        archive.write(str(root / name), name)
with zipfile.ZipFile(str(target)) as archive:
    assert archive.testzip() is None
    for name in archive.namelist():
        assert archive.read(name) == (root / name).read_bytes(), name
print('Verified {} current files: {}'.format(len(names), target))
