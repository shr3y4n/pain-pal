import http from 'http';
const data = JSON.stringify({ prompt: "hello" });
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/journal',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};
const req = http.request(options, res => {
  console.log('statusCode:', res.statusCode);
  res.on('data', d => { process.stdout.write(d); });
});
req.on('error', e => { console.error(e); });
req.write(data);
req.end();
