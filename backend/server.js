const express = require('express');
const cors = require('cors');
const rotasEtiquetas = require('./routes/etiquetas');
const rotasPrint = require('./routes/print');
const rotasAuth = require('./routes/loginAuth');
const exigirAuth = require('./middleware/auth');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', rotasAuth);
app.use('/api/etiquetas', exigirAuth, rotasEtiquetas);
app.use('/api/print', exigirAuth, rotasPrint);

const PORT1 = Number(process.env.PORT || 3001);
app.listen(PORT1, '0.0.0.0', () => {
  console.log(`Backend rodando em: http://192.168.1.127:${PORT1}`);
    console.log(`Frontend rodando em: http://192.168.1.127:3000`);
});