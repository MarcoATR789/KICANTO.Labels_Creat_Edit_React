import { useState, useEffect, useCallback, useMemo } from 'react';
import API_BASE_URL from '../../../config/apiBase';
import '../../css/pages.css';
import FiltroEtiquetaSelect from '../filtro_etiqueta_select.js';
import { substituirVariaveisComposicao } from '../formatar_itens_composicao.js';
import baseTemplate from '../../zpl/base_etiqueta_composicao.zpl';
import { GARANTIAS_PADRAO, aplicarGarantiasPadrao, isCampoGarantia } from './niveis_garantia_config.js';

const TITULO_OCULTO_NESTA_TELA = 'MATÉRIA PRIMA';

const LABELARY_API_CONFIG = {
  DPI: '8dpmm',
  LARGURA: '4.09',
  ALTURA: '2.5',
  INDICE: '0',
};

const CAMPOS_PREVIEW_VAZIOS = [
  'VARIAVEL_DATA',
  'PRAZO_VALIDADE',
  'VARIAVEL_VALIDADE',
  'VARIAVEL_LOTE',
  'VARIAVEL_BARRAS',
];

const obterUrlLabelary = (zplCodificado) => {
  const { DPI, LARGURA, ALTURA, INDICE } = LABELARY_API_CONFIG;
  return `https://api.labelary.com/v1/printers/${DPI}/labels/${LARGURA}x${ALTURA}/${INDICE}/${zplCodificado}`;
};

