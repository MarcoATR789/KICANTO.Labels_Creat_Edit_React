import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import API_BASE_URL from '../../../config/apiBase';
import { PRINTER_HOST, PRINTER_PORT } from '../../../config/printer';
import '../../css/pages.css';
import FiltroEtiquetaSelect from '../filtro_etiqueta_select.js';

const LABEL_NAMES = {
  'VARIAVEL_DATA': 'DATA DE FABRICAÇÃO:',
  'PRAZO_VALIDADE': 'PRAZO DE VALIDADE:',
};

const CAMPOS_FIXOS = [
  'VARIAVEL_DATA',
  'PRAZO_VALIDADE',
  'VARIAVEL_VALIDADE',
  'VARIAVEL_LOTE',
];

const LABELARY_API_CONFIG = {
  pellet: {
    DPI: '8dpmm',
    LARGURA: '3.34646',
    ALTURA: '5.82677',
    INDICE: '0',
  },
  pellet_20: {
    DPI: '8dpmm',
    LARGURA: '3.14961',
    ALTURA: '5.23622',
    INDICE: '0',
  },
  hamster: {
    DPI: '8dpmm',
    LARGURA: '3.14961',
    ALTURA: '5.23622',
    INDICE: '0',
  },
};

const LABELARY_API_CONFIG_PADRAO = LABELARY_API_CONFIG.hamster;

const GRUPOS_TEMPLATES_EXCESSO = {
  hamster: {
    nome: 'HAMSTER',
    labelaryConfig: LABELARY_API_CONFIG.hamster,
  },
  pellet: {
    nome: 'PELLET C.R.',
    labelaryConfig: LABELARY_API_CONFIG.pellet,
  },
  pellet_20: {
    nome: 'PELLET C.R. - 20Kg',
    labelaryConfig: LABELARY_API_CONFIG.pellet_20,
  },
};

const GRUPO_TEMPLATES_EXCESSO_PADRAO = 'EXCESSO';

const LABEL_NAMES_ZPL = {
  'pellet_500g.zpl': 'PELLET C.R. - 500g',
  'pellet_5kg.zpl': 'PELLET C.R. - 5Kg',
  'pellet_20kg.zpl': 'PELLET C.R. - 20Kg',
  'pellet_20kg_sif.zpl': 'PELLET C.R. - 20Kg (SIF)',
  'hamster_500g.zpl': 'HAMSTER - 500g',
  'hamster_5kg.zpl': 'HAMSTER - 5Kg',
  'hamster_20kg.zpl': 'HAMSTER - 20Kg',
  'hamster_20kg_sif.zpl':'HAMSTER - 20Kg (SIF)',
};

const LABEL_SEM_OPTION = {
  'pellet_20kg_sif.zpl': 'PELLET C.R. - 20Kg (SIF)',
  'hamster_20kg_sif.zpl':'HAMSTER - 20Kg (SIF)',
};

const contextoTemplatesExcesso = require.context('../../zpl/excesso', true, /\.zpl$/);

const obterArquivoDoModulo = (modulo) => (
  typeof modulo === 'string' ? modulo : modulo.default
);

const TEMPLATES_EXCESSO = contextoTemplatesExcesso.keys()
  .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
  .map(caminho => {
    const caminhoArquivo = caminho.replace('./', '');
    const partesCaminho = caminhoArquivo.split('/');
    const pasta = partesCaminho.length > 1 ? partesCaminho[0] : '';
    const nomeArquivo = partesCaminho[partesCaminho.length - 1];
    const grupo = GRUPOS_TEMPLATES_EXCESSO[pasta];

    return {
      id: caminhoArquivo,
      nome: LABEL_NAMES_ZPL[nomeArquivo] || nomeArquivo,
      arquivo: obterArquivoDoModulo(contextoTemplatesExcesso(caminho)),
      grupo: grupo?.nome || GRUPO_TEMPLATES_EXCESSO_PADRAO,
      labelaryConfig: grupo?.labelaryConfig || LABELARY_API_CONFIG_PADRAO,
    };
  });

const obterTemplateExcesso = (id) => TEMPLATES_EXCESSO.find(item => item.id === id);

const obterEndpointLabelary = (config = LABELARY_API_CONFIG_PADRAO) => {
  const { DPI, LARGURA, ALTURA, INDICE } = config;
  return `https://api.labelary.com/v1/printers/${DPI}/labels/${LARGURA}x${ALTURA}/${INDICE}/`;
};

