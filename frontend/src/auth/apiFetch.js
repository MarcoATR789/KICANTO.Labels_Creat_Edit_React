import { limparSession, obterTokenAutenticacao } from './session';

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

function ehrequestApi(entrada) {
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
  if (typeof window === 'undefined' || window.__kicantoBuscaAutenticadaInstalada) {
    return;
  }

  const fetchNativo = window.fetch.bind(window);

  window.fetch = async (entrada, inicializacao = undefined) => {
    const deveAnexarAutenticacao = ehrequestApi(entrada);
    const proximaInicializacao = inicializacao ? { ...inicializacao } : {};

    if (deveAnexarAutenticacao) {
      const cabecalhos = new Headers(proximaInicializacao.headers || {});
      const token = obterTokenAutenticacao();
      if (token) {
        cabecalhos.set('Authorization', `Bearer ${token}`);
      }
      proximaInicializacao.headers = cabecalhos;
    }

    const resposta = await fetchNativo(entrada, proximaInicializacao);

    if (
      deveAnexarAutenticacao &&
      resposta.status === 401 &&
      !ehrequestLogin(entrada)
    ) {
      limparSession();
      window.dispatchEvent(new CustomEvent('auth:nao-autorizado'));
    }

    return resposta;
  };

  window.__kicantoBuscaAutenticadaInstalada = true;
}
