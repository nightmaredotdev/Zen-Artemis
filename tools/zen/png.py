#!/usr/bin/env python3
"""Tiny PNG helper for test screenshots (standard library only).

  png.py crop  <in.png> <out.png> x y w h [scale]
  png.py diff  <a.png> <b.png> [x y w h]   -> share of differing pixels, max delta
  png.py stack <out.png> <a.png> <b.png> ... (side by side)

Supports 8-bit RGB/RGBA, non-interlaced (what Marionette and System.Drawing write).
"""

from __future__ import annotations

import struct
import sys
import zlib


def read(path: str):
    data = open(path, "rb").read()
    assert data[:8] == b"\x89PNG\r\n\x1a\n", "not a PNG"
    pos, idat = 8, b""
    while pos < len(data):
        length, ctype = struct.unpack(">I4s", data[pos:pos + 8])
        chunk = data[pos + 8:pos + 8 + length]
        if ctype == b"IHDR":
            w, h, depth, color, _, _, interlace = struct.unpack(">IIBBBBB", chunk)
            assert depth == 8 and color in (2, 6) and interlace == 0, "unsupported PNG"
        elif ctype == b"IDAT":
            idat += chunk
        pos += 12 + length
    bpp = 3 if color == 2 else 4
    raw = zlib.decompress(idat)
    stride = w * bpp
    rows, prev = [], bytearray(stride)
    i = 0
    for _ in range(h):
        f = raw[i]
        line = bytearray(raw[i + 1:i + 1 + stride])
        i += 1 + stride
        for x in range(stride):
            a = line[x - bpp] if x >= bpp else 0
            b = prev[x]
            c = prev[x - bpp] if x >= bpp else 0
            if f == 1:
                line[x] = (line[x] + a) & 255
            elif f == 2:
                line[x] = (line[x] + b) & 255
            elif f == 3:
                line[x] = (line[x] + ((a + b) >> 1)) & 255
            elif f == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                line[x] = (line[x] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        rows.append(bytes(line) if bpp == 3 else bytes(
            v for px in range(w) for v in line[px * 4:px * 4 + 3]))
        prev = line
    return w, h, rows  # rows are RGB


def write(path: str, w: int, h: int, rows) -> None:
    raw = b"".join(b"\x00" + r for r in rows)

    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d))

    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 6)) + chunk(b"IEND", b"")
    open(path, "wb").write(png)


def crop(rows, x, y, w, h):
    return [r[x * 3:(x + w) * 3] for r in rows[y:y + h]]


def scale_up(rows, k):
    out = []
    for r in rows:
        line = b"".join(r[i:i + 3] * k for i in range(0, len(r), 3))
        out.extend([line] * k)
    return out


def main(argv):
    cmd = argv[1]
    if cmd == "crop":
        w, h, rows = read(argv[2])
        x, y, cw, ch = map(int, argv[4:8])
        k = int(argv[8]) if len(argv) > 8 else 1
        part = crop(rows, x, y, min(cw, w - x), min(ch, h - y))
        if k > 1:
            part = scale_up(part, k)
        write(argv[3], len(part[0]) // 3, len(part), part)
    elif cmd == "diff":
        wa, ha, ra = read(argv[2])
        wb, hb, rb = read(argv[3])
        x, y, cw, ch = (map(int, argv[4:8]) if len(argv) > 7 else (0, 0, min(wa, wb), min(ha, hb)))
        ra, rb = crop(ra, x, y, cw, ch), crop(rb, x, y, cw, ch)
        total = diff = maxd = 0
        x0 = y0 = 10**9
        x1 = y1 = -1
        for yy, (la, lb) in enumerate(zip(ra, rb)):
            for i in range(0, len(la), 3):
                d = max(abs(la[i] - lb[i]), abs(la[i + 1] - lb[i + 1]), abs(la[i + 2] - lb[i + 2]))
                total += 1
                if d > 2:
                    diff += 1
                    xx = i // 3
                    x0, y0, x1, y1 = min(x0, xx), min(y0, yy), max(x1, xx), max(y1, yy)
                maxd = max(maxd, d)
        box = f", region x{x0}-{x1} y{y0}-{y1}" if diff else ""
        print(f"differing pixels: {diff}/{total} ({100 * diff / max(total, 1):.3f}%), max delta {maxd}{box}")
    elif cmd == "stack":
        imgs = [read(p) for p in argv[3:]]
        h = max(i[1] for i in imgs)
        rows = []
        for y in range(h):
            line = b""
            for w, ih, r in imgs:
                line += (r[y] if y < ih else b"\x00" * (w * 3)) + b"\x80\x80\x80" * 4
            rows.append(line)
        write(argv[2], len(rows[0]) // 3, h, rows)
    else:
        raise SystemExit(__doc__)


if __name__ == "__main__":
    main(sys.argv)