const obterDiaDoAno = (data) => {
  const inicio = new Date(data.getFullYear(), 0, 0);
  const diferenca = data - inicio;
  const umDia = 1000 * 60 * 60 * 24;
  return Math.floor(diferenca / umDia);
};

const formatarDataBR = (data) => data.toLocaleDateString('pt-BR');

const interpretarDataBR = (valor) => {
  if (typeof valor !== 'string') return null;

  const correspondencia = valor.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!correspondencia) return null;

  const [, dia, mes, ano] = correspondencia;
  const data = new Date(Number(ano), Number(mes) - 1, Number(dia));

  if (
    Number.isNaN(data.getTime()) ||
    data.getDate() !== Number(dia) ||
    data.getMonth() !== Number(mes) - 1 ||
    data.getFullYear() !== Number(ano)
  ) {
    return null;
  }

  return data;
};

const mascararDataDigitada = (valor) => {
  const somenteNumeros = String(valor ?? '').replace(/\D/g, '').slice(0, 8);

  if (somenteNumeros.length <= 2) return somenteNumeros;
  if (somenteNumeros.length <= 4) {
    return `${somenteNumeros.slice(0, 2)}/${somenteNumeros.slice(2)}`;
  }

  return `${somenteNumeros.slice(0, 2)}/${somenteNumeros.slice(2, 4)}/${somenteNumeros.slice(4)}`;
};

const obterDataFabricacaoDaLista = (listaEtiquetas) => {
  const valorDataFabricacao = listaEtiquetas.find(etiqueta => etiqueta.id === 'VARIAVEL_DATA')?.valor;
  return interpretarDataBR(valorDataFabricacao);
};

const limparCamposCalculados = (listaEtiquetas) => (
  listaEtiquetas.map(etiqueta => {
    if (etiqueta.id === 'VARIAVEL_VALIDADE') return { ...etiqueta, valor: '' };
    if (etiqueta.id === 'VARIAVEL_LOTE') return { ...etiqueta, valor: '' };
    return etiqueta;
  })
);

const recalcularCamposCalculados = (listaEtiquetas) => {
  const prazoValor = listaEtiquetas.find(etiqueta => etiqueta.id === 'PRAZO_VALIDADE')?.valor || '';
  const prazoDias = Number.parseInt(prazoValor, 10);

  if (!Number.isInteger(prazoDias) || prazoDias < 1 || prazoDias > 999) {
    return limparCamposCalculados(listaEtiquetas);
  }

  const dataFabricacaoBase = obterDataFabricacaoDaLista(listaEtiquetas);
  if (!dataFabricacaoBase) return limparCamposCalculados(listaEtiquetas);

  const dataFabricacao = formatarDataBR(dataFabricacaoBase);
  const dataValidadeBase = new Date(dataFabricacaoBase);
  dataValidadeBase.setDate(dataValidadeBase.getDate() + prazoDias);

  const dataValidade = formatarDataBR(dataValidadeBase);
  const ano = dataFabricacaoBase.getFullYear().toString().slice(-2);
  const diaDoAno = obterDiaDoAno(dataFabricacaoBase).toString().padStart(3, '0');
  const lote = `${ano}.${diaDoAno}`;

  return listaEtiquetas.map(etiqueta => {
    if (etiqueta.id === 'VARIAVEL_DATA') return { ...etiqueta, valor: dataFabricacao };
    if (etiqueta.id === 'VARIAVEL_VALIDADE') return { ...etiqueta, valor: dataValidade };
    if (etiqueta.id === 'VARIAVEL_LOTE') return { ...etiqueta, valor: lote };
    return etiqueta;
  });
};

const dedupePorIdMantendoUltimo = (arr) =>
  Array.from(new Map(arr.map(x => [x.id, x])).values());

