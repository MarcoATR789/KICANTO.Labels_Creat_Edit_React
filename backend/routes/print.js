const express = require('express');
const net = require('net');

const router = express.Router();

const DEFAULT_PRINTER_HOST = process.env.PRINTER_HOST || '192.168.1.124';
const DEFAULT_PRINTER_PORT = Number(process.env.PRINTER_PORT || 9100);

router.post('/', (req, res) => {
  const { zpl, host, port } = req.body || {};

  if (!zpl || typeof zpl !== 'string') {
    return res.status(400).json({ message: 'Campo Etiqueta é obrigatório.' });
  }

  const targetHost = (host && typeof host === 'string' && host.trim())
    ? host.trim()
    : DEFAULT_PRINTER_HOST;
  const targetPort = Number(port || DEFAULT_PRINTER_PORT);

  if (!Number.isInteger(targetPort) || targetPort <= 0) {
    return res.status(400).json({ message: 'Porta inválida.' });
  }

  const socket = new net.Socket();
  let finished = false;

  const finish = (status, payload) => {
    if (finished) return;
    finished = true;
    try { socket.destroy(); } catch (e) {}
    return res.status(status).json(payload);
  };

  socket.setTimeout(5000, () => {
    finish(504, { message: 'Timeout ao conectar na impressora.' });
  });

  socket.on('error', (err) => {
    console.error('print error', err);
    finish(502, { message: 'Erro ao enviar para impressora.', error: err.message });
  });

  socket.connect(targetPort, targetHost, () => {
    socket.write(zpl, 'utf8', () => socket.end());
  });

  socket.on('close', (hadError) => {
    if (!finished && !hadError) {
      finish(200, { message: 'Etiqueta enviada para impressora.' });
    }
  });
});

module.exports = router;