const normalizarTexto = (texto) => String(texto ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const obterDadosDaEtiqueta = (item) => {
  try {
    const dados = typeof item?.dados === 'string'
      ? JSON.parse(item.dados)
      : item?.dados;

    return Array.isArray(dados) ? dados : [];
  } catch {
    return [];
  }
};

const obterCampoDaEtiqueta = (item, campoId) => {
  const dados = obterDadosDaEtiqueta(item);
  return dados.find(e => e.id === campoId)?.valor || '';
};

const obterTituloDaEtiqueta = (item) => {
  const titulo = obterCampoDaEtiqueta(item, 'VARIAVEL_TITULO');
  return titulo || 'SEM TÍTULO';
};

const obterPesoDaEtiqueta = (item) => {
  const peso = obterCampoDaEtiqueta(item, 'VARIAVEL_PESO');
  return peso || 'SEM PESO';
};

const obterValorCampo = (campos, id) => (
  campos.find(campo => campo.id === id)?.valor ?? ''
);

const temNumeracao = (item) => /\d/.test(String(item?.nome ?? ''));

const separarPesoGarantia = (valor) => {
  const texto = String(valor ?? '').trim();
  const unidade = texto.toLowerCase().includes('mg/kg') ? 'mg/kg' : 'g/kg';
  const numero = texto
    .replace(/mg\/kg/gi, '')
    .replace(/g\/kg/gi, '')
    .trim();

  return { numero, unidade };
};

const normalizarNumeroGarantia = (valor) => {
  const texto = String(valor ?? '')
    .replace(/[^\d,.]/g, '')
    .replace('.', ',');

  const partes = texto.split(',');
  if (partes.length > 2) return null;

  const totalDigitos = texto.replace(/\D/g, '').length;
  if (totalDigitos === 0) return '';
  if (totalDigitos > 3) return null;

  if (texto && !/^\d{0,3}(,\d{0,2})?$/.test(texto)) return null;

  const numeroComparacao = Number(texto.replace(',', '.'));
  if (Number.isFinite(numeroComparacao) && numeroComparacao > 999) return null;

  return texto;
};

const montarPesoGarantia = (numero, unidade) => (
  numero ? `${numero}${unidade}` : ''
);

const obterCamposGarantiaDaEtiqueta = (dados) => (
  aplicarGarantiasPadrao(dados).filter(campo => isCampoGarantia(campo.id))
);

const atualizarCampoPorId = (campos, id, valor) => (
  campos.map(campo => (
    campo.id === id ? { ...campo, valor } : campo
  ))
);

const mesclarGarantiasNosDados = (dadosOriginais, camposGarantia) => {
  const dadosSemGarantia = dadosOriginais.filter(campo => !isCampoGarantia(campo.id));
  return [...dadosSemGarantia, ...camposGarantia];
};

const completarCamposPreview = (dados) => {
  const existentes = new Set(dados.map(campo => campo.id));
  const camposVazios = CAMPOS_PREVIEW_VAZIOS
    .filter(id => !existentes.has(id))
    .map(id => ({ id, nome: id, valor: '' }));

  return [...dados, ...camposVazios];
};

const FormularioGarantias = ({ camposGarantia, onMudarTitulo, onMudarNumero, onMudarUnidade }) => (
  <div className="wrapper-tabela-variaveis">
    <table className="tabela-variaveis">
      <thead>
        <tr>
          <th>VARIÁVEL:</th>
          <th>VALOR / DESCRIÇÃO:</th>
        </tr>
      </thead>
      <tbody className="label-nomes">
        {GARANTIAS_PADRAO.map(garantia => {
          const titulo = obterValorCampo(camposGarantia, garantia.tituloId);
          const peso = obterValorCampo(camposGarantia, garantia.pesoId);
          const { numero, unidade } = separarPesoGarantia(peso);

          return (
            <tr key={garantia.indice}>
              <td>{`GARANTIA ${garantia.indice}:`}</td>
              <td>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => onMudarTitulo(garantia.tituloId, e.target.value)}
                  placeholder="Digite o título do nível de garantia."
                />
                <input
                  type="text"
                  value={numero}
                  inputMode="decimal"
                  onChange={(e) => onMudarNumero(garantia.pesoId, e.target.value)}
                  placeholder="999"
                />
                <button
                  type="button"
                  className="btn-peso"
                  onClick={() => onMudarUnidade(garantia.pesoId, 'g/kg')}
                  disabled={unidade === 'g/kg'}
                >
                  g/kg
                </button>
                <button
                  type="button"
                  className="btn-peso"
                  onClick={() => onMudarUnidade(garantia.pesoId, 'mg/kg')}
                  disabled={unidade === 'mg/kg'}
                >
                  mg/kg
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const ImagemPreview = ({ src }) => (
  src && <img src={src} className="label-preview" alt="Pré-visualização da etiqueta" />
);

const BtnAction = ({
  filtro,
  onFiltroChange,
  etiquetaSelecionadaId,
  onSelecionarEtiqueta,
  etiquetasAgrupadas,
  onVoltar,
  onSalvar,
  formularioValido,
  limparDados,
  cancelarTudo,
  salvando
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
      <button
        className="btn-salvar"
        onClick={onSalvar}
        disabled={!formularioValido || salvando}
      >
        {salvando ? 'SALVANDO' : 'SALVAR ETIQUETA'}
      </button>

      <button
        className="btn-limpar"
        onClick={limparDados}
        disabled={!etiquetaSelecionadaId}
      >
        LIMPAR DADOS
      </button>

      <button className="btn-cancelar" onClick={cancelarTudo}>
        CANCELAR
      </button>
    </div>
  </>
);

function EditarNiveisGarantia({ onVoltar }) {
  const [conteudoArquivo, setConteudoArquivo] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [imagemPreview, setImagemPreview] = useState('');
  const [etiquetasSalvas, setEtiquetasSalvas] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [etiquetaSelecionadaId, setEtiquetaSelecionadaId] = useState('');
  const [etiquetaSelecionada, setEtiquetaSelecionada] = useState(null);
  const [dadosOriginais, setDadosOriginais] = useState([]);
  const [camposGarantia, setCamposGarantia] = useState([]);
  const [salvando, setSalvando] = useState(false);

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

  const resetarParaEstadoInicial = useCallback(() => {
    setEtiquetaSelecionadaId('');
    setEtiquetaSelecionada(null);
    setDadosOriginais([]);
    setCamposGarantia([]);
    setImagemPreview('');
    setErro('');
    setSucesso('');
    setSalvando(false);
  }, []);

  const listarEtiquetas = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/etiquetas`);
      const data = await res.json();
      setEtiquetasSalvas(data);
    } catch {
      setErro('Erro ao carregar etiquetas salvas.');
    }
  }, []);

  useEffect(() => {
    listarEtiquetas();
  }, [listarEtiquetas]);

  useEffect(() => {
    const carregarArquivoBase = async () => {
      try {
        const resposta = await fetch(baseTemplate);
        const conteudo = await resposta.text();
        setConteudoArquivo(conteudo);
      } catch (erro_) {
        setErro('ERRO AO CARREGAR O ARQUIVO DE TEMPLATE.');
        console.error(erro_);
      }
    };

    carregarArquivoBase();
  }, []);

  const etiquetasFiltradas = useMemo(() => {
    const termo = normalizarTexto(filtro).trim();
    const tituloOcultoNormalizado = normalizarTexto(TITULO_OCULTO_NESTA_TELA);

    const etiquetasComNumeracao = etiquetasSalvas.filter(item => {
      const titulo = normalizarTexto(obterTituloDaEtiqueta(item));
      return temNumeracao(item) && titulo !== tituloOcultoNormalizado;
    });

    if (!termo) return etiquetasComNumeracao;

    return etiquetasComNumeracao.filter(item => {
      const titulo = normalizarTexto(obterTituloDaEtiqueta(item));
      const codigo = normalizarTexto(item?.nome);
      return titulo.includes(termo) || codigo.includes(termo);
    });
  }, [filtro, etiquetasSalvas]);

  const etiquetasAgrupadas = useMemo(() => {
    const grupos = {};
    etiquetasFiltradas.forEach(item => {
      const titulo = obterTituloDaEtiqueta(item) || 'SEM TÍTULO';
      if (!grupos[titulo]) grupos[titulo] = [];
      grupos[titulo].push(item);
    });
    return grupos;
  }, [etiquetasFiltradas]);

  const formularioValido = useMemo(() => (
    Boolean(etiquetaSelecionadaId) &&
    GARANTIAS_PADRAO.every(garantia => {
      const titulo = String(obterValorCampo(camposGarantia, garantia.tituloId)).trim();
      const peso = String(obterValorCampo(camposGarantia, garantia.pesoId)).trim();
      const { numero, unidade } = separarPesoGarantia(peso);
      const numeroNormalizado = normalizarNumeroGarantia(numero);

      return Boolean(titulo) && Boolean(numeroNormalizado) && ['g/kg', 'mg/kg'].includes(unidade);
    })
  ), [camposGarantia, etiquetaSelecionadaId]);

  const dadosParaPreview = useMemo(() => {
    if (!etiquetaSelecionada) return [];

    const dadosComGarantia = mesclarGarantiasNosDados(dadosOriginais, camposGarantia);
    return completarCamposPreview(dadosComGarantia);
  }, [camposGarantia, dadosOriginais, etiquetaSelecionada]);

  const obterConteudoProcessado = useCallback(() => {
    if (!conteudoArquivo || !dadosParaPreview.length) return '';

    return substituirVariaveisComposicao(conteudoArquivo, dadosParaPreview);
  }, [conteudoArquivo, dadosParaPreview]);

  useEffect(() => {
    if (!etiquetaSelecionadaId) {
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
  }, [etiquetaSelecionadaId, obterConteudoProcessado]);

  const selecionarEtiqueta = useCallback(async (id) => {
    setEtiquetaSelecionadaId(id);

    if (!id) {
      resetarParaEstadoInicial();
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/etiquetas/${id}`);

      if (!res.ok) {
        throw new Error('Erro ao carregar etiqueta.');
      }

      const data = await res.json();
      const dados = aplicarGarantiasPadrao(obterDadosDaEtiqueta(data));

      setEtiquetaSelecionada(data);
      setDadosOriginais(dados);
      setCamposGarantia(obterCamposGarantiaDaEtiqueta(dados));
      setErro('');
      setSucesso('');
    } catch {
      setErro('Erro ao carregar etiqueta selecionada.');
    }
  }, [resetarParaEstadoInicial]);

  const mudarTituloGarantia = useCallback((id, valor) => {
    setCamposGarantia(prev => atualizarCampoPorId(prev, id, valor));
  }, []);

  const mudarNumeroGarantia = useCallback((id, valor) => {
    const numeroNormalizado = normalizarNumeroGarantia(valor);
    if (numeroNormalizado === null) return;

    setCamposGarantia(prev => {
      const valorAtual = obterValorCampo(prev, id);
      const { unidade } = separarPesoGarantia(valorAtual);
      return atualizarCampoPorId(prev, id, montarPesoGarantia(numeroNormalizado, unidade));
    });
  }, []);

  const mudarUnidadeGarantia = useCallback((id, unidade) => {
    setCamposGarantia(prev => {
      const valorAtual = obterValorCampo(prev, id);
      const { numero } = separarPesoGarantia(valorAtual);
      return atualizarCampoPorId(prev, id, montarPesoGarantia(numero, unidade));
    });
  }, []);

  const limparDados = useCallback(() => {
    setCamposGarantia(prev => prev.map(campo => ({ ...campo, valor: '' })));
  }, []);

  const cancelarTudo = useCallback(() => {
    resetarParaEstadoInicial();
  }, [resetarParaEstadoInicial]);

  const salvarNiveisGarantia = async () => {
    if (!etiquetaSelecionada || !formularioValido) {
      setErro('Selecione uma etiqueta e preencha todos os níveis de garantia.');
      return;
    }

    setErro('');
    setSucesso('');
    setSalvando(true);

    try {
      const dadosAtualizados = mesclarGarantiasNosDados(dadosOriginais, camposGarantia);

      const res = await fetch(`${API_BASE_URL}/api/etiquetas/${etiquetaSelecionada.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: etiquetaSelecionada.nome,
          etiquetas: dadosAtualizados
        })
      });

      if (!res.ok) {
        throw new Error('Erro ao salvar níveis.');
      }

      setDadosOriginais(dadosAtualizados);
      setSucesso('Níveis de garantia atualizados!');
      listarEtiquetas();
    } catch {
      setErro('Erro ao salvar níveis de garantia.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="App">
      <main className="App-main">
        <div className="content-wrapper">
          {erro && <div className="alert alert-error">{erro}</div>}
          {sucesso && <div className="alert alert-success">{sucesso}</div>}

          <BtnAction
            filtro={filtro}
            onFiltroChange={(e) => setFiltro(e.target.value)}
            etiquetaSelecionadaId={etiquetaSelecionadaId}
            onSelecionarEtiqueta={selecionarEtiqueta}
            etiquetasAgrupadas={etiquetasAgrupadas}
            onVoltar={onVoltar}
            onSalvar={salvarNiveisGarantia}
            formularioValido={formularioValido}
            limparDados={limparDados}
            cancelarTudo={cancelarTudo}
            salvando={salvando}
          />

          {etiquetaSelecionadaId && (
            <div className="tabelas-section">
              <h2>NÍVEIS DE GARANTIA:</h2>
              <FormularioGarantias
                camposGarantia={camposGarantia}
                onMudarTitulo={mudarTituloGarantia}
                onMudarNumero={mudarNumeroGarantia}
                onMudarUnidade={mudarUnidadeGarantia}
              />
            </div>
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

export default EditarNiveisGarantia;
