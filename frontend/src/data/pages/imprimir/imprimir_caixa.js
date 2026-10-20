// IMPORTA OS HOOKS NECESSÁRIOS DO REACT E OUTROS MÓDULOS.
import { useState, useEffect, useCallback } from 'react';
import API_BASE_URL from '../../../config/apiBase';
import { PRINTER_HOST, PRINTER_PORT } from '../../../config/printer';
import '../../css/pages.css';
import baseTemplate from '../../zpl/base_etiqueta_caixa.zpl';

// MAPEIA OS NOMES INTERNOS DAS VARIÁVEIS PARA NOMES AMIGÁVEIS EXIBIDOS NA INTERFACE.
const LABEL_NAMES = {
  'VARIAVEL_DATA': 'DATA DE FABRICAÇÃO:',
  'PRAZO_VALIDADE': 'PRAZO DE VALIDADE:',
  'VARIAVEL_VALIDADE': 'DATA DE VALIDADE:',
  'VARIAVEL_LOTE': 'LOTE:',
};

// CONFIGURAÇÕES PARA A API DO LABELARY, USADA PARA GERAR A PRÉ-VISUALIZAÇÃO DA ETIQUETA.
const LABELARY_API_CONFIG = {
  DPI: '8dpmm',
  LARGURA: '3.9',
  ALTURA: '1.6',
  INDICE: '0',
};

// CONSTRÓI A URL DA API DO LABELARY PARA OBTER A IMAGEM DE PRÉ-VISUALIZAÇÃO.
const obterUrlLabelary = (zplCodificado) => {
  const { DPI, LARGURA, ALTURA, INDICE } = LABELARY_API_CONFIG;
  return `https://api.labelary.com/v1/printers/${DPI}/labels/${LARGURA}x${ALTURA}/${INDICE}/${zplCodificado}`;
};

