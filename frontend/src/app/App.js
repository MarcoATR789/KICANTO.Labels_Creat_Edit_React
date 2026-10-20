import { useEffect, useState } from 'react';
import { instalarFetch } from '../auth/apiFetch';
import { lersession, limparSession, salvarsession } from '../auth/session';
import API_BASE_URL from '../config/apiBase';
import abas from '../data/pages/index.js';
import './App.css';

instalarFetch();

function App() {
  const [programaAtivo, setProgramaAtivo] = useState(null);
  const [session, setSession] = useState(() => lersession());
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [loginErro, setLoginErro] = useState('');
  const [loginSucesso, setLoginSucesso] = useState('');
  const [carregandoLogin, setCarregandoLogin] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [mostrarTrocaSenha, setMostrarTrocaSenha] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');
  const [trocandoSenha, setTrocandoSenha] = useState(false);

  useEffect(() => {
    const aoNaoAutorizado = () => {
      limparSession();
      setSession(null);
      setProgramaAtivo(null);
      setSenha('');
      setNovaSenha('');
      setConfirmarNovaSenha('');
      setMostrarTrocaSenha(false);
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
    if (!loginSucesso) return undefined;

    const temporizadorMensagem = setTimeout(() => {
      setLoginSucesso('');
    }, 2000);

    return () => clearTimeout(temporizadorMensagem);
  }, [loginSucesso]);

  useEffect(() => {
    setMenuAberto(false);
  }, [session, programaAtivo]);

  const fecharModalTrocaSenha = () => {
    if (trocandoSenha) return;

    setMostrarTrocaSenha(false);
    setNovaSenha('');
    setConfirmarNovaSenha('');
  };

  const abrirModalTrocaSenha = () => {
    setMenuAberto(false);
    setLoginErro('');
    setLoginSucesso('');
    setNovaSenha('');
    setConfirmarNovaSenha('');
    setMostrarTrocaSenha(true);
  };

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
      const resposta = await fetch(`${API_BASE_URL}/api/auth/login`, {
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
      setLoginSucesso('Bem vindo!');
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
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST'
      });
    } catch (erro) {

    } finally {
      limparSession();
      setSession(null);
      setProgramaAtivo(null);
      setUsuario('');
      setSenha('');
      setLoginErro('');
      setLoginSucesso('');
      setNovaSenha('');
      setConfirmarNovaSenha('');
      setMostrarTrocaSenha(false);
    }
  };

  const trocarSenha = async (evento) => {
    evento.preventDefault();

    if (!novaSenha || !confirmarNovaSenha) {
      setLoginErro('Preencha os dois campos da nova senha.');
      return;
    }

    if (novaSenha !== confirmarNovaSenha) {
      setLoginErro('As senhas informadas precisam ser iguais.');
      return;
    }

    setTrocandoSenha(true);
    setLoginErro('');
    setLoginSucesso('');

    try {
      const resposta = await fetch(`${API_BASE_URL}/api/auth/trocar-senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novaSenha, confirmarNovaSenha })
      });

      const dados = await resposta.json().catch(() => ({}));

      if (!resposta.ok) {
        setLoginErro(dados.message || 'Não foi possível trocar a senha.');
        return;
      }

      setLoginSucesso('Senha alterada com sucesso.');
      setMostrarTrocaSenha(false);
      setNovaSenha('');
      setConfirmarNovaSenha('');
    } catch (erro) {
      setLoginErro('Não foi possível conectar ao backend.');
    } finally {
      setTrocandoSenha(false);
    }
  };

  if (!session) {
    return (
      <div className="App">
        {loginSucesso ? <div className="alert alert-success">{loginSucesso}</div> : null}
        <header className="App-header">
          <h1>Login - KICANTO</h1>
          <p>Realize o login para continuar:</p>
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
                  autoComplete="login-username"
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
                  autoComplete="login-password"
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
        {loginSucesso ? <div className="alert alert-success">{loginSucesso}</div> : null}
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
      {loginSucesso ? <div className="alert alert-success">{loginSucesso}</div> : null}
      {loginErro ? <div className="alert alert-error">{loginErro}</div> : null}
      <header className="App-header">
        <div className="header-row">
          <h1>Lista de Programas - KICANTO</h1>
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
                  onClick={abrirModalTrocaSenha}>
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

      {mostrarTrocaSenha && (
        <div className="troca-senha-backdrop">
          <form className="troca-senha-modal" onSubmit={trocarSenha}>
            <h3>TROCAR SENHA</h3>
            <p>Digite a nova senha e repita para confirmar.</p>

            <div className="troca-senha-campos">
              <input
                className="troca-senha-input"
                type="password"
                placeholder="Nova senha"
                value={novaSenha}
                onChange={(event) => setNovaSenha(event.target.value)}
                autoComplete="new-password"
                disabled={trocandoSenha}
              />

              <input
                className="troca-senha-input"
                type="password"
                placeholder="Confirmar nova senha"
                value={confirmarNovaSenha}
                onChange={(event) => setConfirmarNovaSenha(event.target.value)}
                autoComplete="new-password"
                disabled={trocandoSenha}
              />
            </div>

            <div className="troca-senha-acoes">
              <button
                type="button"
                className="troca-senha-cancelar"
                onClick={fecharModalTrocaSenha}
                disabled={trocandoSenha}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="troca-senha-confirmar"
                disabled={trocandoSenha}
              >
                {trocandoSenha ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;
