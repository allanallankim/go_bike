const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const root = __dirname;
loadEnv(path.join(root, '.env'));
// Public browser SDK key; deployments may override it with an environment variable.
const kakaoJavaScriptKey = process.env.KAKAO_JAVASCRIPT_KEY || 'ec488d4f5312fe9e2f5d9815029c9ef3';
const mimeTypes = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.gpx':'application/gpx+xml; charset=utf-8', '.ico':'image/x-icon' };

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}
function sendJson(res, status, body) { res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' }); res.end(JSON.stringify(body)); }
async function weather(lat, lon) {
  const query = new URLSearchParams({ latitude:String(lat), longitude:String(lon), current:'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m', hourly:'temperature_2m,weather_code,precipitation_probability,wind_speed_10m,wind_direction_10m', wind_speed_unit:'kmh', forecast_days:'2', timezone:'Asia/Seoul' });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Weather upstream returned ${response.status}`);
  return response.json();
}
const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  if (requestUrl.pathname === '/api/config') {
    return sendJson(res, 200, { kakaoJavaScriptKey });
  }
  if (requestUrl.pathname === '/api/weather') {
    const lat = Number(requestUrl.searchParams.get('lat')); const lon = Number(requestUrl.searchParams.get('lon'));
    if (!requestUrl.searchParams.get('lat')?.trim() || !requestUrl.searchParams.get('lon')?.trim() || !Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return sendJson(res, 400, { error:'올바른 좌표가 필요합니다.' });
    try { return sendJson(res, 200, await weather(lat, lon)); }
    catch (error) {
      console.error('Weather upstream failure:', error.message, error.cause?.code || error.code || error.name);
      return sendJson(res, 502, { error:'날씨 정보를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.' });
    }
  }
  const relative = requestUrl.pathname === '/' ? 'index_좌표선택_지명검색_개선본2.html' : decodeURIComponent(requestUrl.pathname).replace(/^[/\\]+/, '');
  const target = path.resolve(root, relative);
  const publicFiles = new Set(['index.html', 'index_좌표선택_지명검색_개선본2.html', 'app.js', 'style.css', 'favicon.ico']);
  if (!publicFiles.has(relative)) { res.writeHead(404); return res.end('Not found'); }
  if (!target.startsWith(root + path.sep) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': mimeTypes[path.extname(target)] || 'application/octet-stream' });
  fs.createReadStream(target).pipe(res);
});
const port = Number(process.env.PORT) || 3000;
server.listen(port, () => console.log(`Weather app: http://localhost:${port}`));
