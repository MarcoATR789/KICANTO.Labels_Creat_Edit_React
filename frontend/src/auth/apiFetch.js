import { limparSession, obterTokenAuth } from './session';

function obterUrlrequest(entrada) {
  if (typeof entrada === 'string') {
    return entrada;
  }
  if (entrada instanceof URL) {
    return entrada.toString();
  }
  if (entrada && typeof entrada.url === 'string') {
    return entrada.url;
  }
  return '';
}

function requestApi(entrada) {
  const urlrequest = obterUrlrequest(entrada);
  if (!urlrequest) {
    return false;
  }

  try {
    const url = new URL(urlrequest, window.location.origin);
    return url.pathname.startsWith('/api/');
  } catch (erro) {
    return false;
  }
}

function ehrequestLogin(entrada) {
  const urlrequest = obterUrlrequest(entrada);

  try {
    const url = new URL(urlrequest, window.location.origin);
    return url.pathname === '/api/auth/login';
  } catch (erro) {
    return false;
  }
}

export function instalarFetch() {
  if (typeof window === 'undefined' || window.AuthBuscaInstall) {
    return;
  }

  const fetchNativo = window.fetch.bind(window);

  window.fetch = async (entrada, start = undefined) => {
    const AnexarAuth = requestApi(entrada);
    const proximoStart = start ? { ...start } : {};

    if (AnexarAuth) {
      const cabecalhos = new Headers(proximoStart.headers || {});
      const token = obterTokenAuth();
      if (token) {
        cabecalhos.set('Authorization', `Bearer ${token}`);
      }
      proximoStart.headers = cabecalhos;
    }

    const resposta = await fetchNativo(entrada, proximoStart);

    if (
      AnexarAuth &&
      resposta.status === 401 &&
      !ehrequestLogin(entrada)
    ) {
      limparSession();
      window.dispatchEvent(new CustomEvent('auth:não-autorizado'));
    }

    return resposta;
  };

  window.AuthBuscaInstall = true;
}
