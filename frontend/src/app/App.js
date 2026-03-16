import { useEffect, useState } from 'react';
import { lersession, limparSession, salvarsession } from '../auth/session';
import abas from '../data/pages/index.js';
import './App.css';

const URL_BASE_API = process.env.REACT_APP_API_URL || '';

function App() {
  const [programaAtivo, setProgramaAtivo] = useState(null);
  const [session, setSession] = useState(() => lersession());
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [loginErro, setLoginErro] = useState('');
  const [carregandoLogin, setCarregandoLogin] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    const aoNaoAutorizado = () => {
      limparSession();
      setSession(null);
      setProgramaAtivo(null);
      setSenha('');
      setLoginErro('Sessão expirada. Faça login novamente.');
    };

    window.addEventListener('auth:nao-autorizado', aoNaoAutorizado);
    return () => {
      window.removeEventListener('auth:nao-autorizado', aoNaoAutorizado);
    };
  }, []);

  useEffect(() => {
    if (!loginErro) return undefined;

    const temporizadorMensagem = setTimeout(() => {
      setLoginErro('');
    }, 2000);

    return () => clearTimeout(temporizadorMensagem);
  }, [loginErro]);

  useEffect(() => {
    setMenuAberto(false);
  }, [session, programaAtivo]);

  const fazerLogin = async (evento) => {
    evento.preventDefault();
    const usuarioLimpo = usuario.trim();

    if (!usuarioLimpo || !senha) {
      setLoginErro('Preencha seu usuário e senha.');
      return;
    }

    setCarregandoLogin(true);
    setLoginErro('');

    try {
      const resposta = await fetch(`${URL_BASE_API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: usuarioLimpo, senha })
      });

      const dados = await resposta.json().catch(() => ({}));

      if (!resposta.ok) {
        setLoginErro(dados.message || 'Falha no login.');
        return;
      }

      const novasession = { token: dados.token, usuario: dados.usuario };
      salvarsession(novasession);
      setSession(novasession);
      setUsuario('');
      setSenha('');
    } catch (erro) {
      setLoginErro('Não foi possível conectar ao backend.');
    } finally {
      setCarregandoLogin(false);
    }
  };

  const fazerLogout = async () => {
    try {
      await fetch(`${URL_BASE_API}/api/auth/logout`, {
        method: 'POST'
      });
    } catch (erro) {
      // LOGOUT LIMPA SESSÃO MESMO COM FALHA NA API
    } finally {
      limparSession();
      setSession(null);
      setProgramaAtivo(null);
      setUsuario('');
      setSenha('');
      setLoginErro('');
    }
  };

  if (!session) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>Login - AGRICOM</h1>
          <p>Realize o login para continuar:</p>
          <div>
            <p>{process.env.REACT_APP_VERSION}</p>
          </div>
        </header>

        <main className="App-main">
          <section className="content-wrapper tabelas-section login-card">
            <h2 className="filtro-titulo">AUTENTICAÇÃO</h2>
            <form onSubmit={fazerLogin} className="filtro-etiquetas">
              <h3>DADOS DO USUÁRIO:</h3>

              <div className="filtro-row">
                <div className="filtro-combo">
                  <input
                  className="filtro-input"
                  type="text"
                  placeholder="Usuário"
                  value={usuario}
                  onChange={(event) => setUsuario(event.target.value)}
                  autoComplete="username"
                  />
                </div>
              </div>

              <div className="filtro-row">
                <div className="filtro-combo">
                  <input
                  className="filtro-input"
                  type="password"
                  placeholder="Senha"
                  value={senha}
                  onChange={(event) => setSenha(event.target.value)}
                  autoComplete="current-password"
                  />
                </div>
              </div>

              {loginErro ? <div className="alert alert-error">{loginErro}</div> : null}

              <div>
                <button
                  type="submit"
                  className="entrar"
                  disabled={carregandoLogin}>
                  ENTRAR
                </button>
              </div>
            </form>
          </section>
        </main>
      </div>
    );
  }

  if (programaAtivo) {
    const ComponenteAtivo = programaAtivo.componente;

    return (
      <div className="App">
        <header className="App-header">
          <h1>{programaAtivo.nome}</h1>
          <p>{programaAtivo.descricao}</p>
        </header>

        <main>
          <ComponenteAtivo onVoltar={() => setProgramaAtivo(null)} />
        </main>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-row">
          <h1>Lista de Programas - AGRICOM</h1>
          <div className="user-menu">
            <button
              className="user-button"
              onClick={() => setMenuAberto(!menuAberto)}
              >
              {session.usuario?.usuario ||'Usuário' } ▿
            </button>
            <span className="user-icon"></span>
            <div className="user-menu">
            {menuAberto && (
              <div className="dropdown-menu">

                <button
                  type="button"
                  className="dropdown-itens"
                  onClick={() => console.log("TROCAR SENHA")}>
                  TROCAR SENHA
                </button>

                <button
                  type="button"
                  className="dropdown-itens"
                  onClick={fazerLogout}>
                  SAIR
                </button>

              </div>
            )}
          </div>
          </div>
        </div>

        <div className="header-row">
          <p>Selecione um programa para continuar:</p>
        </div>
        <div>
          <p>{process.env.REACT_APP_VERSION}</p>
          </div>
      </header>

      <main className="programas-lista">
        {abas.map((aba) => (
          <div
            key={aba.id}
            className="programa-card"
            onClick={() => setProgramaAtivo(aba)}
          >
            <h2>{aba.nome}</h2>
            <p>{aba.descricao}</p>
          </div>
        ))}
      </main>
    </div>
  );
}

export default App;
