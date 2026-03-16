// IMPORTA OS HOOKS NECESSÁRIOS DO REACT E OUTROS MÓDULOS.
import { useState, useEffect, useCallback, useMemo } from 'react';
import '../../css/pages.css';
import baseTemplate from '../../zpl/base_etiqueta_composicao.zpl';

// DEFINE A URL BASE DA API, USANDO UMA VARIÁVEL DE AMBIENTE OU UM VALOR PADRÃO.
const API_BASE_URL = process.env.REACT_APP_API_URL || '';
const TITULO_OCULTO_NESTA_TELA = 'MATÉRIA PRIMA';

// MAPEIA OS NOMES INTERNOS DAS VARIÁVEIS PARA NOMES AMIGÁVEIS EXIBIDOS NA INTERFACE.
const LABEL_NAMES = {
  'VARIAVEL_CODIGO': 'CÓDIGO DO PRODUTO:',
  'VARIAVEL_TITULO': 'TÍTULO:',
  'VARIAVEL_PESO': 'PESO:',
  'VARIAVEL_INDICADO': 'INDICAÇÃO:',
  'VARIAVEL_COMPOSICAO': 'COMPOSIÇÃO:',
  'VARIAVEL_ID_1': '* ITEM:',
  'VARIAVEL_ID_2': '** ITEM:',
  'VARIAVEL_ID_3': '*** ITEM:',
  'VARIAVEL_DATA': 'DATA DE FABRICAÇÃO:',
  'VARIAVEL_VALIDADE': 'DATA DE VALIDADE:',
  'VARIAVEL_LOTE': 'VALIDADE LOTE:',
  'PRAZO_VALIDADE': 'PRAZO DE VALIDADE:',
};

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

// FUNÇÃO PARA CALCULAR O DÍGITO VERIFICADOR DO EAN-8 A PARTIR DE 7 DÍGITOS.
const digitoEan8 = (ean7) => {
  let somaImpares = 0;
  let somaPares = 0;

  for (let i = 0; i < 7; i++) {
    const n = Number(ean7[i]);
    const pos = i + 1; // 1..7

    if (pos % 2 === 1) somaImpares += n; // 1,3,5,7
    else somaPares += n;                 // 2,4,6
  }

  const total = somaImpares * 3 + somaPares;
  return (10 - (total % 10)) % 10;
};

