// IMPORTA OS HOOKS NECESSÁRIOS DO REACT E OUTROS MÓDULOS.
import { useState, useEffect, useCallback, useMemo } from 'react';
import API_BASE_URL from '../../../config/apiBase';
import '../../css/pages.css';
import FiltroEtiquetaSelect from '../filtro_etiqueta_select.js';
import baseTemplate from '../../zpl/base_materia_prima.zpl';

// DEFINE A URL BASE DA API, USANDO UMA VARIÁVEL DE AMBIENTE OU UM VALOR PADRÃO.
const TITULO_FIXO = 'MATÉRIA PRIMA';

// MAPEIA OS NOMES INTERNOS DAS VARIÁVEIS PARA NOMES AMIGÁVEIS EXIBIDOS NA INTERFACE.
const LABEL_NAMES = {
  'VARIAVEL_ID_1': 'NOME:',
  'VARIAVEL_DATA': 'DATA DE FABRICAÇÃO:',
  'PRAZO_VALIDADE': 'PRAZO DE VALIDADE:',
};

const CAMPOS_OBRIGATORIOS = [
  'VARIAVEL_ID_1',
];

// CONFIGURAÇÕES PARA A API DO LABELARY, USADA PARA GERAR A PRÉ-VISUALIZAÇÃO DA ETIQUETA.
const LABELARY_API_CONFIG = {
  DPI: '8dpmm',
  LARGURA: '4.09',
  ALTURA: '2.5',
  INDICE: '0',
};

// CONSTRÓI A URL DA API DO LABELARY PARA OBTER A IMAGEM DE PRÉ-VISUALIZAÇÃO.
const obterUrlLabelary = (zplCodificado) => {
  const { DPI, LARGURA, ALTURA, INDICE } = LABELARY_API_CONFIG;
  return `https://api.labelary.com/v1/printers/${DPI}/labels/${LARGURA}x${ALTURA}/${INDICE}/${zplCodificado}`;
};

// FUNÇÃO PARA CALCULAR O DIA DO ANO PARA UMA DATA DADA.
const obterDiaDoAno = (data) => {
  const inicio = new Date(data.getFullYear(), 0, 0);
  const diferenca = data - inicio;
  const umDia = 1000 * 60 * 60 * 24;
  return Math.floor(diferenca / umDia);
};

const obterDataFabricacaoDaLista = (listaEtiquetas) => {
  const valorDataFabricacao = listaEtiquetas.find(etiqueta => etiqueta.id === 'VARIAVEL_DATA')?.valor;
  if (typeof valorDataFabricacao === 'string') {
    const [dia, mes, ano] = valorDataFabricacao.split('/').map(parte => parte.trim());
    if (dia && mes && ano) {
      const data = new Date(Number(ano), Number(mes) - 1, Number(dia));
      if (!Number.isNaN(data.getTime())) return data;
    }
  }

  return new Date();
};

// FUNÇÃO GENÉRICA PARA OBTER UM CAMPO (ex: VARIAVEL_TITULO, VARIAVEL_PESO) A PARTIR DOS DADOS SALVOS.
const obterCampoDaEtiqueta = (item, campoId) => {
  try {
    const dados = typeof item.dados === 'string' ? JSON.parse(item.dados) : item.dados;
    return dados.find(e => e.id === campoId)?.valor || '';
  } catch {
    return '';
  }
};

// FUNÇÃO PARA COMPLETAR NOME COM MATÉRIA PRIMA
const obterTituloDaEtiqueta = (item) => {
  const titulo = obterCampoDaEtiqueta(item, 'VARIAVEL_TITULO');
  return titulo || TITULO_FIXO;
};

