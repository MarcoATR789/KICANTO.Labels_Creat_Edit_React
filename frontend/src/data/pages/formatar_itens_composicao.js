const PREFIXOS_ITENS_COMPOSICAO = {
  VARIAVEL_ID_1: '*',
  VARIAVEL_ID_2: '**',
  VARIAVEL_ID_3: '***',
  VARIAVEL_ID_4: '****',
};

const obterNomeCampo = (campo) => campo.nome || campo.id;

const formatarValorCampoComposicao = (campo) => {
  const nomeCampo = obterNomeCampo(campo);
  const valor = String(campo.valor ?? '');
  const prefixo = PREFIXOS_ITENS_COMPOSICAO[nomeCampo];

  if (!prefixo) return valor;

  const texto = valor.trim().replace(/^\*+\s*/, '');
  return texto ? `${prefixo}${texto}` : '';
};

export const substituirVariaveisComposicao = (conteudo, campos) => (
  campos.reduce((acc, campo) =>
    acc.replaceAll(`{${obterNomeCampo(campo)}}`, formatarValorCampoComposicao(campo)),
    conteudo
  )
);
