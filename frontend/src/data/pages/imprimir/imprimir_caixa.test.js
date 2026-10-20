import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import ImprimirCaixa from './imprimir_caixa';
import baseTemplate from '../../zpl/base_etiqueta_caixa.zpl';
import { PRINTER_HOST, PRINTER_PORT } from '../../../config/printer';

const template = readFileSync(resolve(__dirname, '../../zpl/base_etiqueta_caixa.zpl'), 'utf8');
const cadastro = (id, nome, titulo, peso) => ({
  id,
  nome,
  dados: [
    { id: 'VARIAVEL_TITULO', valor: titulo },
    { id: 'VARIAVEL_PESO', valor: peso },
    { id: 'VARIAVEL_COMPOSICAO', valor: 'Composição cadastrada' },
  ],
});
const etiquetaMenor = cadastro(2, '390222', 'RAÇÃO', '250g');
const registros = [
  cadastro(1, '390111', 'ALPISTE', '500g'),
  { ...etiquetaMenor, dados: JSON.stringify(etiquetaMenor.dados) },
  cadastro(3, '390333', 'ALPISTE', '5Kg'),
  cadastro(4, 'MILHO', 'MATÉRIA PRIMA', '500g'),
  cadastro(5, '390555', 'SEM PESO', ''),
  cadastro(6, '390666', 'MAIOR', '501g'),
];
const fetchOriginal = global.fetch;

beforeEach(() => {
  global.fetch = jest.fn(async (url) => {
    if (url === baseTemplate) return { ok: true, text: async () => template };
    if (url.endsWith('/api/etiquetas')) return { ok: true, json: async () => registros };
    if (url.endsWith('/api/print')) return { ok: true, json: async () => ({}) };
    throw new Error(`Requisição inesperada: ${url}`);
  });
});

afterEach(() => {
  global.fetch = fetchOriginal;
});

const abrirEtiqueta = async () => {
  render(<ImprimirCaixa onVoltar={jest.fn()} />);
  const select = await screen.findByRole('combobox');
  await waitFor(() => expect(within(select).getAllByRole('option')).toHaveLength(3));
  fireEvent.change(select, { target: { value: '1' } });
  return select;
};

const preencherDatas = (fabricacao = '13102026', prazo = '30') => {
  fireEvent.change(screen.getByLabelText('DATA DE FABRICAÇÃO:'), { target: { value: fabricacao } });
  fireEvent.change(screen.getByLabelText('PRAZO DE VALIDADE:'), { target: { value: prazo } });
};

test('lista somente os cadastros de até 500g, sem variações, e pesquisa título ou código', async () => {
  const select = await abrirEtiqueta();
  expect(within(select).getAllByRole('option').map(option => option.textContent)).toEqual([
    'Selecionar uma etiqueta', '390111 / 500g', '390222 / 250g',
  ]);

  fireEvent.click(screen.getByRole('button', { name: '390111 / 500g v' }));
  const menu = screen.getByRole('listbox');
  expect(within(menu).getAllByRole('option')).toHaveLength(2);
  expect(menu).not.toHaveTextContent(/1x|10x/);
  fireEvent.click(within(menu).getByRole('option', { name: '390222 / 250g' }));
  expect(select).toHaveValue('2');

  fireEvent.change(screen.getByPlaceholderText('Pesquisar'), { target: { value: 'racao' } });
  expect(within(select).getAllByRole('option').map(option => option.value)).toEqual(['', '2']);
  fireEvent.change(screen.getByPlaceholderText('Pesquisar'), { target: { value: '390111' } });
  expect(within(select).getAllByRole('option').map(option => option.value)).toEqual(['', '1']);
});

