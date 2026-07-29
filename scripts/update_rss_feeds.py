#!/usr/bin/env python3
"""Fetch Naver blog RSS snapshots via rss2json and save to data/*.json."""

import json
import sys
import urllib.parse
import urllib.request

FEEDS = {
    'data/region-feed.json': 'https://rss.blog.naver.com/bacigi08.xml',
    'data/presale-feed.json': 'https://rss.blog.naver.com/jbbb1111.xml',
}

RSS2JSON_API = 'https://api.rss2json.com/v1/api.json?rss_url='


def fetch_rss(rss_url):
    api_url = RSS2JSON_API + urllib.parse.quote(rss_url, safe='')
    request = urllib.request.Request(api_url, headers={'User-Agent': 'kangbujang-rss-updater/1.0'})

    with urllib.request.urlopen(request, timeout=60) as response:
        data = json.load(response)

    if data.get('status') != 'ok':
        raise RuntimeError(data.get('message') or 'rss2json returned an error')

    if not data.get('items'):
        raise RuntimeError('rss2json returned no items')

    return data


def main():
    for path, rss_url in FEEDS.items():
        data = fetch_rss(rss_url)
        with open(path, 'w', encoding='utf-8') as handle:
            json.dump(data, handle, ensure_ascii=False, indent=2)
            handle.write('\n')
        print(f'Updated {path} ({len(data["items"])} items)')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(f'Error: {error}', file=sys.stderr)
        sys.exit(1)
