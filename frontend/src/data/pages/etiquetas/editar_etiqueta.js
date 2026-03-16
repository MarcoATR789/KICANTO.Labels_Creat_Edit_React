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
  'VARIAVEL_ID_4': '**** ITEM:',
  'VARIAVEL_VALIDADE': 'DATA DE VALIDADE:',
  'VARIAVEL_LOTE': 'VALIDADE LOTE:',
  'PRAZO_VALIDADE': 'PRAZO DE VALIDADE:',
};

const CAMPOS_OBRIGATORIOS = [
  'VARIAVEL_CODIGO',
  'VARIAVEL_TITULO',
  'VARIAVEL_PESO',
  'VARIAVEL_INDICADO',
  'VARIAVEL_COMPOSICAO',
  //'VARIAVEL_ID_1',
];

const CAMPOS_MANTER_COPIA = new Set([
  'VARIAVEL_TITULO',
  'VARIAVEL_INDICADO',
  'VARIAVEL_COMPOSICAO',
  'VARIAVEL_ID_1',
  'VARIAVEL_ID_2',
  'VARIAVEL_ID_3',
  'VARIAVEL_ID_4',
]);

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

// ====== EAN-8 (GERA SEMPRE A PARTIR DO VARIAVEL_CODIGO) ======
const gerarBarrasEan8 = (codigo3) => {
  const c = String(codigo3 || '').replace(/\D/g, '').slice(0, 3);
  if (c.length !== 3) return '';

  // 7 dígitos base do EAN-8 (sem DV)
  const baseEan7 = `2${'390' + c}`;

  // EAN-8: posições ímpares * 3 + pares * 1
  let somaImpares = 0;
  let somaPares = 0;

  for (let i = 0; i < 7; i++) {
    const n = Number(baseEan7[i]);
    const pos = i + 1;
    if (pos % 2 === 1) somaImpares += n;
    else somaPares += n;
  }

  const total = somaImpares * 3 + somaPares;
  const dv = (10 - (total % 10)) % 10;

  return `${baseEan7}${dv}`; // 8 dígitos
};

// UPSERT por id (evita duplicatas)
const upsertById = (arr, item) => {
  const map = new Map(arr.map(x => [x.id, x]));
  map.set(item.id, item);
  return Array.from(map.values());
};

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
          .filter(etiqueta => !['VARIAVEL_DATA', 'PRAZO_VALIDADE', 'VARIAVEL_VALIDADE', 'VARIAVEL_LOTE', 'VARIAVEL_BARRAS'].includes(etiqueta.id))
          .map(etiqueta => (
            <tr key={etiqueta.id}>
              <td>{LABEL_NAMES[etiqueta.id] || etiqueta.nome}</td>
              <td>
                {etiqueta.id === 'VARIAVEL_PESO' ? (
                  <>
                    <input
                      type="text"
                      value={etiqueta.valor}
                      onChange={(e) => MudarEtiqueta(etiqueta.id, e.target.value)}
                      placeholder="Digite o peso (ex: 50Kg)."
                    />
                    <button classname="btn-peso" onClick={() => {
                      const num = etiqueta.valor.replace(/[^\d]/g, '');
                      MudarEtiqueta(etiqueta.id, num + 'Kg');
                    }}>Kg</button>
                    <button classname="btn-peso" onClick={() => {
                      const num = etiqueta.valor.replace(/[^\d]/g, '');
                      MudarEtiqueta(etiqueta.id, num + 'g');
                    }}>g</button>
                  </>
                ) : (
                  <input
                    type="text"
                    value={
                      etiqueta.id === 'VARIAVEL_CODIGO'
                        ? `390${etiqueta.valor}`
                        : etiqueta.valor
                    }
                    onChange={(e) => {
                      if (etiqueta.id === 'VARIAVEL_CODIGO') {
                        const valorDigitado = e.target.value.replace(/\D/g, '');

                        const semPrefixo = valorDigitado.startsWith('390')
                          ? valorDigitado.slice(3)
                          : valorDigitado;

                        const apenasTresDigitos = semPrefixo.slice(0, 3);
                        MudarEtiqueta(etiqueta.id, apenasTresDigitos);
                      } else {
                        MudarEtiqueta(etiqueta.id, e.target.value);
                      }
                    }}
                    placeholder={etiqueta.id === 'VARIAVEL_CODIGO' ? '390000' : 'Digite o conteúdo da etiqueta.'}
                  />
                )}
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
  codigoProdutoValido,
  formularioValido,
  etiquetaEmEdicao,
  limparDados,
  cancelarTudo,
  onCopiarDados
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
      <button
        className="btn-salvar"
        onClick={onSalvar}
        disabled={!codigoProdutoValido || !formularioValido}
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
        <button className="btn-copiar" onClick={onCopiarDados}>
          COPIAR DADOS
        </button>
      )}

      {etiquetaSelecionadaId && (
        <button className="btn-excluir" onClick={onExcluirSelecionada}>
          Excluir
        </button>
      )}
    </div>
  </>
);

