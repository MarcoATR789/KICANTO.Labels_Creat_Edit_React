const CHAVE_ARMAZENAMENTO = 'kicanto_auth_session_v1';

function normalizarsession(sessionBruta) {
  if (!sessionBruta || typeof sessionBruta !== 'object') {
    return null;
  }

  const token = typeof sessionBruta.token === 'string' ? sessionBruta.token : '';
  const usuario = sessionBruta.usuario && typeof sessionBruta.usuario === 'object'
    ? sessionBruta.usuario
    : null;

  if (!token || !usuario) {
    return null;
  }

  return { token, usuario };
}

export function lersession() {
  try {
    const valorBruto = window.localStorage.getItem(CHAVE_ARMAZENAMENTO);
    if (!valorBruto) {
      return null;
    }
    const valorConvertido = JSON.parse(valorBruto);
    return normalizarsession(valorConvertido);
  } catch (erro) {
    return null;
  }
}

export function salvarsession(session) {
  const sessionNormalizada = normalizarsession(session);
  if (!sessionNormalizada) {
    return;
  }

  window.localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(sessionNormalizada));
}

export function limparSession() {
  window.localStorage.removeItem(CHAVE_ARMAZENAMENTO);
}

export function obterTokenAuth() {
  return lersession()?.token || '';
}