test('calcula validade e lote, aceita apagar o prazo e bloqueia datas inválidas', async () => {
  await abrirEtiqueta();
  expect(screen.getByLabelText('DATA DE FABRICAÇÃO:')).toHaveValue(new Date().toLocaleDateString('pt-BR'));
  expect(screen.getAllByRole('row')).toHaveLength(5);
  expect(screen.queryByText('PESO:')).not.toBeInTheDocument();
  expect(screen.queryByText('COMPOSIÇÃO:')).not.toBeInTheDocument();
  const imprimir = screen.getByRole('button', { name: 'IMPRIMIR' });
  expect(imprimir).toBeDisabled();

  preencherDatas('29022024', '1');
  expect(screen.getByLabelText('DATA DE FABRICAÇÃO:')).toHaveValue('29/02/2024');
  expect(screen.getByLabelText('DATA DE VALIDADE:')).toHaveValue('01/03/2024');
  expect(screen.getByLabelText('LOTE:')).toHaveValue('24.060');
  expect(imprimir).toBeEnabled();

  preencherDatas('31122026', '1');
  expect(screen.getByLabelText('DATA DE VALIDADE:')).toHaveValue('01/01/2027');
  expect(screen.getByLabelText('LOTE:')).toHaveValue('26.365');

  for (const prazo of ['', '0']) {
    fireEvent.change(screen.getByLabelText('PRAZO DE VALIDADE:'), { target: { value: prazo } });
    expect(screen.getByLabelText('PRAZO DE VALIDADE:')).toHaveValue(prazo);
    expect(screen.getByLabelText('DATA DE VALIDADE:')).toHaveValue('');
    expect(screen.getByLabelText('LOTE:')).toHaveValue('');
    expect(imprimir).toBeDisabled();
  }

  preencherDatas('31022026');
  expect(imprimir).toBeDisabled();
  expect(screen.getByLabelText('LOTE:')).toHaveValue('');
  preencherDatas();
  expect(imprimir).toBeEnabled();
});

test('envia o mesmo ZPL da prévia, somente com datas e lote, na quantidade solicitada', async () => {
  await abrirEtiqueta();
  preencherDatas();
  const quantidade = screen.getByLabelText('Quantidade de etiquetas');
  fireEvent.change(quantidade, { target: { value: '' } });
  expect(screen.getByRole('button', { name: 'IMPRIMIR' })).toBeDisabled();
  fireEvent.change(quantidade, { target: { value: '2' } });

  const esperado = template
    .replaceAll('{VARIAVEL_DATA}', '13/10/2026')
    .replaceAll('{VARIAVEL_VALIDADE}', '12/11/2026')
    .replaceAll('{VARIAVEL_LOTE}', '26.286');
  await waitFor(() => {
    const url = screen.getByRole('img', { name: 'Prévia da etiqueta' }).getAttribute('src');
    expect(decodeURIComponent(url.split('/0/')[1])).toBe(esperado);
  });

  fireEvent.click(screen.getByRole('button', { name: 'IMPRIMIR' }));
  await screen.findByText('2 etiquetas enviadas para impressão.');
  const envios = global.fetch.mock.calls.filter(([url]) => url.endsWith('/api/print'));
  expect(envios).toHaveLength(1);
  expect(JSON.parse(envios[0][1].body)).toEqual({
    zpl: `${esperado}\n${esperado}`,
    host: PRINTER_HOST,
    port: PRINTER_PORT,
  });
  expect(esperado).not.toMatch(/\{VARIAVEL_/);
});

test('limpa cálculos, reinicia ao trocar etiqueta e cancela seleção e prévia', async () => {
  const select = await abrirEtiqueta();
  preencherDatas();
  fireEvent.click(screen.getByRole('button', { name: 'LIMPAR DADOS' }));
  expect(select).toHaveValue('1');
  expect(screen.getByLabelText('PRAZO DE VALIDADE:')).toHaveValue('');
  expect(screen.getByLabelText('LOTE:')).toHaveValue('');
  expect(screen.getByRole('button', { name: 'IMPRIMIR' })).toBeDisabled();

  preencherDatas();
  fireEvent.change(select, { target: { value: '2' } });
  expect(screen.getByLabelText('PRAZO DE VALIDADE:')).toHaveValue('');
  expect(screen.getByLabelText('LOTE:')).toHaveValue('');
  preencherDatas();
  await screen.findByRole('img', { name: 'Prévia da etiqueta' });
  fireEvent.click(screen.getByRole('button', { name: 'CANCELAR' }));
  expect(select).toHaveValue('');
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Quantidade de etiquetas')).toHaveValue('1');
  expect(screen.getByRole('button', { name: 'IMPRIMIR' })).toBeDisabled();
});
