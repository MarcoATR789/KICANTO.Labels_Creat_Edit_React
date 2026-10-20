export const GARANTIAS_PADRAO = [
  {
    indice: 1,
    tituloId: 'VARIAVEL_GARANTIA_TITULO_1',
    pesoId: 'VARIAVEL_GARANTIA_PESO_1',
    titulo: 'Umidade (Máx.)',
    peso: '120g/kg'
  },
  {
    indice: 2,
    tituloId: 'VARIAVEL_GARANTIA_TITULO_2',
    pesoId: 'VARIAVEL_GARANTIA_PESO_2',
    titulo: 'Proteína Bruta (Min.)',
    peso: '130g/kg'
  },
  {
    indice: 3,
    tituloId: 'VARIAVEL_GARANTIA_TITULO_3',
    pesoId: 'VARIAVEL_GARANTIA_PESO_3',
    titulo: 'Extrato Etéreo (Min.)',
    peso: '35g/kg'
  },
  {
    indice: 4,
    tituloId: 'VARIAVEL_GARANTIA_TITULO_4',
    pesoId: 'VARIAVEL_GARANTIA_PESO_4',
    titulo: 'Fibra Bruta (Máx.)',
    peso: '80g/kg'
  },
  {
    indice: 5,
    tituloId: 'VARIAVEL_GARANTIA_TITULO_5',
    pesoId: 'VARIAVEL_GARANTIA_PESO_5',
    titulo: 'Matéria Mineral (Máx.)',
    peso: '50g/kg'
  },
  {
    indice: 6,
    tituloId: 'VARIAVEL_GARANTIA_TITULO_6',
    pesoId: 'VARIAVEL_GARANTIA_PESO_6',
    titulo: 'Cálcio (Máx.)',
    peso: '5mg/kg'
  },
  {
    indice: 7,
    tituloId: 'VARIAVEL_GARANTIA_TITULO_7',
    pesoId: 'VARIAVEL_GARANTIA_PESO_7',
    titulo: 'Cálcio (Min.)',
    peso: '0,2mg/kg'
  },
  {
    indice: 8,
    tituloId: 'VARIAVEL_GARANTIA_TITULO_8',
    pesoId: 'VARIAVEL_GARANTIA_PESO_8',
    titulo: 'Fósforo (Min.)',
    peso: '2mg/kg'
  }
];

const IDS_GARANTIA = new Set(
  GARANTIAS_PADRAO.flatMap(garantia => [garantia.tituloId, garantia.pesoId])
);

export const isCampoGarantia = (id) => IDS_GARANTIA.has(id);

export const obterCamposGarantiaPadrao = () => (
  GARANTIAS_PADRAO.flatMap(garantia => [
    {
      id: garantia.tituloId,
      nome: garantia.tituloId,
      valor: garantia.titulo
    },
    {
      id: garantia.pesoId,
      nome: garantia.pesoId,
      valor: garantia.peso
    }
  ])
);

export const aplicarGarantiasPadrao = (dados = [], preencherVazios = true) => {
  const lista = Array.isArray(dados)
    ? dados.map(campo => ({ ...campo }))
    : [];

  obterCamposGarantiaPadrao().forEach(campoPadrao => {
    const indiceExistente = lista.findIndex(campo => campo.id === campoPadrao.id);

    if (indiceExistente === -1) {
      lista.push(campoPadrao);
      return;
    }

    if (preencherVazios && !String(lista[indiceExistente].valor ?? '').trim()) {
      lista[indiceExistente] = {
        ...lista[indiceExistente],
        nome: lista[indiceExistente].nome || campoPadrao.nome,
        valor: campoPadrao.valor
      };
    }
  });

  return lista;
};
