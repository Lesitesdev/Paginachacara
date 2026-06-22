# Infinity Dreams

Site institucional e sistema de gestão para o **Espaço Infinity Dreams**, uma chácara para eventos, celebrações e hospedagem em Ribeirão Pires, São Paulo.

O projeto reúne uma página pública otimizada para conversão e SEO com um painel administrativo para gerenciamento de fotos, vídeos, disponibilidade e solicitações de clientes.

## Funcionalidades

### Página pública

- apresentação completa do espaço;
- galeria dinâmica de fotos;
- vídeo de apresentação;
- estrutura e comodidades;
- avaliações de clientes;
- agenda pública de disponibilidade;
- solicitação de reservas e eventos;
- integração com WhatsApp, Instagram, TikTok, Airbnb e Google Maps;
- layout responsivo para celular, tablet e computador;
- imagens carregadas de forma otimizada;
- acessibilidade validada pelo Lighthouse.

### Painel administrativo

- autenticação por usuário e senha;
- upload de fotos e vídeos;
- conversão automática de imagens para WebP;
- gerenciamento e exclusão de mídias;
- agenda com os estados disponível, em negociação, reservada e bloqueada;
- gerenciamento de solicitações recebidas;
- aprovação de uma solicitação com atualização automática da agenda;
- alteração segura da senha administrativa;
- painel responsivo.

### SEO e infraestrutura

- título e descrição voltados para buscas locais;
- Open Graph para compartilhamento em redes sociais;
- dados estruturados JSON-LD para estabelecimento e hospedagem;
- `robots.txt` dinâmico;
- `sitemap.xml` dinâmico;
- URL canônica baseada no domínio de produção;
- compressão HTTP;
- cabeçalhos básicos de segurança;
- banco SQLite em modo WAL;
- suporte a Docker e volumes persistentes.

## Tecnologias

- HTML5;
- CSS3;
- JavaScript;
- Node.js 22+;
- Express;
- SQLite;
- Multer;
- Sharp;
- Docker.

## Requisitos

- Node.js `22.5.0` ou superior;
- npm `10` ou superior.

O projeto utiliza o módulo nativo `node:sqlite`, disponível nas versões recentes do Node.js 22.

## Instalação

Clone o repositório e instale as dependências:

```bash
git clone URL_DO_REPOSITORIO
cd NOME_DO_REPOSITORIO
npm install
```

Inicie o servidor:

```bash
npm start
```

Acesse:

- site público: `http://localhost:3000`;
- painel administrativo: `http://localhost:3000/admin.html`.

## Credenciais iniciais

```text
Usuário: admin
Senha: Infinity@2026!
```

> Altere a senha imediatamente após o primeiro acesso em **Segurança → Alterar senha**.

As credenciais definidas por variáveis de ambiente são utilizadas apenas na criação inicial do banco. Depois disso, a senha armazenada no banco prevalece.

## Variáveis de ambiente

Use o arquivo `.env.example` como referência:

```env
PORT=3000
SITE_URL=https://seudominio.com.br
ADMIN_USER=admin
ADMIN_PASSWORD=uma-senha-forte
NODE_ENV=production
```

| Variável | Descrição |
|---|---|
| `PORT` | Porta utilizada pelo servidor. O padrão é `3000`. |
| `SITE_URL` | Domínio público utilizado no canonical, sitemap e robots. |
| `ADMIN_USER` | Usuário criado na primeira inicialização do banco. |
| `ADMIN_PASSWORD` | Senha criada na primeira inicialização do banco. |
| `NODE_ENV` | Use `production` para ativar o cookie seguro em HTTPS. |

O Node.js não carrega arquivos `.env` automaticamente neste projeto. Configure as variáveis diretamente no painel da hospedagem, Docker ou serviço de execução.

## Banco de dados e arquivos

Os dados persistentes ficam em:

```text
data/infinity-dreams.db
uploads/
```

- `data/` contém usuários, agenda e solicitações;
- `uploads/` contém fotos e vídeos enviados pelo painel.

Essas pastas não devem ser substituídas durante uma nova publicação. Configure armazenamento persistente e backups periódicos.

## Scripts disponíveis

```bash
npm start       # inicia o servidor
npm run dev     # inicia com reinicialização automática
npm run check   # verifica a sintaxe dos arquivos JavaScript
```

Para verificar dependências:

```bash
npm audit
```

## Publicação com Docker

Crie a imagem:

```bash
docker build -t infinity-dreams .
```

Execute o container:

```bash
docker run -d \
  --name infinity-dreams \
  -p 3000:3000 \
  -e SITE_URL=https://seudominio.com.br \
  -e ADMIN_USER=admin \
  -e ADMIN_PASSWORD='uma-senha-forte' \
  -v infinity_data:/app/data \
  -v infinity_uploads:/app/uploads \
  infinity-dreams
```

O domínio deve utilizar HTTPS. Configure um proxy reverso ou utilize o HTTPS fornecido pela plataforma de hospedagem.

## Estrutura resumida

```text
├── index.html              # página pública
├── app.js                  # integração pública com a API
├── admin.html              # painel administrativo
├── admin.css               # estilos do painel
├── admin.js                # comportamento do painel
├── server.js               # servidor, API e banco de dados
├── assets/                 # identidade visual e vídeo inicial
├── img/                    # imagens originais do projeto
├── conteudo/               # conteúdo estático de fallback
├── uploads/                # mídias enviadas pelo painel
├── data/                   # banco SQLite local
├── Dockerfile
└── package.json
```

## API principal

| Método | Rota | Finalidade |
|---|---|---|
| `GET` | `/api/public` | Mídias e disponibilidade públicas. |
| `POST` | `/api/booking-requests` | Envia uma solicitação de data. |
| `POST` | `/api/admin/login` | Autentica o administrador. |
| `GET` | `/api/admin/dashboard` | Carrega os dados administrativos. |
| `POST` | `/api/admin/media` | Publica fotos e vídeos. |
| `PUT` | `/api/admin/availability/:date` | Atualiza uma data da agenda. |
| `PATCH` | `/api/admin/requests/:id` | Atualiza uma solicitação. |
| `GET` | `/api/health` | Verifica a disponibilidade da aplicação. |

As rotas administrativas exigem uma sessão autenticada.

## Resultados de qualidade

Auditoria local realizada com Lighthouse:

- SEO: **100**;
- acessibilidade: **100**;
- boas práticas: **100**;
- dependências com vulnerabilidades conhecidas: **0** no momento da validação.

Os resultados podem variar conforme servidor, conexão, conteúdo enviado e serviços externos.

## Recomendações para produção

1. Configure `SITE_URL` com o domínio definitivo.
2. Use uma senha administrativa forte e exclusiva.
3. Ative HTTPS antes de definir `NODE_ENV=production`.
4. Configure backups de `data/` e `uploads/`.
5. Cadastre o domínio no Google Search Console.
6. Envie `https://seudominio.com.br/sitemap.xml` ao Search Console.
7. Mantenha nome, telefone e endereço iguais no site e no Perfil da Empresa no Google.

## Licença e uso

Projeto desenvolvido para o Espaço Infinity Dreams. A inclusão de uma licença pública ou autorização de reutilização deve ser definida pelo proprietário do projeto antes da distribuição.
