import EditarEtiqueta from './etiquetas/editar_etiqueta.js';
import EditarMateriaPrima from './etiquetas/editar_materia_prima.js';
import ImprimirLote from './imprimir/imprimir_composicao.js';
import ImprimirColunas from './imprimir/imprimir_colunas.js';
import ImprimirMateriaPrima from './imprimir/imprimir_materia_prima.js';
import ImprimirExcesso from './imprimir/imprimir_excesso.js';

const abas = [
  {
    id: 'editar-etiqueta',
    nome: 'EDITAR / CRIAR\nCOMPOSIÇÃO',
    descricao: 'Criar e Manipular Etiquetas.',
    componente: EditarEtiqueta
  },
  {
    id: 'editar-materia-prima',
    nome: 'EDITAR / CRIAR\nMATÉRIA PRIMA',
    descricao: 'Criar e Manipular Matéria Prima.',
    componente: EditarMateriaPrima
  },
  {
    id: 'imprimir-lote',
    nome: 'IMPRIMIR COMPOSIÇÃO',
    descricao: 'Impressão de Etiqueta com Lote.',
    componente: ImprimirLote
  },
  {
    id: 'imprimir-materia-prima',
    nome: 'IMPRIMIR\nMATÉRIA PRIMA',
    descricao: 'Impressão de Matéria Prima.',
    componente: ImprimirMateriaPrima
  },
  {
    id: 'imprimir-colunas',
    nome: 'IMPRIMIR COLUNAS\n4X1',
    descricao: 'Impressão com 4 Colunas sem Lote.',
    componente: ImprimirColunas
  },
  {
    id: 'etiquetas-excesso',
    nome: 'EXCESSO DE ETIQUETAS',
    descricao: 'Excesso de etiquetas com Lote.',
    componente: ImprimirExcesso
  }
];


export default abas;