// GERA O EAN-8 COMPLETO A PARTIR DO CÓDIGO (3 DÍGITOS)
const gerarBarrasEan8 = (codigo3) => {
  if (!codigo3 || String(codigo3).length !== 3) return '';
  const nomeGerado = '390' + codigo3; // 6 dígitos
  const baseEan7 = '2' + nomeGerado;  // 7 dígitos
  const dv = digitoEan8(baseEan7);
  return `${baseEan7}${dv}`;          // 8 dígitos
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
          // MOSTRA SOMENTE ESTES DOIS CAMPOS
          .filter(etiqueta => ['VARIAVEL_DATA', 'PRAZO_VALIDADE'].includes(etiqueta.id))
          .map(etiqueta => (
            <tr key={etiqueta.id}>
              <td>{LABEL_NAMES[etiqueta.id] || etiqueta.nome}</td>
              <td>
                <input
                  type="text"
                  inputMode={etiqueta.id === 'PRAZO_VALIDADE' ? 'numeric' : undefined}
                  pattern={etiqueta.id === 'PRAZO_VALIDADE' ? '[0-9]*' : undefined}
                  value={etiqueta.valor}
                  onChange={(e) => {
                    if (etiqueta.id === 'VARIAVEL_DATA') return;

                    if (etiqueta.id === 'PRAZO_VALIDADE') {
                      const somenteNumeros = e.target.value.replace(/\D/g, '').slice(0, 3);
                      MudarEtiqueta(etiqueta.id, somenteNumeros);
                      return;
                    }

                    MudarEtiqueta(etiqueta.id, e.target.value);
                  }}
                  placeholder={etiqueta.id === 'PRAZO_VALIDADE' ? 'Digite o número de dias.' : ''}
                  readOnly={etiqueta.id === 'VARIAVEL_DATA'}
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
  src && <img src={src} className="label-preview" alt="Prévia da etiqueta" />
);

// COMPONENTE QUE RENDERIZA OS BOTÕES DE AÇÃO.
const BtnAction = ({
  filtro,
  onFiltroChange,
  etiquetasAgrupadas,
  etiquetaSelecionadaId,
  onSelecionarEtiqueta,
  limparDados,
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
                      <option key={item.id} value={item.id}>
                        {item.nome} / {obterPesoDaEtiqueta(item)}
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
      <button className="btn-limpar" onClick={limparDados}>
        LIMPAR DADOS
      </button>

      <button className="btn-cancelar" onClick={onCancelar}>
        CANCELAR
      </button>

      <button
        className="btn-imprimir"
        onClick={onImprimir}
        disabled={imprimirDisabled}
        title={imprimirDisabled ? 'Selecione uma etiqueta e informe o prazo de validade para imprimir.' : 'Enviar etiqueta para impressora.'}
      >
        IMPRIMIR
      </button>
    </div>
  </>
);

function ImprimirLote({ onVoltar }) {
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
  const carregarEtiqueta = async (id) => {
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

    // GERA BARRAS SEMPRE A PARTIR DO VARIAVEL_CODIGO (com DV EAN-8)
    const codigo3 = completas.find(e => e.id === 'VARIAVEL_CODIGO')?.valor || '';
    const barras = gerarBarrasEan8(codigo3);

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
      setErro('ERRO AO CARREGAR AS ETIQUETAS SALVAS.');
    } finally {
      setCarregandoLista(false);
    }
  };

  useEffect(() => {
    listarEtiquetas();
  }, []);

  // AO SELECIONAR ETIQUETA DA LISTA
  const aoSelecionarEtiqueta = (id) => {
    setEtiquetaSelecionadaId(id);
    if (!id) return;
    carregarEtiqueta(id);
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

  // FUNÇÃO PARA LIDAR COM A MUDANÇA NOS CAMPOS DE INPUT.
  const aoMudarCampo = useCallback((id, valor) => {
    let valorProcessado = valor;

    switch (id) {
      case 'VARIAVEL_CODIGO': {
        const apenasNumeros = valor.replace(/[^\d]/g, '').slice(0, 3);
        valorProcessado = apenasNumeros;

        setEtiquetas(prev =>
          prev.map(e => {
            // SÓ GERA CÓDIGO DE BARRAS QUANDO TIVER OS 3 DÍGITOS FINAIS
            if (e.id === 'VARIAVEL_BARRAS') {
              if (apenasNumeros.length === 3) {
                const barras = gerarBarrasEan8(apenasNumeros);
                return { ...e, valor: barras };
              }
              return { ...e, valor: '' };
            }

            if (e.id === id) {
              return { ...e, valor: valorProcessado };
            }

            return e;
          })
        );
        return;
      }

      case 'VARIAVEL_PESO': {
        const partNumero = valor.replace(/[^\d]/g, '');
        const partUnidade = valor.replace(/\d/g, '');
        if (
          partNumero.length > 3 ||
          (partNumero.length > 0 && !/^\d+$/.test(partNumero)) ||
          (partUnidade && !['Kg', 'g'].includes(partUnidade))
        ) return;

        valorProcessado = valor;
        break;
      }

      case 'VARIAVEL_TITULO':
        valorProcessado = valor.replace(/[^a-zA-Z\s]/g, '').toUpperCase();
        break;

      case 'VARIAVEL_INDICADO':
        valorProcessado = valor.replace(/[0-9]/g, '').slice(0, 17);
        break;

      case 'PRAZO_VALIDADE': {
        if (valor === '') {
          valorProcessado = '';
        } else {
          const dias = parseInt(valor, 10);
          if (isNaN(dias) || dias < 1 || dias > 999) return;

          valorProcessado = valor;

          const hoje = new Date();
          const dataFabricacao = hoje.toLocaleDateString('pt-BR');
          const dataValidade = new Date(hoje.getTime() + dias * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR');

          const dataVencimento = new Date(hoje.getTime() + dias * 24 * 60 * 60 * 1000);
          const ano = dataVencimento.getFullYear().toString().slice(-2);
          const diaDoAno = obterDiaDoAno(hoje).toString().padStart(3, '0');
          const lote = `${ano}.${diaDoAno}`;

          setEtiquetas(prev => prev.map(etiqueta => {
            if (etiqueta.id === 'VARIAVEL_DATA') return { ...etiqueta, valor: dataFabricacao };
            if (etiqueta.id === 'VARIAVEL_VALIDADE') return { ...etiqueta, valor: dataValidade };
            if (etiqueta.id === 'VARIAVEL_LOTE') return { ...etiqueta, valor: lote };
            if (etiqueta.id === id) return { ...etiqueta, valor: valorProcessado };
            return etiqueta;
          }));
          return;
        }
        break;
      }

      default:
        break;
    }

    setEtiquetas(prev => prev.map(etiqueta =>
      etiqueta.id === id ? { ...etiqueta, valor: valorProcessado } : etiqueta
    ));
  }, []);

  // FUNÇÃO PARA LIMPAR TODOS OS CAMPOS DO FORMULÁRIO E RESETAR O NOME DO ARQUIVO.
  const limparDados = () => {
    setEtiquetas(prev =>
      prev.map(etiqueta => {
        if (etiqueta.id === 'PRAZO_VALIDADE') return { ...etiqueta, valor: '' };
        if (etiqueta.id === 'VARIAVEL_VALIDADE') return { ...etiqueta, valor: '' };
        if (etiqueta.id === 'VARIAVEL_LOTE') return { ...etiqueta, valor: '' };
        return etiqueta;
      })
    );
    setSucesso('');
  };

  const prazoValidadeValor = etiquetas.find(e => e.id === 'PRAZO_VALIDADE')?.valor || '';
  const prazoValidadeDias = parseInt(prazoValidadeValor, 10);
  const prazoValidadeOk = Number.isInteger(prazoValidadeDias) && prazoValidadeDias > 0 && etiquetaSelecionadaId;

  // OCULTAR ETIQUETAS COM NOME MATÉRIAL PRIMA
  const etiquetasFiltradas = useMemo(() => {
    const termo = normalizarTexto(filtro).trim();
    const tituloOcultoNormalizado = normalizarTexto(TITULO_OCULTO_NESTA_TELA);

    const etiquetasSemMateriaPrima = etiquetasSalvas.filter(item => {
      const titulo = normalizarTexto(obterTituloDaEtiqueta(item));
      return titulo !== tituloOcultoNormalizado;
    });

    if (!termo) return etiquetasSemMateriaPrima;

    return etiquetasSemMateriaPrima.filter(item => {
      const titulo = normalizarTexto(obterTituloDaEtiqueta(item));
      const codigo = normalizarTexto(item?.nome);
      return titulo.includes(termo) || codigo.includes(termo);
    });
  }, [filtro, etiquetasSalvas]);

  const imprimirEtiqueta = async () => {
    setErro('');
    setSucesso('');

    if (!prazoValidadeOk) {
      setErro('Informe o prazo de validade para imprimir.');
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

  // AGRUPA AS ETIQUETAS
  const etiquetasAgrupadas = useMemo(() => {
    const grupos = {};
    etiquetasFiltradas.forEach(item => {
      const titulo = obterTituloDaEtiqueta(item) || 'SEM TÍTULO';
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
                onFiltroChange={onFiltroChange}
                etiquetasAgrupadas={etiquetasAgrupadas}
                etiquetaSelecionadaId={etiquetaSelecionadaId}
                onSelecionarEtiqueta={onSelecionarEtiqueta}
                limparDados={limparDados}
                onVoltar={onVoltar}
                onImprimir={imprimirEtiqueta}
                onCancelar={resetarParaEstadoInicial}
                imprimirDisabled={!prazoValidadeOk || imprimindo}
              />

              <div className="tabelas-section">
                <h2>ITENS PARA SUBSTITUIÇÃO:</h2>
                <FormularioEtiqueta etiquetas={etiquetas} MudarEtiqueta={aoMudarCampo} />
              </div>
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

export default ImprimirLote;
