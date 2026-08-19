import http.server
import pathlib
import socket
import ssl
import subprocess

PORT = 8443

certdir = pathlib.Path(".local-cert")
certdir.mkdir(exist_ok=True)
cert = certdir / "cert.pem"
key = certdir / "key.pem"
if not cert.exists():
    subprocess.run([
        "openssl", "req", "-x509", "-newkey", "rsa:2048",
        "-keyout", str(key), "-out", str(cert),
        "-days", "365", "-nodes", "-subj", "/CN=stream-for-all-local"
    ], check=True, capture_output=True)

def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()

ip = lan_ip()
print(f"Local       -> https://localhost:{PORT}/room.html")
print(f"Network     -> https://{ip}:{PORT}/room.html")
print(f"Room mocks  -> https://{ip}:{PORT}/room.html?mock=1")
print("The certificate is self-signed. Accept the browser warning on each device.")

httpd = http.server.ThreadingHTTPServer(("0.0.0.0", PORT), http.server.SimpleHTTPRequestHandler)
ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ctx.load_cert_chain(cert, key)
httpd.socket = ctx.wrap_socket(httpd.socket, server_side=True)
httpd.serve_forever()
