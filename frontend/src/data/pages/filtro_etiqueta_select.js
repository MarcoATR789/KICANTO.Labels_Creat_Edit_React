import { useEffect, useMemo, useRef, useState } from 'react';

const ordenarGrupos = (grupos) => (
  Object.entries(grupos || {})
    .sort(([a], [b]) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
);

function FiltroEtiquetaSelect({
  value,
  onChange,
  grupos,
  placeholder = 'Selecionar uma etiqueta',
  emptyText = 'Nenhuma etiqueta encontrada',
  getOptionValue = (item) => item.id,
  getOptionLabel = (item) => item.nome
}) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);

  const gruposOrdenados = useMemo(() => ordenarGrupos(grupos), [grupos]);

  const opcoes = useMemo(() => (
    gruposOrdenados.flatMap(([, itens]) =>
      itens.map(item => ({
        value: String(getOptionValue(item)),
        label: getOptionLabel(item)
      }))
    )
  ), [getOptionLabel, getOptionValue, gruposOrdenados]);

  const selecionada = opcoes.find(opcao => opcao.value === String(value));
  const textoSelecionado = selecionada?.label || placeholder;
  const semOpcoes = gruposOrdenados.length === 0;

  useEffect(() => {
    if (!aberto) return undefined;

    const fecharAoClicarFora = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setAberto(false);
      }
    };

    const fecharComEscape = (event) => {
      if (event.key === 'Escape') setAberto(false);
    };

    document.addEventListener('mousedown', fecharAoClicarFora);
    document.addEventListener('keydown', fecharComEscape);

    return () => {
      document.removeEventListener('mousedown', fecharAoClicarFora);
      document.removeEventListener('keydown', fecharComEscape);
    };
  }, [aberto]);

  const selecionar = (novoValor) => {
    onChange(novoValor);
    setAberto(false);
  };

  return (
    <>
      <select
        className="filtro-select filtro-select-native"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {semOpcoes && (
          <option value="" disabled>{emptyText}</option>
        )}

        {gruposOrdenados.map(([titulo, itens]) => (
          <optgroup key={titulo} label={titulo}>
            {itens.map(item => {
              const optionValue = String(getOptionValue(item));
              return (
                <option key={optionValue} value={optionValue}>
                  {getOptionLabel(item)}
                </option>
              );
            })}
          </optgroup>
        ))}
      </select>

      <div className="filtro-select-wrap" ref={ref}>
        <button
          type="button"
          className={`filtro-select filtro-select-button${value ? '' : ' filtro-select-placeholder'}`}
          onClick={() => setAberto(prev => !prev)}
          aria-haspopup="listbox"
          aria-expanded={aberto}
        >
          <span className="filtro-select-text">{textoSelecionado}</span>
          <span className="filtro-select-arrow">v</span>
        </button>

        {aberto && (
          <div className="filtro-select-menu" role="listbox">
            <button
              type="button"
              className="filtro-select-option filtro-select-option-placeholder"
              onClick={() => selecionar('')}
            >
              {placeholder}
            </button>

            {semOpcoes ? (
              <div className="filtro-select-empty">{emptyText}</div>
            ) : (
              gruposOrdenados.map(([titulo, itens]) => (
                <div className="filtro-select-group" key={titulo}>
                  <div className="filtro-select-group-label">{titulo}</div>
                  {itens.map(item => {
                    const optionValue = String(getOptionValue(item));
                    return (
                      <button
                        type="button"
                        key={optionValue}
                        className={`filtro-select-option${optionValue === String(value) ? ' is-selected' : ''}`}
                        onClick={() => selecionar(optionValue)}
                        role="option"
                        aria-selected={optionValue === String(value)}
                      >
                        {getOptionLabel(item)}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default FiltroEtiquetaSelect;
