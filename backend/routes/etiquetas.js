const express = require('express');
const router = express.Router();
const db = require('../db');

// SALVAR ETIQUETA (não permitir duplicar "nome")
router.post('/', async (req, res) => {
  const { nome, etiquetas } = req.body;

  if (!nome) {
    return res.status(400).json({ message: 'Campo "nome" é obrigatório.' });
  }

  try {
    await db.query(
      'INSERT INTO etiquetas (nome, dados) VALUES (?, ?)',
      [nome, JSON.stringify(etiquetas ?? {})]
    );

    return res.status(201).json({ message: 'Etiqueta salva com sucesso' });
  } catch (err) {
    // Se houver UNIQUE(nome) no banco, cai aqui com ER_DUP_ENTRY
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Já existe uma etiqueta com esse CÓDIGO DO PRODUTO.' });
    }

    console.error(err);
    return res.status(500).json({ message: 'Erro ao salvar etiqueta' });
  }
});

// LISTAR ETIQUETAS
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM etiquetas ORDER BY id DESC');
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro ao listar etiquetas' });
  }
});

// CARREGAR ETIQUETA
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM etiquetas WHERE id = ? LIMIT 1', [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Etiqueta não encontrada' });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro ao carregar etiqueta' });
  }
});

// EDITAR ETIQUETA (não permitir trocar para um nome que já existe)
router.put('/:id', async (req, res) => {
  const { nome, etiquetas } = req.body;

  if (!nome) {
    return res.status(400).json({ message: 'Campo "nome" é obrigatório.' });
  }

  try {
    await db.query(
      'UPDATE etiquetas SET nome = ?, dados = ? WHERE id = ?',
      [nome, JSON.stringify(etiquetas ?? {}), req.params.id]
    );

    return res.json({ message: 'Etiqueta atualizada' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Já existe uma etiqueta com esse CÓDIGO DO PRODUTO.' });
    }

    console.error(err);
    return res.status(500).json({ message: 'Erro ao atualizar etiqueta' });
  }
});

// EXCLUIR ETIQUETA
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM etiquetas WHERE id = ?', [req.params.id]);
    return res.json({ message: 'Etiqueta excluída' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erro ao excluir etiqueta' });
  }
});

module.exports = router;