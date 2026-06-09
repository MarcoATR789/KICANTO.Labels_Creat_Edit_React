# Etiquetas - KICANTO:

Sistema para criar, editar e imprimir etiquetas em ZPL. O projeto tem frontend em React, backend em Node.js / Express, banco MySQL e scripts auxiliares para PM2 e backup do banco.

## Tecnologias:

- React: usando `react-scripts`.
- Node.js: com `Express`.
- MySQL: usando `mysql2`.
- Impressão e envio dos dados ZPL por conexão TCP/IP com a impressora (Print Server).
- PM2 para manter o backend e o frontend rodando 24/7.

## Estrutura do projeto:

- `backend/`       API, autenticação, rotas de etiquetas e envio para impressora.
- `frontend/`      Aplicação React, Menus de edição / criação e templates ZPL.
- `scripts/`       Scripts de backup do MySQL e inicialização do PM2 no Windows.
- `bkp_database/`  Pasta usada para salvar backups gerados do banco.

## Pré-requisitos:

- `Node.js` instalado.
- `MySQL` instalado e rodando.
- Banco `etiquetas_db` criado.
- Banco `usuarios` criado.
- `PM2` instalado para rodar server local.
- Impressora Zebra ou compatível recebendo ZPL pelo Print Server.

## Instalação:

Instale as dependências do backend:
```bash
cd backend
npm install
```

Instale as dependências do frontend:
```bash
cd ../frontend
npm install
```

## Configuração:

Confira a conexão com o MySQL em `backend/db.js` e ajuste host, usuário, senha e banco conforme o servidor.

No frontend, a API é detectada automaticamente quando a tela roda na porta `3000`, apontando para a porta `3001` no mesmo host. Se precisar definir manualmente, use a variável:

```bash
REACT_APP_API_URL=http://IP_DO_SERVIDOR:3001
```

A impressora padrão fica configurada no backend. Também é possível usar as variáveis:
```bash
PRINTER_HOST=192.168.1.244
PRINTER_PORT=9100
```

## Rodando em desenvolvimento:

Backend:
```bash
cd backend
npm start
```

Frontend:
```bash
cd frontend
npm start
```

Endereços padrão:

- Frontend: `http://localhost:3000`.
- Backend: `http://localhost:3001/api/etiquetas`.

## Gerando build:
```bash
cd frontend
npm run build
```

O build final fica em `frontend/build`.

## Rodando com PM2:

Na raiz do projeto:
```bash
pm2 start ecosystem.config.cjs
pm2 save
```

O arquivo `ecosystem.config.cjs` sobe dois processos:

- etiquetas-api: backend na porta `3001`.
- etiquetas-frontend: frontend publicado na porta `3000`.

Para restaurar o PM2 antes do login no Windows, use os scripts em `scripts/` com PowerShell aberto como Administrador.

## Backup do banco:

O script abaixo gera backup do banco `etiquetas_db` na pasta `bkp_database`:
```bat
scripts\bkp_mysql_etiquetas_db.bat
```

Ele também remove backups `.sql` com mais de 7 dias. Os arquivos gerados nessa pasta são ignorados pelo Git para evitar subir dados do banco no repositório.

## Observações:

- Não versionar `node_modules`, `builds`, `logs`, `arquivos .env` e `backups SQL`.
- Manter `package-lock.json` versionado para repetir a instalação das dependências.
- Conferir IP do servidor, banco e impressora antes de publicar em outro computador.