const normalizarTexto = (texto) => String(texto ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const obterValoresDasEtiquetas = (listaEtiquetas) => (
  listaEtiquetas.reduce((acc, etiqueta) => ({
    ...acc,
    [etiqueta.id]: etiqueta.valor,
  }), {})
);

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
          .filter(etiqueta => ['VARIAVEL_DATA', 'PRAZO_VALIDADE'].includes(etiqueta.id))
          .sort((a, b) => {
            const ordem = { VARIAVEL_DATA: 0, PRAZO_VALIDADE: 1 };
            return ordem[a.id] - ordem[b.id];
          })
          .map(etiqueta => (
            <tr key={etiqueta.id}>
              <td>{LABEL_NAMES[etiqueta.id] || etiqueta.nome}</td>
              <td>
                  <input
                    type="text"
                    inputMode={['VARIAVEL_DATA', 'PRAZO_VALIDADE'].includes(etiqueta.id) ? 'numeric' : undefined}
                    pattern={etiqueta.id === 'PRAZO_VALIDADE' ? '[0-9]*' : undefined}
                    value={etiqueta.valor}
                    onChange={(e) => {
                      if (etiqueta.id === 'PRAZO_VALIDADE') {
                        const somenteNumeros = e.target.value.replace(/\D/g, '').slice(0, 3);
                        MudarEtiqueta(etiqueta.id, somenteNumeros);
                        return;
                      }

                      MudarEtiqueta(etiqueta.id, e.target.value);
                    }}
                    placeholder={
                      etiqueta.id === 'PRAZO_VALIDADE'
                        ? 'Digite o número de dias.'
                        : etiqueta.id === 'VARIAVEL_DATA'
                          ? 'dia/mês/ano'
                          : ''
                    }
                  />
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  </div>
);

const ImagemPreview = ({ src }) => (
  src && <img src={src} className="label-preview" alt="Prévia da etiqueta" />
);

const BtnAction = ({
  filtro,
  onFiltroChange,
  templatesAgrupados,
  templateSelecionadoId,
  onSelecionarTemplate,
  quantidadeImpressao,
  onDiminuirQuantidade,
  onAumentarQuantidade,
  onMudarQuantidadeImpressao,
  limparDados,
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
        <div className="filtro-titulo">FILTRAR ETIQUETA</div>
        <div className="filtro-row">
          <div className="filtro-combo">
            <input
              className="filtro-input"
              placeholder="Pesquisar"
              value={filtro}
              onChange={onFiltroChange}
            />
            <FiltroEtiquetaSelect
              value={templateSelecionadoId}
              onChange={onSelecionarTemplate}
              grupos={templatesAgrupados}
              emptyText="Nenhum ZPL encontrado"
            />
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
        title={imprimirDisabled ? 'Selecione uma etiqueta e informe o prazo de validade para imprimir.' : 'Enviar etiqueta para impressora.'}
      >
        IMPRIMIR
      </button>
    </div>
  </>
);

function ImprimirExcesso({ onVoltar }) {
  const [etiquetas, setEtiquetas] = useState([]);
  const [conteudoArquivo, setConteudoArquivo] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [imprimindo, setImprimindo] = useState(false);
  const [imagemPreview, setImagemPreview] = useState('');
  const [filtro, setFiltro] = useState('');
  const [templateSelecionadoId, setTemplateSelecionadoId] = useState('');
  const [quantidadeImpressao, setQuantidadeImpressao] = useState(1);
  const imagemPreviewObjetoUrlRef = useRef('');

  const definirImagemPreview = useCallback((src) => {
    setImagemPreview(src);

    const objetoUrlAnterior = imagemPreviewObjetoUrlRef.current;
    if (objetoUrlAnterior && objetoUrlAnterior !== src) {
      URL.revokeObjectURL(objetoUrlAnterior);
    }

    imagemPreviewObjetoUrlRef.current = src?.startsWith('blob:') ? src : '';
  }, []);

  useEffect(() => () => {
    if (imagemPreviewObjetoUrlRef.current) {
      URL.revokeObjectURL(imagemPreviewObjetoUrlRef.current);
    }
  }, []);

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

  useEffect(() => {
    const validarLogin = async () => {
      try {
        const resposta = await fetch(`${API_BASE_URL}/api/auth/me`);
        if (!resposta.ok) return;
      } catch {
        setErro('ERRO AO VALIDAR LOGIN.');
      }
    };

    validarLogin();
  }, []);

  const extrairVariaveis = useCallback((conteudo) => {
    const regex = /\{(\w+)\}/g;
    const correspondencias = [...new Set([...conteudo.matchAll(regex)].map(m => m[1]))];
    return correspondencias.map(nome => ({ id: nome, nome, valor: '' }));
  }, []);

  const montarEtiquetasDoTemplate = useCallback((conteudo, valoresAtuais = {}) => {
    const idsExtraidos = extrairVariaveis(conteudo).map(etiqueta => etiqueta.id);
    const ids = [...new Set([...idsExtraidos, ...CAMPOS_FIXOS])];
    const hojeStr = formatarDataBR(new Date());

    const etiquetasBase = ids.map(id => {
      const valorAtual = valoresAtuais[id] ?? '';
      const valor = id === 'VARIAVEL_DATA' && !valorAtual ? hojeStr : valorAtual;

      return { id, nome: id, valor };
    });

    return recalcularCamposCalculados(dedupePorIdMantendoUltimo(etiquetasBase));
  }, [extrairVariaveis]);

  const carregarTemplate = useCallback(async (id, preservarDados = true) => {
    const template = obterTemplateExcesso(id);

    if (!template) {
      setConteudoArquivo('');
      setEtiquetas([]);
      definirImagemPreview('');
      return;
    }

    try {
      const resposta = await fetch(template.arquivo);
      const conteudo = await resposta.text();

      setConteudoArquivo(conteudo);
      setEtiquetas(prev => {
        const valoresAtuais = preservarDados ? obterValoresDasEtiquetas(prev) : {};
        return montarEtiquetasDoTemplate(conteudo, valoresAtuais);
      });
      setErro('');
    } catch (erro_) {
      setErro('ERRO AO CARREGAR O ARQUIVO DE TEMPLATE.');
      console.error(erro_);
    }
  }, [definirImagemPreview, montarEtiquetasDoTemplate]);

  useEffect(() => {
    if (!templateSelecionadoId) return;
    carregarTemplate(templateSelecionadoId);
  }, [templateSelecionadoId, carregarTemplate]);

  const resetarParaEstadoInicial = useCallback(() => {
    // VOLTA O SELECT PARA "Selecionar uma etiqueta"
    setTemplateSelecionadoId('');
    setConteudoArquivo('');
    setErro('');
    setSucesso('');
    setImprimindo(false);
    setQuantidadeImpressao(1);
    setEtiquetas([]);
    definirImagemPreview('');
  }, [definirImagemPreview]);

  const aoSelecionarTemplate = (id) => {
    setTemplateSelecionadoId(id);

    if (!id) {
      setConteudoArquivo('');
      setEtiquetas([]);
      definirImagemPreview('');
    }
  };

  const onFiltroChange = (e) => setFiltro(e.target.value);
  const onSelecionarTemplate = (id) => aoSelecionarTemplate(id);
  const aoMudarQuantidadeImpressao = useCallback((valor) => {
    const somenteNumeros = String(valor ?? '').replace(/\D/g, '').slice(0, 3);

    if (!somenteNumeros) {
      setQuantidadeImpressao('');
      return;
    }

    setQuantidadeImpressao(Number(somenteNumeros));
  }, []);

  const obterConteudoProcessado = useCallback(() => {
    return etiquetas.reduce((acc, etiqueta) =>
      acc.replaceAll(`{${etiqueta.nome}}`, etiqueta.valor),
      conteudoArquivo
    );
  }, [etiquetas, conteudoArquivo]);

  useEffect(() => {
    if (!templateSelecionadoId) {
      definirImagemPreview('');
      return undefined;
    }

    const controlador = new AbortController();

    const temporizadorDebounce = setTimeout(async () => {
      const conteudo = obterConteudoProcessado();
      if (!conteudo) {
        definirImagemPreview('');
        return;
      }

      const template = obterTemplateExcesso(templateSelecionadoId);

      try {
        const resposta = await fetch(obterEndpointLabelary(template?.labelaryConfig), {
          method: 'POST',
          headers: {
            Accept: 'image/png',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: conteudo,
          signal: controlador.signal,
        });

        if (!resposta.ok) {
          const mensagem = await resposta.text().catch(() => '');
          throw new Error(mensagem || `Labelary retornou HTTP ${resposta.status}.`);
        }

        const blob = await resposta.blob();
        if (controlador.signal.aborted) return;

        definirImagemPreview(URL.createObjectURL(blob));
        setErro('');
      } catch (erro_) {
        if (controlador.signal.aborted) return;

        definirImagemPreview('');
        setErro('ERRO AO GERAR A PRÉVIA DA ETIQUETA.');
        console.error(erro_);
      }
    }, 300);

    return () => {
      controlador.abort();
      clearTimeout(temporizadorDebounce);
    };
  }, [definirImagemPreview, obterConteudoProcessado, templateSelecionadoId]);

  const aoMudarCampo = useCallback((id, valor) => {
    let valorProcessado = valor;

    switch (id) {
      case 'VARIAVEL_DATA': {
        valorProcessado = mascararDataDigitada(valor);

        setEtiquetas(prev => recalcularCamposCalculados(
          prev.map(etiqueta =>
            etiqueta.id === id ? { ...etiqueta, valor: valorProcessado } : etiqueta
          )
        ));
        return;
      }

      case 'PRAZO_VALIDADE': {
        valorProcessado = valor.replace(/\D/g, '').slice(0, 3);

        if (valorProcessado !== '') {
          const dias = parseInt(valorProcessado, 10);
          if (isNaN(dias) || dias < 1 || dias > 999) return;
        }

        setEtiquetas(prev => recalcularCamposCalculados(
          prev.map(etiqueta =>
            etiqueta.id === id ? { ...etiqueta, valor: valorProcessado } : etiqueta
          )
        ));
        return;
      }

      default:
        break;
    }

    setEtiquetas(prev => prev.map(etiqueta =>
      etiqueta.id === id ? { ...etiqueta, valor: valorProcessado } : etiqueta
    ));
  }, []);

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

  const templatesFiltrados = useMemo(() => {
    const termo = normalizarTexto(filtro).trim();

    if (!termo) return TEMPLATES_EXCESSO;

    return TEMPLATES_EXCESSO.filter(item => {
      const nome = normalizarTexto(item.nome);
      const arquivo = normalizarTexto(item.id);
      return nome.includes(termo) || arquivo.includes(termo);
    });
  }, [filtro]);

  const templatesAgrupados = useMemo(() => {
    const grupos = {};
    templatesFiltrados.forEach(item => {
      const grupo = item.grupo || GRUPO_TEMPLATES_EXCESSO_PADRAO;
      if (!grupos[grupo]) grupos[grupo] = [];
      grupos[grupo].push(item);
    });
    return grupos;
  }, [templatesFiltrados]);

  const prazoValidadeValor = etiquetas.find(e => e.id === 'PRAZO_VALIDADE')?.valor || '';
  const prazoValidadeDias = parseInt(prazoValidadeValor, 10);
  const dataFabricacaoFiltro = Boolean(obterDataFabricacaoDaLista(etiquetas));
  const templateSelecionadoFiltro = Boolean(obterTemplateExcesso(templateSelecionadoId));
  const nomeArquivoSelecionado = templateSelecionadoId.split('/').pop();
  const templateSemOption = Boolean(LABEL_SEM_OPTION[nomeArquivoSelecionado]);
  const prazoValidadeFiltro = Number.isInteger(prazoValidadeDias) && prazoValidadeDias > 0 && templateSelecionadoFiltro;
  const quantidadeImpressaoNumero = Number.parseInt(quantidadeImpressao, 10);
  const quantidadeImpressaoFiltro = Number.isInteger(quantidadeImpressaoNumero) && quantidadeImpressaoNumero > 0 && quantidadeImpressaoNumero <= 999;

  const imprimirEtiqueta = async () => {
    setErro('');
    setSucesso('');

    if (!templateSelecionadoFiltro) {
      setErro('Selecione uma etiqueta para imprimir.');
      return;
    }

    if (!templateSemOption && !prazoValidadeFiltro) {
      setErro('Informe o prazo de validade para imprimir.');
      return;
    }

    if (!templateSemOption && !dataFabricacaoFiltro) {
      setErro('Informe uma data de fabricação válida no formato dd/mm/aaaa.');
      return;
    }

    if (!quantidadeImpressaoFiltro) {
      setErro('Informe uma quantidade válida para imprimir.');
      return;
    }

    if (!conteudoArquivo) {
      setErro('Arquivo base não carregado.');
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

  const existemTemplates = TEMPLATES_EXCESSO.length > 0;

  return (
    <div className="App">
      <main className="App-main">
        <div className="content-wrapper">
          {erro && <div className="alert alert-error">{erro}</div>}
          {sucesso && <div className="alert alert-success">{sucesso}</div>}

          {existemTemplates && (
            <>
              <BtnAction
                filtro={filtro}
                onFiltroChange={onFiltroChange}
                templatesAgrupados={templatesAgrupados}
                templateSelecionadoId={templateSelecionadoId}
                onSelecionarTemplate={onSelecionarTemplate}
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
                limparDados={limparDados}
                onVoltar={onVoltar}
                onImprimir={imprimirEtiqueta}
                onCancelar={resetarParaEstadoInicial}
                imprimirDisabled={(!templateSemOption && (!prazoValidadeFiltro || !dataFabricacaoFiltro)) ||!quantidadeImpressaoFiltro || imprimindo}
              />

              {etiquetas.length > 0 && !templateSemOption && (
                <div className="tabelas-section">
                  <h2>ITENS PARA SUBSTITUIÇÃO:</h2>
                  <FormularioEtiqueta etiquetas={etiquetas} MudarEtiqueta={aoMudarCampo} />
                </div>
              )}
            </>
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

export default ImprimirExcesso;
