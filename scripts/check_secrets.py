#!/usr/bin/env python3
"""Check Git blobs without printing potential secrets. Requires Python 3 only."""
import argparse
import pathlib
import re
import subprocess
import sys


def git(*args):
    return subprocess.check_output(['git', *args])


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--all', action='store_true', help='Check all tracked files')
args = parser.parse_args()
paths = git('ls-files', '-z') if args.all else git(
    'diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z')
patterns = [
    rb'-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----',
    rb'\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{22,})\b',
    rb'\b(?:AKIA|ASIA)[A-Z0-9]{16}\b',
    rb'\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}\b',
    rb'https?://[^\s/:]+:[^\s/@]+@',
    rb'''(?im)^\s*["']?(?:api[_-]?key|client[_-]?secret|password|access[_-]?token|auth[_-]?token)["']?\s*[:=]\s*["']?[^\s"'<>]{8,}''',
]
failed = False
for raw in paths.split(b'\0'):
    if not raw:
        continue
    path = raw.decode('utf-8', 'surrogateescape')
    name = pathlib.PurePosixPath(path).name.lower()
    example = name in ('.env.example', '.env.sample')
    forbidden = (
        (name == '.env' or name.startswith('.env.')) and not example
        or name.endswith(('.pem', '.key', '.p12', '.pfx', '.keystore'))
        or name in ('credentials.json', '.npmrc', '.pypirc', '.netrc')
        or name.startswith('service-account') and name.endswith('.json')
        or bool(set(path.lower().split('/')) & {'.ssh', '.aws', 'saves', 'exports'})
    )
    # Read the index, never the potentially different working copy.
    data = git('show', ':' + path)
    if forbidden or any(re.search(pattern, data) for pattern in patterns):
        print(f'Blocked: {path!r} (sensitive filename or possible secret; value hidden).', file=sys.stderr)
        failed = True
if failed:
    print('Remove sensitive data from the Git index before committing. See SECURITY.md.', file=sys.stderr)
sys.exit(1 if failed else 0)