const normalizarTexto = (texto) => String(texto ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

// COMPONENTE QUE RENDERIZA O FORMULÁRIO COM OS CAMPOS DE ENTRADA PARA AS VARIÁVEIS.
const FormularioEtiqueta = ({ etiquetas, MudarEtiqueta }) => (
  <div className="wrapper-tabela-variaveis">
    <table className="tabela-variaveis">
      <thead>
        <tr>
          <th>VARIÁVEL:</th>
          <th>VALOR / DESCRIÇÃO:</th>
        </tr>
      </thead>
      <tbody className="label-nomes">
        {etiquetas
          .filter(etiqueta => !['VARIAVEL_TITULO', 'VARIAVEL_ID_2', 'VARIAVEL_DATA', 'PRAZO_VALIDADE', 'VARIAVEL_VALIDADE', 'VARIAVEL_LOTE', 'VARIAVEL_BARRAS'].includes(etiqueta.id))
          .map(etiqueta => (
            <tr key={etiqueta.id}>
              <td>{LABEL_NAMES[etiqueta.id] || etiqueta.nome}</td>
              <td>
                <input
                  type="text"
                  value={etiqueta.valor}
                  onChange={(e) => MudarEtiqueta(etiqueta.id, e.target.value)}
                  placeholder="Digite o nome da matéria prima."
                />
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  </div>
);

// COMPONENTE QUE EXIBE A IMAGEM DE PRÉ-VISUALIZAÇÃO DA ETIQUETA.
const ImagemPreview = ({ src }) => (
  src && <img src={src} className="label-preview" alt="Pré-visualização da etiqueta" />
);

// COMPONENTE QUE RENDERIZA OS BOTÕES DE AÇÃO (SALVAR, LIMPAR, CANCELAR).
const BtnAction = ({
  filtro,
  onFiltroChange,
  etiquetaSelecionadaId,
  onSelecionarEtiqueta,
  etiquetasAgrupadas,
  onExcluirSelecionada,
  onVoltar,
  onSalvar,
  formularioValido,
  etiquetaEmEdicao,
  limparDados,
  cancelarTudo
}) => (
  <>
    <div className="etiquetas-salvas">
      <div className="button-group btn-fechar">
        <button type="button" className="btn-cancelar" onClick={onVoltar}>
          VOLTAR
        </button>
      </div>

      <div className="filtro-etiquetas">
        <div className="filtro-titulo">FILTRAR NOME</div>
        <div className="filtro-row">
          <div className="filtro-combo">
            <input
              className="filtro-input"
              placeholder="Pesquisar"
              value={filtro}
              onChange={onFiltroChange}
            />
            <FiltroEtiquetaSelect
              value={etiquetaSelecionadaId}
              onChange={onSelecionarEtiqueta}
              grupos={etiquetasAgrupadas}
            />
          </div>
        </div>
      </div>
    </div>

    <div className="button-group">
      <button
        className="btn-salvar"
        onClick={onSalvar}
        disabled={!formularioValido}
      >
        {etiquetaEmEdicao ? 'EDITAR ETIQUETA' : 'SALVAR ETIQUETA'}
      </button>

      <button className="btn-limpar" onClick={limparDados}>
        LIMPAR DADOS
      </button>
      
      <button className="btn-cancelar" onClick={cancelarTudo}>
        CANCELAR
      </button>

      {etiquetaSelecionadaId && (
        <button className="btn-excluir" onClick={onExcluirSelecionada}>
          Excluir
        </button>
      )}
    </div>
  </>
);

function EditarMateriaPrima({ onVoltar }) {
  // ESTADOS DO COMPONENTE
  const [etiquetas, setEtiquetas] = useState([]);
  const [conteudoArquivo, setConteudoArquivo] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [imagemPreview, setImagemPreview] = useState('');
  const [etiquetasSalvas, setEtiquetasSalvas] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [carregandoLista, setCarregandoLista] = useState(false);
  const [etiquetaEmEdicao, setEtiquetaEmEdicao] = useState(null);
  const [etiquetaSelecionadaId, setEtiquetaSelecionadaId] = useState('');
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const [etiquetaParaExcluir, setEtiquetaParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    if (!erro) return undefined;

    const temporizadorMensagem = setTimeout(() => setErro(''), 2000);
    return () => clearTimeout(temporizadorMensagem);
  }, [erro]);

  useEffect(() => {
    if (!sucesso) return undefined;

    const temporizadorMensagem = setTimeout(() => setSucesso(''), 2000);
    return () => clearTimeout(temporizadorMensagem);
  }, [sucesso]);

  const etiquetaSelecionada = useMemo(() => {
    if (!etiquetaParaExcluir) return null;

    return etiquetasSalvas.find(e => String(e.id) === String(etiquetaParaExcluir)) || null;
  }, [etiquetasSalvas, etiquetaParaExcluir]);

  const formularioValido = useMemo(() => {
    return CAMPOS_OBRIGATORIOS.every(id => {
      const campo = etiquetas.find(e => e.id === id);

      if (!campo) return false;

      return campo.valor && campo.valor.toString().trim() !== '';
    });
  }, [etiquetas]);

  const nomeEtiqueta = useMemo(() => {
    const campoNome = etiquetas.find(e => e.id === 'VARIAVEL_ID_1');
    return campoNome?.valor?.toString().trim() || '';
  }, [etiquetas]);

  // FUNÇÃO PARA EXTRAIR AS VARIÁVEIS (EX: {VARIAVEL_TITULO}) DO CONTEÚDO DO ARQUIVO ZPL.
  const extrairVariaveis = useCallback((conteudo) => {
    const regex = /\{(\w+)\}/g;
    const correspondencias = [...new Set([...conteudo.matchAll(regex)].map(m => m[1]))];
    return correspondencias.map(nome => ({ id: nome, nome, valor: '' }));
  }, []);

  const salvarEtiqueta = async () => {
    setErro('');
    setSucesso('');

    // NÃO SALVA VARIAVEL_LOTE
    const etiquetasParaSalvar = etiquetas
      .filter(e => !['VARIAVEL_ID_2', 'VARIAVEL_DATA', 'PRAZO_VALIDADE'].includes(e.id))
      .map(e => (
        e.id === 'VARIAVEL_TITULO'
          ? { ...e, valor: TITULO_FIXO }
          : e
      ));

    const url = etiquetaEmEdicao
      ? `${API_BASE_URL}/api/etiquetas/${etiquetaEmEdicao}`
      : `${API_BASE_URL}/api/etiquetas`;

    const method = etiquetaEmEdicao ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nomeEtiqueta,
          etiquetas: etiquetasParaSalvar,
        }),
      });

      if (res.status === 409) {
        setErro('Já existe uma etiqueta com esse NOME.');
        setTimeout(() => setErro(''), 2000);
        return;
      }

      if (!res.ok) {
        setErro('Erro ao salvar/editar etiqueta.');
        setTimeout(() => setErro(''), 2000);
        return;
      }

      setSucesso(etiquetaEmEdicao ? 'Etiqueta editada!' : 'Etiqueta salva!');
      setTimeout(() => setSucesso(''), 2000);
      setEtiquetaEmEdicao(null);
      listarEtiquetas();
      resetarParaEstadoInicial();
    } catch (err) {
      setErro('Erro ao salvar/editar etiqueta.');
      setTimeout(() => setErro(''), 2000);
    }
  };

  // FUNÇÃO PARA RESETAR O FORMULÁRIO PARA O ESTADO INICIAL.
  const resetarParaEstadoInicial = useCallback(() => {
    if (!conteudoArquivo) return;

    const etiquetasBase = [
      {
        id: 'VARIAVEL_TITULO',
        nome: 'VARIAVEL_TITULO',
        valor: TITULO_FIXO
      },
      ...extrairVariaveis(conteudoArquivo)
        .filter(e => !['VARIAVEL_TITULO'].includes(e.id))
        .map(etiqueta => {
          if (etiqueta.id === 'VARIAVEL_DATA') {
            return { ...etiqueta, valor: new Date().toLocaleDateString('pt-BR') };
          }
          return { ...etiqueta, valor: '' };
        }),
      { id: 'PRAZO_VALIDADE', nome: 'PRAZO_VALIDADE', valor: '' },
      { id: 'VARIAVEL_LOTE', nome: 'VARIAVEL_LOTE', valor: '' },
      { id: 'VARIAVEL_BARRAS', nome: 'VARIAVEL_BARRAS', valor: '' },
    ];

    setEtiquetas(etiquetasBase);

    // VOLTA O SELECT PARA "Selecionar uma etiqueta"
    setEtiquetaSelecionadaId('');

    // LIMPA ESTADOS DE EDIÇÃO/EXCLUSÃO
    setEtiquetaEmEdicao(null);
    setEtiquetaParaExcluir(null);
    setMostrarConfirmacao(false);

    setImagemPreview('');
    setErro('');
    setSucesso('');
  }, [conteudoArquivo, extrairVariaveis]);

  const selecionarEtiqueta = useCallback((idSelecionado) => {
    setEtiquetaSelecionadaId(idSelecionado);

    if (!idSelecionado) {
      resetarParaEstadoInicial();
      return;
    }

    const selecionada = etiquetasSalvas.find(e => String(e.id) === String(idSelecionado));
    if (!selecionada) return;

    try {
      const dados = typeof selecionada.dados === 'string'
        ? JSON.parse(selecionada.dados)
        : selecionada.dados;

      setEtiquetas(prev => prev.map(etiqueta => {
        if (etiqueta.id === 'VARIAVEL_TITULO') {
          return { ...etiqueta, valor: TITULO_FIXO };
        }
        if (etiqueta.id === 'VARIAVEL_ID_2') {
          return { ...etiqueta, valor: '' };
        }

        const campoSalvo = dados.find(d => d.id === etiqueta.id);
        return campoSalvo ? { ...etiqueta, valor: campoSalvo.valor ?? '' } : etiqueta;
      }));

      setEtiquetaEmEdicao(selecionada.id);
      setMostrarConfirmacao(false);
      setEtiquetaParaExcluir(null);
    } catch (err) {
      setErro('Erro ao carregar etiqueta selecionada.');
      setTimeout(() => setErro(''), 2000);
    }
  }, [etiquetasSalvas, resetarParaEstadoInicial]);

  // LISTAR ETIQUETA NO FORMULARIO
  const listarEtiquetas = async () => {
    try {
      setCarregandoLista(true);
      const res = await fetch(`${API_BASE_URL}/api/etiquetas`);
      const data = await res.json();
      setEtiquetasSalvas(data);
    } catch (err) {
      setErro('Erro ao carregar etiquetas salvas');
    } finally {
      setCarregandoLista(false);
    }
  };

  useEffect(() => {
    listarEtiquetas();
  }, []);

  // EXCLUIR ETIQUETA DO BANCO DE DADOS
  const excluirEtiqueta = async () => {
    if (!etiquetaParaExcluir) return;

    try {
      setExcluindo(true);

      const res = await fetch(
        `${API_BASE_URL}/api/etiquetas/${etiquetaParaExcluir}`,
        { method: 'DELETE' }
      );

      if (!res.ok) {
        throw new Error('Erro ao excluir etiqueta');
      }

      setSucesso('Etiqueta excluída com sucesso!');
      setTimeout(() => setSucesso(''), 2000);

      setEtiquetaSelecionadaId('');
      setEtiquetaEmEdicao(null);
      resetarParaEstadoInicial();
      listarEtiquetas();
    } catch (err) {
      setErro('Erro ao excluir etiqueta.');
      setTimeout(() => setErro(''), 2000);
    } finally {
      setExcluindo(false);
      setMostrarConfirmacao(false);
      setEtiquetaParaExcluir(null);
    }
  };

  // EFEITO PARA CARREGAR O ARQUIVO DE TEMPLATE ZPL NA INICIALIZAÇÃO DO COMPONENTE.
  useEffect(() => {
    const carregarArquivoBase = async () => {
      try {
        const resposta = await fetch(baseTemplate);
        const conteudo = await resposta.text();
        setConteudoArquivo(conteudo);

        const etiquetasExtraidas = extrairVariaveis(conteudo);

        setEtiquetas([
          {
            id: 'VARIAVEL_TITULO',
            nome: 'VARIAVEL_TITULO',
            valor: TITULO_FIXO
          },
          ...etiquetasExtraidas
            .filter(e => !['VARIAVEL_TITULO'].includes(e.id))
            .map(etiqueta => {
              if (etiqueta.id === 'VARIAVEL_DATA') {
                return { ...etiqueta, valor: new Date().toLocaleDateString('pt-BR') };
              }
              return etiqueta;
            }),
          { id: 'PRAZO_VALIDADE', nome: 'PRAZO_VALIDADE', valor: '' },
          { id: 'VARIAVEL_LOTE', nome: 'VARIAVEL_LOTE', valor: '' },
          { id: 'VARIAVEL_BARRAS', nome: 'VARIAVEL_BARRAS', valor: '' }
        ]);
      } catch (erro_) {
        setErro('ERRO AO CARREGAR O ARQUIVO DE TEMPLATE.');
        console.error(erro_);
      }
    };

    carregarArquivoBase();
  }, [extrairVariaveis]);

  // FUNÇÃO MEMORIZADA PARA PROCESSAR O CONTEÚDO, SUBSTITUINDO AS VARIÁVEIS PELOS VALORES DO USUÁRIO.
  const obterConteudoProcessado = useCallback(() => {
    return etiquetas.reduce((acc, etiqueta) =>
      acc.replaceAll(`{${etiqueta.nome}}`, etiqueta.valor),
      conteudoArquivo
    );
  }, [etiquetas, conteudoArquivo]);

  // EFEITO PARA ATUALIZAR A PRÉ-VISUALIZAÇÃO DA ETIQUETA QUANDO OS DADOS MUDAM.
  useEffect(() => {
    const temporizadorDebounce = setTimeout(() => {
      const conteudo = obterConteudoProcessado();
      if (conteudo) {
        const zplCodificado = encodeURIComponent(conteudo);
        setImagemPreview(obterUrlLabelary(zplCodificado));
      }
    }, 300);

    return () => clearTimeout(temporizadorDebounce);
  }, [obterConteudoProcessado]);

  // FUNÇÃO PARA LIDAR COM A MUDANÇA NOS CAMPOS DE INPUT.
  const aoMudarCampo = useCallback((id, valor) => {
    let valorProcessado = valor;
    switch (id) {
      case 'VARIAVEL_TITULO':
        valorProcessado = TITULO_FIXO;
        break;

      case 'VARIAVEL_INDICADO':
        valorProcessado = String(valor).replace(/[0-9]/g, '').slice(0, 17);
        break;

      case 'VARIAVEL_ID_1':
        valorProcessado = String(valor).replace(/./g, caractere => caractere.toUpperCase());
        break;

      case 'PRAZO_VALIDADE':
        if (valor === '') {
          valorProcessado = '';
        } else {
          const dias = parseInt(valor, 10);
          if (isNaN(dias) || dias < 1 || dias > 999) return;
          valorProcessado = String(valor);
          setEtiquetas(prev => {
            const dataFabricacaoBase = obterDataFabricacaoDaLista(prev);
            const dataFabricacao = dataFabricacaoBase.toLocaleDateString('pt-BR');
            const dataValidadeBase = new Date(dataFabricacaoBase.getTime() + dias * 24 * 60 * 60 * 1000);
            const dataValidade = dataValidadeBase.toLocaleDateString('pt-BR');
            const ano = dataFabricacaoBase.getFullYear().toString().slice(-2);
            const diaDoAno = obterDiaDoAno(dataFabricacaoBase).toString().padStart(3, '0');
            const lote = `${ano}.${diaDoAno}`;

            return prev.map(etiqueta => {
              if (etiqueta.id === 'VARIAVEL_DATA') return { ...etiqueta, valor: dataFabricacao };
              if (etiqueta.id === 'VARIAVEL_VALIDADE') return { ...etiqueta, valor: dataValidade };
              if (etiqueta.id === 'VARIAVEL_LOTE') return { ...etiqueta, valor: lote };
              if (etiqueta.id === id) return { ...etiqueta, valor: valorProcessado };
              return etiqueta;
            });
          });
          return;
        }
        break;
      default:
        break;
    }
    setEtiquetas(prev => prev.map(etiqueta =>
      etiqueta.id === id ? { ...etiqueta, valor: valorProcessado } : etiqueta
    ));
  }, []);

  // FUNÇÃO PARA LIMPAR TODOS OS CAMPOS DO FORMULÁRIO E RESETAR O NOME DO ARQUIVO.
  const limparDados = () => {
    setEtiquetas(prev => prev.map(etiqueta => {
      if (etiqueta.id === 'VARIAVEL_DATA') {
        return { ...etiqueta, valor: new Date().toLocaleDateString('pt-BR') };
      }

      if (etiqueta.id === 'VARIAVEL_TITULO') {
        return { ...etiqueta, valor: TITULO_FIXO };
      }

      return { ...etiqueta, valor: '' };
    }));
  };

  const etiquetasFiltradas = useMemo(() => {
    const termo = normalizarTexto(filtro).trim();
    const tituloFixoNormalizado = normalizarTexto(TITULO_FIXO);

    const apenasMateriaPrima = etiquetasSalvas.filter(item => {
      const tituloBruto = obterCampoDaEtiqueta(item, 'VARIAVEL_TITULO');
      const titulo = normalizarTexto(tituloBruto);
      return titulo === tituloFixoNormalizado;
    });

    if (!termo) return apenasMateriaPrima;

    return apenasMateriaPrima.filter(item => {
      const titulo = normalizarTexto(obterCampoDaEtiqueta(item, 'VARIAVEL_TITULO'));
      const nome = normalizarTexto(item?.nome);
      return titulo.includes(termo) || nome.includes(termo);
    });
  }, [filtro, etiquetasSalvas]);

  // AGRUPA AS ETIQUETAS
  const etiquetasAgrupadas = useMemo(() => {
    const grupos = {};
    etiquetasFiltradas.forEach(item => {
      const titulo = obterTituloDaEtiqueta(item) || TITULO_FIXO;
      if (!grupos[titulo]) grupos[titulo] = [];
      grupos[titulo].push(item);
    });
    return grupos;
  }, [etiquetasFiltradas]);

  // RENDERIZAÇÃO DO COMPONENTE.
  return (
    <div className="App">
      <main className="App-main">
        <div className="content-wrapper">
          {erro && <div className="alert alert-error">{erro}</div>}
          {sucesso && <div className="alert alert-success">{sucesso}</div>}

          {etiquetas.length > 0 ? (
            <>
              <BtnAction
                filtro={filtro}
                onFiltroChange={(e) => setFiltro(e.target.value)}
                carregandoLista={carregandoLista}
                etiquetaSelecionadaId={etiquetaSelecionadaId}
                onSelecionarEtiqueta={selecionarEtiqueta}
                etiquetasAgrupadas={etiquetasAgrupadas}
                onExcluirSelecionada={() => {
                  setEtiquetaParaExcluir(etiquetaSelecionadaId);
                  setMostrarConfirmacao(true);
                }}
                onVoltar={onVoltar}
                onSalvar={salvarEtiqueta}
                formularioValido={formularioValido}
                etiquetaEmEdicao={etiquetaEmEdicao}
                limparDados={limparDados}
                cancelarTudo={resetarParaEstadoInicial}
              />

              <div className="tabelas-section">
                <h2>ITENS PARA SUBSTITUIÇÃO:</h2>
                <FormularioEtiqueta etiquetas={etiquetas} MudarEtiqueta={aoMudarCampo} />
              </div>
            </>
          ) : (
            <p>Carregando</p>
          )}
        </div>
      </main>

      <aside className="App-img">
        <div className="content-wrapper">
          <ImagemPreview src={imagemPreview} />
        </div>
      </aside>

      {mostrarConfirmacao && (
        <div className="excluir-backdrop">
          <div className="excluir-confirm">
            <h3>CONFIRMAR EXCLUSÃO</h3>
            <p><strong>{etiquetaSelecionada ? `${etiquetaSelecionada.nome} / ${obterTituloDaEtiqueta(etiquetaSelecionada)}` : '' }</strong></p>
            <p>Tem certeza que deseja excluir esta etiqueta?</p>

            <div className="btn-cancel">
              <button
                onClick={() => setMostrarConfirmacao(false)}
                disabled={excluindo}
              >
                Cancelar
              </button>

              <button className="btn-excluir"
                onClick={excluirEtiqueta}
                disabled={excluindo}
              >
                {excluindo ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EditarMateriaPrima;
