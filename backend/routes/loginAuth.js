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
    return res.status(400).json({ message: 'Usuario e senha são obrigatórios.' });
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
  return res.json({ message: 'Sessão encerrada.' });
});

router.get('/me', exigirAuth, (req, res) => {
  return res.json({ usuario: req.auth.usuario });
});

router.post('/trocar-senha', exigirAuth, async (req, res) => {
  const novaSenha = typeof req.body?.novaSenha === 'string' ? req.body.novaSenha : '';
  const confirmarNovaSenha = typeof req.body?.confirmarNovaSenha === 'string' ? req.body.confirmarNovaSenha : '';
  const usuarioId = req.auth?.usuario?.id;

  if (!novaSenha || !confirmarNovaSenha) {
    return res.status(400).json({ message: 'Nova senha e confirmação são obrigatorias.' });
  }

  if (novaSenha !== confirmarNovaSenha) {
    return res.status(400).json({ message: 'As senhas informadas não coincidem.' });
  }

  if (!usuarioId) {
    return res.status(401).json({ message: 'Não autorizado. Faça login.' });
  }

  try {
    const [resultado] = await db.query(
      'UPDATE usuarios SET senha = ? WHERE id = ? LIMIT 1',
      [novaSenha, usuarioId]
    );

    if (!resultado?.affectedRows) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    return res.json({ message: 'Senha alterada com sucesso.' });
  } catch (err) {
    console.error('Erro ao trocar senha', err);
    return res.status(500).json({ message: 'Erro ao alterar senha.' });
  }
});

module.exports = router;
