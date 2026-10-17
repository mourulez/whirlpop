"""Genera audio/piano.js con las muestras de piano de los SFX tonales.

Uso (desde la raiz del repo, con red):  python3 audio/build_piano.py

Solo biblioteca estandar. Descarga 10 notas del Salamander Grand Piano V2
(Alexander Holm, CC BY 3.0) desde el repo de Tone.js, fijado a un commit, y de
cada una se queda con los primeros CUT_S segundos cortando por tramas MP3: sin
recodificar, sin ffmpeg y sin perdida respecto al original. Se quita la etiqueta
ID3 y la trama Xing/Info (no lleva audio; con el fichero recortado mentiria
sobre su duracion). El retardo del codificador que esa trama compensaba lo
absorbe el motor: mide el arranque real de cada muestra al decodificarla.

Los SFX nunca suenan mas de ~2,8 s (nota + cola de la envolvente), asi que
CUT_S = 3 no se llega a oir: el corte cae siempre en silencio de la envolvente.

Salida: window.WHIRLPOP_PIANO = { "Fs4": "<mp3 en base64>", ... }
"""
import base64, json, os, sys, urllib.request

COMMIT = "efd8296360f9526e379bfbe5c1698ff54d6a1d34"
URL = "https://raw.githubusercontent.com/Tonejs/audio/" + COMMIT + "/salamander/{}.mp3"
NOTES = ["Fs4", "A4", "C5", "Ds5", "Fs5", "A5", "C6", "Ds6", "Fs6", "A6"]
CUT_S = 3.0
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "piano.js")

BR = {  # kbps por [mpeg1?][indice]; solo layer III
    True:  [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
    False: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
}
SR = {3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000]}


def frames(d, i):
    """Itera (inicio, longitud, muestras, frecuencia) de cada trama desde i."""
    while i + 4 <= len(d):
        h = int.from_bytes(d[i:i + 4], "big")
        if (h >> 21) & 0x7FF != 0x7FF:
            raise ValueError("trama sin sincronia en el byte %d" % i)
        ver, layer = (h >> 19) & 3, (h >> 17) & 3
        bri, sri, pad = (h >> 12) & 15, (h >> 10) & 3, (h >> 9) & 1
        if layer != 1 or ver == 1 or bri in (0, 15) or sri == 3:
            raise ValueError("trama no soportada en el byte %d" % i)
        mpeg1 = ver == 3
        sr = SR[ver][sri]
        n = (144000 if mpeg1 else 72000) * BR[mpeg1][bri] // sr + pad
        yield i, n, (1152 if mpeg1 else 576), sr
        i += n


def trim(d):
    i = 0
    if d[:3] == b"ID3":
        i = 10 + ((d[6] << 21) | (d[7] << 14) | (d[8] << 7) | d[9])
    out, dur, first = bytearray(), 0.0, True
    for s, n, spf, sr in frames(d, i):
        fr = d[s:s + n]
        if first and (b"Xing" in fr[:64] or b"Info" in fr[:64]):
            first = False
            continue
        first = False
        out += fr
        dur += spf / sr
        if dur >= CUT_S:
            break
    return bytes(out), dur


def main():
    data = {}
    for n in NOTES:
        with urllib.request.urlopen(URL.format(n), timeout=30) as r:
            raw = r.read()
        mp3, dur = trim(raw)
        data[n] = base64.b64encode(mp3).decode("ascii")
        print("%-4s %6d -> %6d bytes, %.2f s" % (n, len(raw), len(mp3), dur))
    js = ("// Generado por audio/build_piano.py: no editar a mano.\n"
          "// Salamander Grand Piano V2, de Alexander Holm, CC BY 3.0\n"
          "// (https://creativecommons.org/licenses/by/3.0/). Ver audio/CREDITOS.md.\n"
          "window.WHIRLPOP_PIANO = " + json.dumps(data, separators=(",", ":")) + ";\n")
    with open(OUT, "w", encoding="ascii", newline="\n") as f:
        f.write(js)
    print("escrito %s (%d bytes)" % (OUT, len(js)))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # noqa: BLE001
        print("error:", e, file=sys.stderr)
        sys.exit(1)
