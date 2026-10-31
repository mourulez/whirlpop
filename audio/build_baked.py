"""Genera audio/baked.js: la musica y los efectos de textura ya renderizados.

Uso (desde la raiz del repo):  python3 audio/build_baked.py [--kbps N] [--keep DIR]

--kbps N fuerza el mismo bitrate en los dos sprites (por defecto, KBPS).

Requiere Chrome y lameenc (pip install lameenc; trae LAME, no hace falta
compilar). Sirve index.html en local con audio/build_baked.js inyectado tras el
script principal, lo abre en Chrome headless y recibe de el dos sprites en PCM
float a 48 kHz (musica y efectos: cada pieza en su sitio, con un chirrido de
sincronia al principio). Los codifica a MP3 mono CBR y los escribe en base64.
El pico se lleva a PEAK; el juego lo deshace al decodificar, midiendo el
chirrido, que pasa por la misma escala.

Se regenera cuando cambia el sonido de un instrumento o efecto (en
build_baked.js) o una nota que la partitura necesita (MEL, CHORDS, PROG o WALK
en index.html). El render es el de una primera corrida en cualquier navegador:
el juego antes lo hacia al desbloquear el audio, en cada carga de la pagina.

--keep DIR guarda ademas el PCM original y el manifiesto (para comparar con lo
que decodifica el navegador).

Salida: window.WHIRLPOP_BAKED = { sr, sync:[at,len], music:{mp3,parts}, tex:{...} }
con parts = [[grupo, clave, inicio, muestras], ...] en muestras a sr.
"""
import argparse, array, base64, http.server, json, os, shutil, subprocess, sys, tempfile, threading

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "audio", "baked.js")
CHROME = os.environ.get("CHROME", r"C:/Program Files/Google/Chrome/Application/chrome.exe")
# techo del pico tras codificar: el MP3 se pasa un poco del original en los ataques
PEAK = 0.89
# Medido contra el PCM original, decodificado en Chrome: lo tonal (notas) queda a
# 47-58 dB de SNR desde 64 kbps; lo que pierde es el ruido por encima de 16 kHz
# (platos, caja) y la envolvente de los transitorios. Los efectos, todo ruido y
# burbujas, a 96 kbps se apartaban hasta 4,9 dB en envolvente y a 128, 2,4.
KBPS = {"music": 96, "tex": 128}


def serve(got, done):
    page = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    i = page.rindex("</body>")
    page = (page[:i] + '<script src="audio/build_baked.js"></script>\n' + page[i:]).encode("utf-8")

    class H(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **k):
            super().__init__(*a, directory=ROOT, **k)

        def do_GET(self):
            if self.path.startswith("/__bake.html"):
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.end_headers()
                self.wfile.write(page)
                return
            super().do_GET()

        def do_POST(self):
            body = self.rfile.read(int(self.headers["Content-Length"]))
            got[self.path] = body
            self.send_response(200)
            self.end_headers()
            if self.path in ("/__manifest", "/__error"):
                done.set()

        def log_message(self, *a):
            pass

    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def render():
    got, done = {}, threading.Event()
    srv = serve(got, done)
    prof = tempfile.mkdtemp(prefix="whirlpop-bake-")
    url = "http://127.0.0.1:%d/__bake.html?reset&tut=1" % srv.server_address[1]
    p = subprocess.Popen([CHROME, "--headless=new", "--no-first-run", "--user-data-dir=" + prof, url],
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        if not done.wait(180):
            raise RuntimeError("Chrome no devolvio nada en 180 s")
    finally:
        # por PID, con su arbol: nunca por nombre, cerraria el Chrome del usuario
        if os.name == "nt":
            subprocess.run(["taskkill", "/PID", str(p.pid), "/T", "/F"], capture_output=True)
        else:
            p.kill()
        p.wait()
        srv.shutdown()
        shutil.rmtree(prof, ignore_errors=True)
    if "/__error" in got:
        raise RuntimeError("en el navegador: " + got["/__error"].decode("utf-8", "replace"))
    return json.loads(got["/__manifest"]), got["/__pcm/music"], got["/__pcm/tex"]


def encode(raw, sr, kbps):
    a = array.array("f")
    a.frombytes(raw)
    peak = max(max(a), -min(a))
    s = min(1.0, PEAK / peak) if peak else 1.0
    k = 32767 * s
    pcm = array.array("h", (int(round(x * k)) for x in a))
    enc = __import__("lameenc").Encoder()
    enc.set_bit_rate(kbps)
    enc.set_in_sample_rate(sr)
    enc.set_out_sample_rate(sr)
    enc.set_channels(1)
    enc.set_quality(2)
    mp3 = bytes(enc.encode(pcm.tobytes()) + enc.flush())
    return mp3, peak, len(a) / sr


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--kbps", type=int)
    ap.add_argument("--keep")
    args = ap.parse_args()
    man, music, tex = render()
    out = {"sr": man["sr"], "sync": [man["syncAt"], man["syncLen"]]}
    for name, raw in (("music", music), ("tex", tex)):
        kbps = args.kbps or KBPS[name]
        mp3, peak, dur = encode(raw, man["sr"], kbps)
        out[name] = {"mp3": base64.b64encode(mp3).decode("ascii"), "parts": man[name]}
        print("%-5s %3d piezas, %5.1f s, pico %.3f, MP3 %d kbps: %d bytes"
              % (name, len(man[name]), dur, peak, kbps, len(mp3)))
    if args.keep:
        os.makedirs(args.keep, exist_ok=True)
        for name, raw in (("music", music), ("tex", tex)):
            open(os.path.join(args.keep, name + ".f32"), "wb").write(raw)
        json.dump(man, open(os.path.join(args.keep, "manifest.json"), "w"))
    js = ("// Generado por audio/build_baked.py: no editar a mano.\n"
          "// Musica y efectos de textura de Whirlpop, renderizados en MP3. Ver audio/CREDITOS.md.\n"
          "window.WHIRLPOP_BAKED = " + json.dumps(out, separators=(",", ":")) + ";\n")
    with open(OUT, "w", encoding="ascii", newline="\n") as f:
        f.write(js)
    print("escrito %s (%d bytes)" % (OUT, len(js)))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # noqa: BLE001
        print("error:", e, file=sys.stderr)
        sys.exit(1)
