// IMPORTA OS HOOKS NECESSÁRIOS DO REACT E OUTROS MÓDULOS.
import { useState, useEffect, useCallback, useMemo } from 'react';
import API_BASE_URL from '../../../config/apiBase';
import { PRINTER_HOST, PRINTER_PORT } from '../../../config/printer';
import '../../css/pages.css';
import FiltroEtiquetaSelect from '../filtro_etiqueta_select.js';
import { substituirVariaveisComposicao } from '../formatar_itens_composicao.js';
import baseTemplate from '../../zpl/base_etiqueta_expositor.zpl';
import { aplicarGarantiasPadrao } from '../editar/niveis_garantia_config.js';

// DEFINE A URL BASE DA API, USANDO UMA VARIÁVEL DE AMBIENTE OU UM VALOR PADRÃO.
const TITULO_OCULTO_NESTA_TELA = 'MATÉRIA PRIMA';

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

// REMOVE DUPLICATAS COM BASE EM ID
const dedupePorIdMantendoUltimo = (arr) =>
  Array.from(new Map(arr.map(x => [x.id, x])).values());

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
  quantidadeImpressao,
  onDiminuirQuantidade,
  onAumentarQuantidade,
  onMudarQuantidadeImpressao,
  onVoltar,
  onImprimir,
  onCancelar,
  imprimirDisabled
}) => (
  <>
    <div className="etiquetas-salvas">
      <div className="button-group btn-fechar">
        <button type="button" className="btn-cancelar" onClick={onVoltar}>
          VOLTAR
        </button>
      </div>

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
            <FiltroEtiquetaSelect
              value={etiquetaSelecionadaId}
              onChange={onSelecionarEtiqueta}
              grupos={etiquetasAgrupadas}
              getOptionLabel={(item) => `${item.nome} / ${obterPesoDaEtiqueta(item)}`}
            />
          </div>
        </div>
      </div>
    </div>

    <div className="button-group">
      <button className="btn-cancelar" onClick={onCancelar}>
        CANCELAR
      </button>

      <div className="controle-quantidade" title="Quantidade de etiquetas para impressão.">
        <button
          type="button"
          className="btn-quantidade-ajuste"
          onClick={onDiminuirQuantidade}
          disabled={quantidadeImpressao <= 1}
          aria-label="Diminuir quantidade"
        >
          -
        </button>

        <input
          type="text"
          className="input-quantidade"
          value={quantidadeImpressao}
          inputMode="numeric"
          pattern="[0-9]*"
          onChange={(e) => onMudarQuantidadeImpressao(e.target.value)}
          placeholder="1"
          aria-label="Quantidade de etiquetas"
        />

        <button
          type="button"
          className="btn-quantidade-ajuste"
          onClick={onAumentarQuantidade}
          disabled={quantidadeImpressao >= 999}
          aria-label="Aumentar quantidade"
        >
          +
        </button>
      </div>

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

function ImprimirExpositor({ onVoltar }) {
  // ESTADOS DO COMPONENTE
  const [etiquetas, setEtiquetas] = useState([]);
  const [conteudoArquivo, setConteudoArquivo] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [imprimindo, setImprimindo] = useState(false);
  const [imagemPreview, setImagemPreview] = useState('');
  const [etiquetasSalvas, setEtiquetasSalvas] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [etiquetaSelecionadaId, setEtiquetaSelecionadaId] = useState('');
  const [quantidadeImpressao, setQuantidadeImpressao] = useState(1);

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

  // RESTAURA A SELEÇÃO E A QUANTIDADE INICIAIS.
  const resetarParaEstadoInicial = () => {
    setEtiquetaSelecionadaId('');
    setErro('');
    setSucesso('');
    setQuantidadeImpressao(1);
    setEtiquetas([]);
    setImagemPreview('');
  };

  // IGNORA RESPOSTAS ANTIGAS AO TROCAR OU CANCELAR A SELEÇÃO.
  useEffect(() => {
    if (!etiquetaSelecionadaId) return undefined;

    let cancelado = false;
    const carregarEtiqueta = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/etiquetas/${etiquetaSelecionadaId}`);
        if (!res.ok) throw new Error('Erro ao carregar a etiqueta selecionada.');
        const data = await res.json();
        const dados = typeof data.dados === 'string' ? JSON.parse(data.dados) : data.dados;

        if (!Array.isArray(dados) || dados.length === 0) {
          throw new Error('A etiqueta selecionada não possui dados válidos.');
        }

        if (!cancelado) {
          setEtiquetas(aplicarGarantiasPadrao(dedupePorIdMantendoUltimo(dados)));
        }
      } catch (err) {
        if (!cancelado) setErro(err.message || 'Erro ao carregar a etiqueta selecionada.');
      }
    };

    carregarEtiqueta();
    return () => { cancelado = true; };
  }, [etiquetaSelecionadaId]);

  // LISTAR ETIQUETA NO FORMULARIO
  const listarEtiquetas = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/etiquetas`);
      if (!res.ok) throw new Error('Erro ao carregar as etiquetas salvas.');
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('Lista de etiquetas inválida.');
      setEtiquetasSalvas(data);
    } catch (err) {
      setErro('ERRO AO CARREGAR AS ETIQUETAS SALVAS.');
    }
  };

  useEffect(() => {
    listarEtiquetas();
  }, []);

  // AO SELECIONAR ETIQUETA DA LISTA
  const aoSelecionarEtiqueta = (id) => {
    if (id === etiquetaSelecionadaId) return;
    setEtiquetas([]);
    setImagemPreview('');
    setErro('');
    setSucesso('');
    setEtiquetaSelecionadaId(id);
  };

  const onFiltroChange = (e) => setFiltro(e.target.value);
  const onSelecionarEtiqueta = (id) => aoSelecionarEtiqueta(id);
  const aoMudarQuantidadeImpressao = useCallback((valor) => {
    const somenteNumeros = String(valor ?? '').replace(/\D/g, '').slice(0, 3);

    if (!somenteNumeros) {
      setQuantidadeImpressao('');
      return;
    }

    setQuantidadeImpressao(Number(somenteNumeros));
  }, []);

  // EFEITO PARA CARREGAR O ARQUIVO DE TEMPLATE ZPL NA INICIALIZAÇÃO DO COMPONENTE.
  useEffect(() => {
    const carregarArquivoBase = async () => {
      try {
        const resposta = await fetch(baseTemplate);
        if (!resposta.ok) throw new Error('Erro ao carregar o arquivo de template.');
        const conteudo = await resposta.text();
        setConteudoArquivo(conteudo);
      } catch (erro_) {
        setErro('ERRO AO CARREGAR O ARQUIVO DE TEMPLATE.');
        console.error(erro_);
      }
    };

    carregarArquivoBase();
  }, []);

  // USA OS DADOS SALVOS E DEIXA VAZIOS OS CAMPOS AUSENTES NO CADASTRO.
  const obterConteudoProcessado = useCallback(() => {
    const campos = dedupePorIdMantendoUltimo([
      ...extrairVariaveis(conteudoArquivo),
      ...etiquetas
    ]);
    return substituirVariaveisComposicao(conteudoArquivo, campos);
  }, [etiquetas, conteudoArquivo, extrairVariaveis]);

  // EFEITO PARA ATUALIZAR A PRÉ-VISUALIZAÇÃO DA ETIQUETA QUANDO OS DADOS MUDAM.
  useEffect(() => {
    if (!etiquetaSelecionadaId || etiquetas.length === 0 || !conteudoArquivo) {
      setImagemPreview('');
      return undefined;
    }

    const temporizadorDebounce = setTimeout(() => {
      const conteudo = obterConteudoProcessado();
      if (conteudo) {
        const zplCodificado = encodeURIComponent(conteudo);
        setImagemPreview(obterUrlLabelary(zplCodificado));
      }
    }, 300);

    return () => clearTimeout(temporizadorDebounce);
  }, [obterConteudoProcessado, etiquetaSelecionadaId, etiquetas, conteudoArquivo]);

  const etiquetaCarregada = Boolean(etiquetaSelecionadaId && etiquetas.length > 0 && conteudoArquivo);
  const quantidadeImpressaoNumero = Number.parseInt(quantidadeImpressao, 10);
  const quantidadeImpressaoFiltro = Number.isInteger(quantidadeImpressaoNumero) && quantidadeImpressaoNumero > 0 && quantidadeImpressaoNumero <= 999;

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
    if (imprimindo) return;
    setErro('');
    setSucesso('');

    if (!etiquetaCarregada) {
      setErro('Selecione uma etiqueta e aguarde o carregamento para imprimir.');
      return;
    }

    if (!quantidadeImpressaoFiltro) {
      setErro('Informe uma quantidade válida para imprimir.');
      return;
    }

    const zpl = obterConteudoProcessado();
    const zplQuantidade = Array.from({ length: quantidadeImpressaoNumero }, () => zpl).join('\n');

    if (!zpl) {
      setErro('Não foi possível gerar o ZPL.');
      return;
    }

    setImprimindo(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zpl: zplQuantidade, host: PRINTER_HOST, port: PRINTER_PORT })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Erro ao imprimir.');
      }

      setSucesso(
        quantidadeImpressaoNumero === 1
          ? 'Etiqueta enviada para impressão.'
          : `${quantidadeImpressaoNumero} etiquetas enviadas para impressão.`
      );
    } catch (err) {
      setErro(err?.message || 'Erro ao imprimir.');
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

          <BtnAction
            filtro={filtro}
            onFiltroChange={onFiltroChange}
            etiquetasAgrupadas={etiquetasAgrupadas}
            etiquetaSelecionadaId={etiquetaSelecionadaId}
            onSelecionarEtiqueta={onSelecionarEtiqueta}
            quantidadeImpressao={quantidadeImpressao}
            onDiminuirQuantidade={() => setQuantidadeImpressao(prev => {
              const quantidadeAtual = Number.parseInt(prev, 10);
              return Number.isInteger(quantidadeAtual) ? Math.max(1, quantidadeAtual - 1) : 1;
            })}
            onAumentarQuantidade={() => setQuantidadeImpressao(prev => {
              const quantidadeAtual = Number.parseInt(prev, 10);
              const quantidadeBase = Number.isInteger(quantidadeAtual) ? quantidadeAtual : 0;
              return Math.min(999, quantidadeBase + 1);
            })}
            onMudarQuantidadeImpressao={aoMudarQuantidadeImpressao}
            onVoltar={onVoltar}
            onImprimir={imprimirEtiqueta}
            onCancelar={resetarParaEstadoInicial}
            imprimirDisabled={!etiquetaCarregada || !quantidadeImpressaoFiltro || imprimindo}
          />
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

export default ImprimirExpositor;
