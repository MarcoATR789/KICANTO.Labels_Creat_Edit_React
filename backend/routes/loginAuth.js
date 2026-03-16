const express = require('express');
const db = require('../db');
const exigirAuth = require('../middleware/auth');
const { criarsession, removersession } = require('../auth/session-store');
const { obterTokenDarequest } = require('../auth/token');

const router = express.Router();

router.post('/login', async (req, res) => {
  const usuario = typeof req.body?.usuario === 'string' ? req.body.usuario.trim() : '';
  const senha = typeof req.body?.senha === 'string' ? req.body.senha : '';

  if (!usuario || !senha) {
    return res.status(400).json({ message: 'Usuario e senha sao obrigatorios.' });
  }

  try {
    const [linhas] = await db.query(
      'SELECT id, usuario FROM usuarios WHERE usuario = ? AND senha = ? LIMIT 1',
      [usuario, senha]
    );

    if (linhas.length === 0) {
      return res.status(401).json({ message: 'Usuario ou senha invalidos.' });
    }

    const usuarioAutenticado = {
      id: linhas[0].id,
      usuario: linhas[0].usuario
    };

    const token = criarsession(usuarioAutenticado);
    return res.json({ token, usuario: usuarioAutenticado });
  } catch (err) {
    console.error('Erro no login', err);
    return res.status(500).json({ message: 'Erro ao validar login.' });
  }
});

router.post('/logout', (req, res) => {
  const token = obterTokenDarequest(req);
  removersession(token);
  return res.json({ message: 'Sessao encerrada.' });
});

router.get('/me', exigirAuth, (req, res) => {
  return res.json({ usuario: req.auth.usuario });
});

module.exports = router;
