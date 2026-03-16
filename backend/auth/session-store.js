const crypto = require('crypto');

const TEMPO_session_MS = Number(process.env.AUTH_SESSION_TTL_MS || 8 * 60 * 60 * 1000);
const sessoes = new Map();

function limparSessoesExpiradas() {
  const agora = Date.now();
  for (const [token, session] of sessoes.entries()) {
    if (session.expiraEm <= agora) {
      sessoes.delete(token);
    }
  }
}

function criarsession(usuario) {
  limparSessoesExpiradas();
  const token = crypto.randomBytes(32).toString('hex');

  sessoes.set(token, {
    usuario,
    expiraEm: Date.now() + TEMPO_session_MS
  });

  return token;
}

function obtersession(token) {
  if (!token) {
    return null;
  }

  const session = sessoes.get(token);
  if (!session) {
    return null;
  }

  if (session.expiraEm <= Date.now()) {
    sessoes.delete(token);
    return null;
  }

  session.expiraEm = Date.now() + TEMPO_session_MS;
  return session;
}

function removersession(token) {
  if (!token) {
    return;
  }
  sessoes.delete(token);
}

module.exports = {
  criarsession,
  obtersession,
  removersession
};