// FUNÇÃO PARA CALCULAR O DIA DO ANO PARA UMA DATA DADA.
const obterDiaDoAno = (data) => {
  const inicio = Date.UTC(data.getFullYear(), 0, 0);
  const diferenca = Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()) - inicio;
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
        {Object.keys(LABEL_NAMES).map(id => etiquetas.find(etiqueta => etiqueta.id === id))
          .filter(Boolean)
          .map(etiqueta => (
            <tr key={etiqueta.id}>
              <td>{LABEL_NAMES[etiqueta.id] || etiqueta.nome}</td>
              <td>
                <input
                  type="text"
                  aria-label={LABEL_NAMES[etiqueta.id]}
                  inputMode={['VARIAVEL_DATA', 'PRAZO_VALIDADE'].includes(etiqueta.id) ? 'numeric' : undefined}
                  pattern={etiqueta.id === 'PRAZO_VALIDADE' ? '[0-9]*' : undefined}
                  value={etiqueta.valor}
                  readOnly={['VARIAVEL_VALIDADE', 'VARIAVEL_LOTE'].includes(etiqueta.id)}
                  onChange={(e) => MudarEtiqueta(etiqueta.id, e.target.value)}
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

// COMPONENTE QUE EXIBE A IMAGEM DE PRÉ-VISUALIZAÇÃO DA ETIQUETA.
const ImagemPreview = ({ src }) => (
  src && <img src={src} className="label-preview" alt="Prévia da etiqueta" />
);

// COMPONENTE QUE RENDERIZA OS BOTÕES DE AÇÃO.
const BtnAction = ({
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
        <div className="filtro-titulo">DADOS DA CAIXA</div>
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
        title={imprimirDisabled ? 'Informe a fabricação, o prazo de validade e a quantidade para imprimir.' : 'Enviar etiqueta para impressora.'}
      >
        IMPRIMIR
      </button>
    </div>
  </>
);

function ImprimirCaixa({ onVoltar }) {
  // ESTADOS DO COMPONENTE
  const [etiquetas, setEtiquetas] = useState([]);
  const [conteudoArquivo, setConteudoArquivo] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [imprimindo, setImprimindo] = useState(false);
  const [imagemPreview, setImagemPreview] = useState('');
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

  // FUNÇÃO PARA EXTRAIR AS VARIÁVEIS DO CONTEÚDO DO ARQUIVO ZPL.
  const extrairVariaveis = useCallback((conteudo) => {
    const regex = /\{(\w+)\}/g;
    const correspondencias = [...new Set([...conteudo.matchAll(regex)].map(m => m[1]))];
    return correspondencias.map(nome => ({ id: nome, nome, valor: '' }));
  }, []);

  const criarCamposIniciais = useCallback((conteudo) => {
    const hojeStr = formatarDataBR(new Date());
    return [
      ...extrairVariaveis(conteudo).map(etiqueta => (
        etiqueta.id === 'VARIAVEL_DATA' ? { ...etiqueta, valor: hojeStr } : etiqueta
      )),
      { id: 'PRAZO_VALIDADE', nome: 'PRAZO_VALIDADE', valor: '' },
    ];
  }, [extrairVariaveis]);

  // FUNÇÃO PARA RESETAR O FORMULÁRIO PARA O ESTADO INICIAL.
  const resetarParaEstadoInicial = useCallback(() => {
    setErro('');
    setSucesso('');
    setQuantidadeImpressao(1);
    setEtiquetas(criarCamposIniciais(conteudoArquivo));
    setImagemPreview('');
  }, [conteudoArquivo, criarCamposIniciais]);

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
        if (!resposta.ok) throw new Error('Arquivo base não carregado.');
        const conteudo = await resposta.text();
        setConteudoArquivo(conteudo);
        setEtiquetas(criarCamposIniciais(conteudo));
      } catch (erro_) {
        setErro('ERRO AO CARREGAR O ARQUIVO DE TEMPLATE.');
        console.error(erro_);
      }
    };

    carregarArquivoBase();
  }, [criarCamposIniciais]);

  // FUNÇÃO MEMORIZADA PARA PROCESSAR O CONTEÚDO, SUBSTITUINDO AS VARIÁVEIS PELOS VALORES DO USUÁRIO.
  const obterConteudoProcessado = useCallback(() => {
    return etiquetas.reduce((acc, etiqueta) =>
      acc.replaceAll(`{${etiqueta.nome}}`, etiqueta.valor),
      conteudoArquivo
    );
  }, [etiquetas, conteudoArquivo]);

  // EFEITO PARA ATUALIZAR A PRÉ-VISUALIZAÇÃO DA ETIQUETA QUANDO OS DADOS MUDAM.
  useEffect(() => {
    if (!conteudoArquivo) {
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
  }, [obterConteudoProcessado, conteudoArquivo]);

  // FUNÇÃO PARA LIDAR COM A MUDANÇA NOS CAMPOS DE INPUT.
  const aoMudarCampo = useCallback((id, valor) => {
    if (!['VARIAVEL_DATA', 'PRAZO_VALIDADE'].includes(id)) return;
    const valorProcessado = id === 'VARIAVEL_DATA'
      ? mascararDataDigitada(valor)
      : valor.replace(/\D/g, '').slice(0, 3);

    setEtiquetas(prev => recalcularCamposCalculados(
      prev.map(etiqueta =>
        etiqueta.id === id ? { ...etiqueta, valor: valorProcessado } : etiqueta
      )
    ));
  }, []);

  // LIMPA O PRAZO E OS CAMPOS CALCULADOS, MANTENDO A FABRICAÇÃO.
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
  const dataFabricacaoFiltro = Boolean(obterDataFabricacaoDaLista(etiquetas));
  const prazoValidadeFiltro = Number.isInteger(prazoValidadeDias) && prazoValidadeDias > 0 && prazoValidadeDias <= 999;
  const quantidadeImpressaoNumero = Number.parseInt(quantidadeImpressao, 10);
  const quantidadeImpressaoFiltro = Number.isInteger(quantidadeImpressaoNumero) && quantidadeImpressaoNumero > 0 && quantidadeImpressaoNumero <= 999;

  const imprimirEtiqueta = async () => {
    setErro('');
    setSucesso('');

    if (!prazoValidadeFiltro) {
      setErro('Informe o prazo de validade para imprimir.');
      return;
    }

    if (!dataFabricacaoFiltro) {
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
                imprimirDisabled={!prazoValidadeFiltro || !dataFabricacaoFiltro || !quantidadeImpressaoFiltro || !conteudoArquivo || imprimindo}
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
    </div>
  );
}

export default ImprimirCaixa;
