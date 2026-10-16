// Tira o prefixo /rest/v1 que o supabase-js manda, pra falar com o PostgREST puro.
import http from "node:http";
http.createServer((req, res) => {
  if (!req.url.startsWith("/rest/v1")) {
    res.writeHead(404, { "content-type": "application/json" });
    return res.end('{"message":"storage/auth indisponíveis no ambiente de teste"}');
  }
  const p = http.request({ port: 54331, path: req.url.slice(8) || "/", method: req.method, headers: req.headers },
    (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  p.on("error", () => { res.writeHead(502); res.end(); });
  req.pipe(p);
}).listen(54330);
