const { obtersession } = require('../auth/session-store');
const { obterTokenDarequest } = require('../auth/token');

function exigirAuth(req, res, next) {
  const token = obterTokenDarequest(req);
  const session = obtersession(token);

  if (!session) {
    return res.status(401).json({ message: 'Nao autorizado. Faca login.' });
  }

  req.auth = {
    token,
    usuario: session.usuario
  };

  return next();
}

module.exports = exigirAuth;