function EditarEtiqueta({ onVoltar }) {
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

  const nomeArquivo = useMemo(() => {
    const codigo = etiquetas.find(e => e.id === 'VARIAVEL_CODIGO')?.valor || '';
    if (String(codigo).length !== 3) return '';
    return '390' + codigo;
  }, [etiquetas]);

  const codigoProdutoValido = useMemo(() => {
    const codigo = etiquetas.find(e => e.id === 'VARIAVEL_CODIGO')?.valor || '';
    return String(codigo).length === 3;
  }, [etiquetas]);

  const formularioValido = useMemo(() => {
    return CAMPOS_OBRIGATORIOS.every(id => {
      const campo = etiquetas.find(e => e.id === id);

      if (!campo) return false;

      return campo.valor && campo.valor.toString().trim() !== '';
    });
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

    // VALIDAÇÕES ANTES DE SALVAR A ETIQUETA.
    if (!formularioValido) {
      setErro('Preencha todos os campos obrigatórios antes de salvar ou editar a etiqueta.');
      setTimeout(() => setErro(''), 2000);
      return;
    }

    // NÃO SALVA VARIAVEL_BARRAS NO BANCO (sempre será gerado a partir do VARIAVEL_CODIGO)
    const etiquetasParaSalvar = etiquetas.filter(e =>
      !['VARIAVEL_DATA', 'PRAZO_VALIDADE', 'VARIAVEL_BARRAS'].includes(e.id)
    );

    const url = etiquetaEmEdicao
      ? `${API_BASE_URL}/api/etiquetas/${etiquetaEmEdicao}`
      : `${API_BASE_URL}/api/etiquetas`;

    const method = etiquetaEmEdicao ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: nomeArquivo, // EX: 390000
        etiquetas: etiquetasParaSalvar
      })
    });

    if (res.status === 409) {
      setErro('Já existe uma etiqueta com esse código do produto.');
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
  };

  // FUNÇÃO PARA RESETAR O FORMULÁRIO PARA O ESTADO INICIAL.
  const resetarParaEstadoInicial = useCallback(() => {
    if (!conteudoArquivo) return;

    const etiquetasBase = [
      {
        id: 'VARIAVEL_CODIGO',
        nome: 'VARIAVEL_CODIGO',
        valor: ''
      },
      ...extrairVariaveis(conteudoArquivo)
        .filter(etiqueta => etiqueta.id !== 'VARIAVEL_DATA')
        .map(etiqueta => ({ ...etiqueta, valor: '' })),
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

  // EDITAR ETIQUETA NO FORMULARIO
  const carregarEtiqueta = async (id) => {
    const res = await fetch(`${API_BASE_URL}/api/etiquetas/${id}`);
    const data = await res.json();

    const etiquetasCarregadas =
      typeof data.dados === 'string'
        ? JSON.parse(data.dados)
        : data.dados;

    const etiquetasSemData = etiquetasCarregadas.filter(e => e.id !== 'VARIAVEL_DATA');
    const codigo3 = etiquetasCarregadas.find(e => e.id === 'VARIAVEL_CODIGO')?.valor || '';
    const barras = gerarBarrasEan8(codigo3);

    let completas = [...etiquetasSemData];
    completas = upsertById(completas, { id: 'VARIAVEL_BARRAS', nome: 'VARIAVEL_BARRAS', valor: barras });

    setEtiquetas(completas);
    setEtiquetaEmEdicao(id);
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

  // AO SELECIONAR ETIQUETA DA LISTA
  const aoSelecionarEtiqueta = (id) => {
    setEtiquetaSelecionadaId(id);

    if (!id) return; // NENHUMA SELECIONADA

    carregarEtiqueta(id);
  };

  // EFEITO PARA CARREGAR O ARQUIVO DE TEMPLATE ZPL NA INICIALIZAÃ‡ÃƒO DO COMPONENTE.
  useEffect(() => {
    const carregarArquivoBase = async () => {
      try {
        const resposta = await fetch(baseTemplate);
        const conteudo = await resposta.text();
        setConteudoArquivo(conteudo);

        const etiquetasExtraidas = extrairVariaveis(conteudo);

        setEtiquetas([
          {
            id: 'VARIAVEL_CODIGO',
            nome: 'VARIAVEL_CODIGO',
            valor: ''
          },
          ...etiquetasExtraidas
            .filter(e => !['VARIAVEL_CODIGO', 'VARIAVEL_DATA'].includes(e.id)),
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
    const conteudoSemData = conteudoArquivo.replaceAll('{VARIAVEL_DATA}', '');
    return etiquetas.reduce((acc, etiqueta) =>
      acc.replaceAll(`{${etiqueta.nome}}`, etiqueta.valor),
      conteudoSemData
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
        const apenasNumeros = String(valor).replace(/[^\d]/g, '').slice(0, 3);
        valorProcessado = apenasNumeros;

        setEtiquetas(prev => {
          let novo = prev.map(e => (
            e.id === id ? { ...e, valor: valorProcessado } : e
          ));

          // SÓ GERA CÓDIGO DE BARRAS QUANDO TIVER OS 3 DÍGITOS FINAIS
          const barras = gerarBarrasEan8(apenasNumeros);
          novo = upsertById(novo, { id: 'VARIAVEL_BARRAS', nome: 'VARIAVEL_BARRAS', valor: barras });

          return novo;
        });
        return;
      }

      case 'VARIAVEL_PESO':
        const partNumero = String(valor).replace(/[^\d]/g, '');
        const partUnidade = String(valor).replace(/\d/g, '');
        if (partNumero.length > 3 || (partNumero.length > 0 && !/^\d+$/.test(partNumero)) || (partUnidade && !['Kg', 'g'].includes(partUnidade))) return;
        valorProcessado = valor;
        break;

      case 'VARIAVEL_TITULO':
        valorProcessado = String(valor).replace(/[^\p{L}\s]/gu, '').toUpperCase();
        break;

      case 'VARIAVEL_INDICADO':
        valorProcessado = String(valor).replace(/[0-9]/g, '').slice(0, 35);
        break;

      // case 'VARIAVEL_BARRAS':
      //  valorProcessado = "2" + nomeArquivo + "3";
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
    setEtiquetas(prev => prev.map(etiqueta => ({
      ...etiqueta,
      valor: ''
    })));
  };

  const copiarDados = useCallback(() => {
    setEtiquetas(prev => prev.map(etiqueta => {
      if (CAMPOS_MANTER_COPIA.has(etiqueta.id)) {
        return { ...etiqueta };
      }

      return { ...etiqueta, valor: '' };
    }));

    setEtiquetaSelecionadaId('');
    setEtiquetaEmEdicao(null);
    setEtiquetaParaExcluir(null);
    setMostrarConfirmacao(false);
  }, []);

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
                onFiltroChange={(e) => setFiltro(e.target.value)}
                carregandoLista={carregandoLista}
                etiquetaSelecionadaId={etiquetaSelecionadaId}
                onSelecionarEtiqueta={aoSelecionarEtiqueta}
                etiquetasAgrupadas={etiquetasAgrupadas}
                onExcluirSelecionada={() => {
                  setEtiquetaParaExcluir(etiquetaSelecionadaId);
                  setMostrarConfirmacao(true);
                }}
                onVoltar={onVoltar}
                onSalvar={salvarEtiqueta}
                codigoProdutoValido={codigoProdutoValido}
                formularioValido={formularioValido}
                etiquetaEmEdicao={etiquetaEmEdicao}
                limparDados={limparDados}
                cancelarTudo={resetarParaEstadoInicial}
                onCopiarDados={copiarDados}
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
            <p><strong>{etiquetaSelecionada ? `${etiquetaSelecionada.nome} / ${obterTituloDaEtiqueta(etiquetaSelecionada)} / ${obterPesoDaEtiqueta(etiquetaSelecionada)}` : '' }</strong></p>
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
                {excluindo ? 'Excluindo' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EditarEtiqueta;

