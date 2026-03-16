import { useState, useEffect, useCallback, useMemo } from 'react';
import '../../css/pages.css';
import baseTemplate from '../../zpl/base_etiqueta_colunas.zpl';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';
const TITULO_OCULTO_NESTA_TELA = 'MATÉRIA PRIMA';
const PREFIXO_1X_ETIQUETA = '390';
const PREFIXO_10X_ETIQUETA = '395';
const SEPARADOR_OPT_ETIQUETA = '::';
const OPT_PRINT = [
  { prefixo: PREFIXO_1X_ETIQUETA, quantidade: '1x' },
  { prefixo: PREFIXO_10X_ETIQUETA, quantidade: '10x' },
];

// CONFIGURAÇÕES ZPL PARA LABELARY.
const LABELARY_API_CONFIG = {
  DPI: '8dpmm',
  LARGURA: '3.9',
  ALTURA: '1.6',
  INDICE: '0',
};

// GERAÇÃO DE URL DA IMAGEM PARA DISPLAY NO APP.
const obterUrlLabelary = (zplCodificado) => {
  const { DPI, LARGURA, ALTURA, INDICE } = LABELARY_API_CONFIG;
  return `https://api.labelary.com/v1/printers/${DPI}/labels/${LARGURA}x${ALTURA}/${INDICE}/${zplCodificado}`;
};

// FUNÇÃO EAN-8 CÓDIGO DE BARRAS.
const digitoEan8 = (ean7) => {
  let somaImpares = 0;
  let somaPares = 0;

  for (let i = 0; i < 7; i++) {
    const n = Number(ean7[i]);
    const pos = i + 1; // 1..7

    if (pos % 2 === 1) somaImpares += n;
    else somaPares += n;
  }

  const total = somaImpares * 3 + somaPares;
  return (10 - (total % 10)) % 10;
};

// GERA O EAN-8 COMPLETO PELO NOME (6 DÍGITOS).
const gerarBarrasEan8 = (nomeEtiqueta) => {
  const nomeLimpo = String(nomeEtiqueta ?? '').replace(/\D/g, '');
  if (nomeLimpo.length !== 6) return '';
  const baseEan7 = `2${nomeLimpo}`;
  const dv = digitoEan8(baseEan7);
  return `${baseEan7}${dv}`;
};

// REMOVE DUPLICATAS COM BASE EM ID
const dedupePorIdMantendoUltimo = (arr) =>
  Array.from(new Map(arr.map(x => [x.id, x])).values());

// UPSERT
const upsert = (arr, item) => {
  const i = arr.findIndex(e => e.id === item.id);
  if (i === -1) return [...arr, item];
  const novo = [...arr];
  novo[i] = { ...novo[i], ...item };
  return novo;
};

// OBTER UM CAMPO (VARIAVEL_TITULO, VARIAVEL_PESO).
const obterCampoDaEtiqueta = (item, campoId) => {
  try {
    const dados =
      typeof item.dados === 'string'
        ? JSON.parse(item.dados)
        : item.dados;

    return dados.find(e => e.id === campoId)?.valor || '';
  } catch {
    return '';
  }
};

const obterTituloDaEtiqueta = (item) => {
  const titulo = obterCampoDaEtiqueta(item, 'VARIAVEL_TITULO');
  return titulo || 'SEM TÍTULO';
};

const obterPesoDaEtiqueta = (item) => {
  const peso = obterCampoDaEtiqueta(item, 'VARIAVEL_PESO');
  return peso || 'SEM PESO';
};

const obterPesoEmGramas = (item) => {
  const pesoBruto = String(obterPesoDaEtiqueta(item) || '').trim();
  const match = pesoBruto.match(/^(\d{1,4})\s*(Kg|g)$/i);

  if (!match) return null;

  const valor = Number(match[1]);
  const unidade = match[2].toLowerCase();

  return unidade === 'kg' ? valor * 1000 : valor;
};

