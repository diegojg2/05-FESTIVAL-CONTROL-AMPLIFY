const http = require('http');
const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, '..', 'data', 'festival-events.json');
const port = process.env.PORT || 3001;

function readEvents() {
  const raw = fs.readFileSync(dataFile, 'utf8');
  return JSON.parse(raw);
}

function writeEvents(events) {
  fs.writeFileSync(dataFile, JSON.stringify(events, null, 2) + '\n', 'utf8');
}

function normalizeEvent(payload = {}, fallbackId = null) {
  const artist = String(payload.artist || '').trim().toUpperCase();
  const space = String(payload.space || '').trim();
  const time = String(payload.time || '').trim();
  const status = ['CONFIRMED', 'DELAYED', 'CANCELLED'].includes(payload.status) ? payload.status : 'CONFIRMED';

  return {
    id: fallbackId || String(payload.id || `EVT-${Date.now().toString().slice(-7)}`),
    artist,
    space,
    time,
    status,
  };
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';

    req.on('data', (chunk) => {
      raw += chunk;
    });

    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error('JSON inválido'));
      }
    });

    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 200, { ok: true });
    return;
  }

  try {
    const url = new URL(req.url, `http://localhost:${port}`);
    const pathname = url.pathname;

    if (req.method === 'GET' && pathname === '/api/events') {
      sendJson(res, 200, readEvents());
      return;
    }

    if (req.method === 'POST' && pathname === '/api/events') {
      const body = await parseBody(req);
      const events = readEvents();

      if (!body.artist || !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(body.time || '').trim())) {
        sendJson(res, 400, { error: 'Artista y hora son obligatorios. Formato HH:MM.' });
        return;
      }

      const newEvent = normalizeEvent(body);
      const next = [newEvent, ...events];
      writeEvents(next);
      sendJson(res, 201, newEvent);
      return;
    }

    if (pathname.startsWith('/api/events/')) {
      const id = decodeURIComponent(pathname.replace('/api/events/', ''));
      const events = readEvents();
      const index = events.findIndex((event) => event.id === id);

      if (index === -1) {
        sendJson(res, 404, { error: 'Evento no encontrado' });
        return;
      }

      if (req.method === 'PUT') {
        const body = await parseBody(req);

        if (!body.artist || !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(body.time || '').trim())) {
          sendJson(res, 400, { error: 'Artista y hora son obligatorios. Formato HH:MM.' });
          return;
        }

        const updated = normalizeEvent({ ...events[index], ...body, id }, id);
        events[index] = updated;
        writeEvents(events);
        sendJson(res, 200, updated);
        return;
      }

      if (req.method === 'PATCH') {
        const body = await parseBody(req);
        const updated = normalizeEvent({ ...events[index], status: body.status || events[index].status }, id);
        events[index] = updated;
        writeEvents(events);
        sendJson(res, 200, updated);
        return;
      }

      if (req.method === 'DELETE') {
        const deleted = events[index];
        events.splice(index, 1);
        writeEvents(events);
        sendJson(res, 200, deleted);
        return;
      }
    }

    sendJson(res, 404, { error: 'Ruta no encontrada' });
  } catch (error) {
    sendJson(res, 500, { error: error.message || 'Error interno del servidor' });
  }
});

server.listen(port, () => {
  console.log(`Amplify backend listening on http://localhost:${port}`);
});