const normalizarTexto = (texto) => String(texto ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const extrairCodigo3DoNome = (nome) => {
  const apenasNumeros = String(nome ?? '').replace(/\D/g, '');
  if (apenasNumeros.length < 3) return '';
  return apenasNumeros.slice(-3);
};

const montarNomeEtiqueta = (prefixo, codigo3) => {
  const p = String(prefixo ?? '').replace(/\D/g, '').slice(0, 3);
  const c = String(codigo3 ?? '').replace(/\D/g, '').slice(0, 3);
  if (p.length !== 3 || c.length !== 3) return '';
  return `${p}${c}`;
};

const montarIdOpcaoEtiqueta = (idBase, prefixo) =>
  `${idBase}${SEPARADOR_OPT_ETIQUETA}${prefixo}`;

const separarIdOpcaoEtiqueta = (idOpcao) => {
  const [idBase, prefixo] = String(idOpcao ?? '').split(SEPARADOR_OPT_ETIQUETA);
  return {
    idBase: idBase || '',
    prefixo: prefixo || PREFIXO_1X_ETIQUETA
  };
};


// COMPONENTE QUE EXIBE A IMAGEM DE PRÉ-VISUALIZAÇÃO DA ETIQUETA.
const ImagemPreview = ({ src }) => (
  src && <img src={src} className="label-preview" alt="Prévia da etiqueta" />
);

// COMPONENTE QUE RENDERIZA OS BOTÕES DE AÇÃO.
const BtnAction = ({
  filtro,
  onFiltroChange,
  etiquetasAgrupadas,
  etiquetaSelecionadaId,
  onSelecionarEtiqueta,
  onVoltar,
  onImprimir,
  onCancelar,
  imprimirDisabled
}) => (
  <>
    <div className="etiquetas-salvas">
      <button type="button" className="btn-fechar" onClick={onVoltar}>
        X
      </button>

      <div className="filtro-etiquetas">
        <div className="filtro-titulo">FILTRAR TÍTULO / CÓDIGO</div>
        <div className="filtro-row">
          <div className="filtro-combo">
            <input
              className="filtro-input"
              placeholder="Pesquisar"
              value={filtro}
              onChange={onFiltroChange}
            />
            <select
              className="filtro-select"
              value={etiquetaSelecionadaId}
              onChange={(e) => onSelecionarEtiqueta(e.target.value)}
            >
              <option value="">Selecionar uma etiqueta</option>
              {Object.keys(etiquetasAgrupadas).length === 0 && (
                <option value="" disabled>Nenhuma etiqueta encontrada</option>
              )}

              {Object.entries(etiquetasAgrupadas)
                .sort(([a], [b]) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
                .map(([titulo, itens]) => (
                  <optgroup key={titulo} label={titulo}>
                    {itens.map(item => (
                      <option key={item.idOpcao} value={item.idOpcao}>
                        {item.quantidadeOpcao} / {item.nomeOpcao} / {obterPesoDaEtiqueta(item)}
                      </option>
                    ))}
                  </optgroup>
                ))}
            </select>
          </div>
        </div>
      </div>
    </div>

    <div className="button-group">
      <button className="btn-cancelar" onClick={onCancelar}>
        CANCELAR
      </button>

      <button
        className="btn-imprimir"
        onClick={onImprimir}
        disabled={imprimirDisabled}
        title={imprimirDisabled ? 'Selecione uma etiqueta para imprimir.' : 'Enviar etiqueta para impressora.'}
      >
        IMPRIMIR
      </button>
    </div>
  </>
);

function ImprimirColunas({ onVoltar }) {
  // ESTADOS DO COMPONENTE
  const [etiquetas, setEtiquetas] = useState([]);
  const [conteudoArquivo, setConteudoArquivo] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [imprimindo, setImprimindo] = useState(false);
  const [imagemPreview, setImagemPreview] = useState('');
  const [etiquetasSalvas, setEtiquetasSalvas] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [carregandoLista, setCarregandoLista] = useState(false);
  const [etiquetaSelecionadaId, setEtiquetaSelecionadaId] = useState('');

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

  // FUNÇÃO PARA EXTRAIR AS VARIÁVEIS (EX: {VARIAVEL_TITULO}) DO CONTEÚDO DO ARQUIVO ZPL.
  const extrairVariaveis = useCallback((conteudo) => {
    const regex = /\{(\w+)\}/g;
    const correspondencias = [...new Set([...conteudo.matchAll(regex)].map(m => m[1]))];
    return correspondencias.map(nome => ({ id: nome, nome, valor: '' }));
  }, []);

  // FUNÇÃO PARA RESETAR O FORMULÁRIO PARA O ESTADO INICIAL.
  const resetarParaEstadoInicial = useCallback(() => {
    if (!conteudoArquivo) return;

    const hojeStr = new Date().toLocaleDateString('pt-BR');
    const etiquetasExtraidas = extrairVariaveis(conteudoArquivo);

    const etiquetasBase = [
      { id: 'VARIAVEL_CODIGO', nome: 'VARIAVEL_CODIGO', valor: '' },

      ...etiquetasExtraidas
        .filter(e => e.id !== 'VARIAVEL_CODIGO')
        .map(e => {
          if (e.id === 'VARIAVEL_DATA') return { ...e, valor: hojeStr };
          return { ...e, valor: '' };
        }),

      { id: 'PRAZO_VALIDADE', nome: 'PRAZO_VALIDADE', valor: '' },
      { id: 'VARIAVEL_VALIDADE', nome: 'VARIAVEL_VALIDADE', valor: '' },
      { id: 'VARIAVEL_LOTE', nome: 'VARIAVEL_LOTE', valor: '' },
      { id: 'VARIAVEL_BARRAS', nome: 'VARIAVEL_BARRAS', valor: '' },
    ];

    setEtiquetaSelecionadaId('');
    setErro('');
    setSucesso('');
    setImprimindo(false);
    setEtiquetas(etiquetasBase);
    setImagemPreview('');
  }, [conteudoArquivo, extrairVariaveis]);

  // CARREGAR ETIQUETA DO BANCO NO FORMULÁRIO
  const carregarEtiqueta = async (id, prefixoSelecionado = PREFIXO_1X_ETIQUETA) => {
    const res = await fetch(`${API_BASE_URL}/api/etiquetas/${id}`);
    const data = await res.json();

    const etiquetasCarregadas =
      typeof data.dados === 'string'
        ? JSON.parse(data.dados)
        : data.dados;

    const hojeStr = new Date().toLocaleDateString('pt-BR');

    let completas = [...etiquetasCarregadas];

    // garante campos fixos no state
    completas = upsert(completas, { id: 'VARIAVEL_DATA', nome: 'VARIAVEL_DATA', valor: hojeStr });
    completas = upsert(completas, { id: 'PRAZO_VALIDADE', nome: 'PRAZO_VALIDADE', valor: '' });
    completas = upsert(completas, { id: 'VARIAVEL_VALIDADE', nome: 'VARIAVEL_VALIDADE', valor: '' });
    completas = upsert(completas, { id: 'VARIAVEL_LOTE', nome: 'VARIAVEL_LOTE', valor: '' });

    // remove duplicatas antes de calcular barras (evita usar valor "errado" na substituição)
    completas = dedupePorIdMantendoUltimo(completas);

    // GERA BARRAS SEMPRE A PARTIR DO NOME (com DV EAN-8)
    const codigo3 = completas.find(e => e.id === 'VARIAVEL_CODIGO')?.valor || '';
    const nomeGerado = montarNomeEtiqueta(prefixoSelecionado, codigo3);
    const barras = gerarBarrasEan8(nomeGerado);

    completas = upsert(completas, { id: 'VARIAVEL_BARRAS', nome: 'VARIAVEL_BARRAS', valor: barras });

    // garante novamente sem duplicatas (por segurança)
    completas = dedupePorIdMantendoUltimo(completas);

    setEtiquetas(completas);
  };

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

  // AO SELECIONAR ETIQUETA DA LISTA
  const aoSelecionarEtiqueta = (idOpcao) => {
    setEtiquetaSelecionadaId(idOpcao);
    if (!idOpcao) return;
    const { idBase, prefixo } = separarIdOpcaoEtiqueta(idOpcao);
    if (!idBase) return;
    carregarEtiqueta(idBase, prefixo);
  };

  const onFiltroChange = (e) => setFiltro(e.target.value);
  const onSelecionarEtiqueta = (id) => aoSelecionarEtiqueta(id);

  // EFEITO PARA CARREGAR O ARQUIVO DE TEMPLATE ZPL NA INICIALIZAÇÃO DO COMPONENTE.
  useEffect(() => {
    const carregarArquivoBase = async () => {
      try {
        const resposta = await fetch(baseTemplate);
        const conteudo = await resposta.text();
        setConteudoArquivo(conteudo);

        const etiquetasExtraidas = extrairVariaveis(conteudo);

        setEtiquetas([
          { id: 'VARIAVEL_CODIGO', nome: 'VARIAVEL_CODIGO', valor: '' },

          ...etiquetasExtraidas
            .filter(e => e.id !== 'VARIAVEL_CODIGO')
            .map(etiqueta => {
              if (etiqueta.id === 'VARIAVEL_DATA') {
                return { ...etiqueta, valor: new Date().toLocaleDateString('pt-BR') };
              }
              return etiqueta;
            }),

          { id: 'PRAZO_VALIDADE', nome: 'PRAZO_VALIDADE', valor: '' },
          { id: 'VARIAVEL_VALIDADE', nome: 'VARIAVEL_VALIDADE', valor: '' },
          { id: 'VARIAVEL_LOTE', nome: 'VARIAVEL_LOTE', valor: '' },
          { id: 'VARIAVEL_BARRAS', nome: 'VARIAVEL_BARRAS', valor: '' },
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
    const hoje = new Date().toLocaleDateString('pt-BR');

    let conteudo = conteudoArquivo.replaceAll('{VARIAVEL_DATA}', hoje);

    return etiquetas.reduce((acc, etiqueta) =>
      acc.replaceAll(`{${etiqueta.nome}}`, etiqueta.valor),
      conteudo
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

  const etiquetaSelecionadaOk = Boolean(etiquetaSelecionadaId);

  // OCULTAR ETIQUETAS DE MATÉRIA PRIMA E PESO ACIMA DE 500g
  const etiquetasBase = useMemo(() => {
    const tituloOcultoNormalizado = normalizarTexto(TITULO_OCULTO_NESTA_TELA);

    const etiquetasAte500g = etiquetasSalvas.filter(item => {
      const pesoEmGramas = obterPesoEmGramas(item);
      return pesoEmGramas !== null && pesoEmGramas <= 500;
    });

    return etiquetasAte500g.filter(item => {
      const titulo = normalizarTexto(obterTituloDaEtiqueta(item));
      return titulo !== tituloOcultoNormalizado;
    });
  }, [etiquetasSalvas]);

  const opcoesEtiquetas = useMemo(() => {
    const termo = normalizarTexto(filtro).trim();

    const opcoes = etiquetasBase.flatMap(item => {
      const codigo3 = extrairCodigo3DoNome(item?.nome);

      return OPT_PRINT
        .map(({ prefixo, quantidade }) => {
          const nomeOpcao = montarNomeEtiqueta(prefixo, codigo3);
          if (!nomeOpcao) return null;

          return {
            ...item,
            idOpcao: montarIdOpcaoEtiqueta(item.id, prefixo),
            nomeOpcao,
            quantidadeOpcao: quantidade
          };
        })
        .filter(Boolean);
    });

    if (!termo) return opcoes;

    return opcoes.filter(opcao => {
      const titulo = normalizarTexto(obterTituloDaEtiqueta(opcao));
      const codigo = normalizarTexto(opcao.nomeOpcao);
      return titulo.includes(termo) || codigo.includes(termo);
    });
  }, [filtro, etiquetasBase]);

  const imprimirEtiqueta = async () => {
    setErro('');
    setSucesso('');

    if (!etiquetaSelecionadaOk) {
      setErro('Selecione uma etiqueta para imprimir.');
      return;
    }

    if (!conteudoArquivo) {
      setErro('Arquivo base não carregado.');
      return;
    }

    const zpl = obterConteudoProcessado();

    if (!zpl) {
      setErro('Não foi possível gerar o ZPL.');
      return;
    }

    setImprimindo(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zpl })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Erro ao imprimir.');
      }

      setSucesso('Etiqueta enviada para impressão.');
      setTimeout(() => {
        setSucesso('');
      }, 2000);
    } catch (err) {
      setErro(err?.message || 'Erro ao imprimir.');
      setTimeout(() => {
        setErro('');
      }, 2000);
    } finally {
      setImprimindo(false);
    }
  };

  /// AGRUPA AS ETIQUETAS
  const etiquetasAgrupadas = useMemo(() => {
    const grupos = {};
    opcoesEtiquetas.forEach(item => {
      const titulo = obterTituloDaEtiqueta(item) || 'SEM TÍTULO';
      if (!grupos[titulo]) grupos[titulo] = [];
      grupos[titulo].push(item);
    });
    return grupos;
  }, [opcoesEtiquetas]);

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
                onFiltroChange={onFiltroChange}
                etiquetasAgrupadas={etiquetasAgrupadas}
                etiquetaSelecionadaId={etiquetaSelecionadaId}
                onSelecionarEtiqueta={onSelecionarEtiqueta}
                onVoltar={onVoltar}
                onImprimir={imprimirEtiqueta}
                onCancelar={resetarParaEstadoInicial}
                imprimirDisabled={!etiquetaSelecionadaOk || imprimindo}
              />
            </>
          ) : (
            <p>Carregando...</p>
          )}
        </div>
      </main>

      <aside className="App-img">
        <div className="content-wrapper">
          <ImagemPreview src={imagemPreview} />
        </div>
      </aside>
    </div>
  );
}

export default ImprimirColunas;
