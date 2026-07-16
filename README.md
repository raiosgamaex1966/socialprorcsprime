<![CDATA[<div align="center">

# 🌐 Social Pro

### Social Networking — Plataforma de Rede Social Completa

[![Version](https://img.shields.io/badge/version-1.0.0-teal.svg)](https://afcode.com.br/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E.svg?logo=supabase)](https://supabase.com/)
[![Vite](https://img.shields.io/badge/Vite-6.4-646CFF.svg?logo=vite)](https://vite.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4.svg?logo=tailwindcss)](https://tailwindcss.com/)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8.svg?logo=pwa)](https://web.dev/progressive-web-apps/)

**Desenvolvido por [afCode](https://afcode.com.br/)**

</div>

---

## 📋 Sumário

- [Visão Geral](#-visão-geral)
- [Stack Tecnológica](#-stack-tecnológica)
- [Pré-requisitos](#-pré-requisitos)
- [Instalação e Setup](#-instalação-e-setup)
- [Scripts Disponíveis](#-scripts-disponíveis)
- [Arquitetura do Projeto](#-arquitetura-do-projeto)
- [Features Completas](#-features-completas)
  - [Autenticação e Segurança](#-autenticação-e-segurança)
  - [Feed e Publicações](#-feed-e-publicações)
  - [Stories e Reels](#-stories-e-reels)
  - [Sistema de Mensagens](#-sistema-de-mensagens)
  - [Marketplace](#-marketplace)
  - [Grupos](#-grupos)
  - [Páginas (Pages)](#-páginas-pages)
  - [Eventos](#-eventos)
  - [Perfil de Usuário](#-perfil-de-usuário)
  - [Sistema de Amigos](#-sistema-de-amigos)
  - [Notificações](#-notificações)
  - [Watch (Vídeos)](#-watch-vídeos)
  - [Hashtags e Busca](#-hashtags-e-busca)
  - [Publicidade e Anúncios](#-publicidade-e-anúncios)
  - [Sistema de Créditos](#-sistema-de-créditos)
  - [Memórias (Memories)](#-memórias-memories)
  - [Itens Salvos](#-itens-salvos)
  - [Central de Segurança](#-central-de-segurança)
  - [PWA (Progressive Web App)](#-pwa-progressive-web-app)
  - [CMS (Content Management)](#-cms-content-management)
- [Painel Administrativo](#-painel-administrativo)
- [Painel de Moderador](#-painel-de-moderador)
- [Supabase Edge Functions](#-supabase-edge-functions)
- [Configurações do Administrador](#-configurações-do-administrador)
- [Deploy](#-deploy)
- [Licença](#-licença)

---

## 🎯 Visão Geral

**Social Pro** é uma plataforma de rede social completa e pronta para produção, construída com tecnologias modernas. O sistema oferece todas as funcionalidades de uma rede social profissional — desde feed de publicações, marketplace, grupos, eventos, stories, reels, mensagens em tempo real, sistema de publicidade, até um robusto painel administrativo com mais de 24 seções de gerenciamento.

A plataforma é 100% responsiva, suporta modo escuro/claro, é instalável como PWA e conta com um assistente de instalação guiado (Setup Wizard) para configuração inicial.

---

## 🛠 Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| **Frontend** | React 18 + TypeScript |
| **Build Tool** | Vite 6.4 |
| **Estilização** | TailwindCSS 3.4 + tailwindcss-animate |
| **Componentes UI** | Radix UI (20+ primitivos) + shadcn/ui |
| **Roteamento** | React Router DOM 6 |
| **Estado/Cache** | TanStack React Query 5 |
| **Formulários** | React Hook Form + Zod (validação) |
| **Backend** | Supabase (Auth, Database, Storage, Edge Functions, Realtime) |
| **Mapas** | Leaflet + Leaflet MarkerCluster |
| **Gráficos** | Recharts |
| **Ícones** | Lucide React |
| **Temas** | next-themes (dark/light) |
| **PWA** | vite-plugin-pwa (Workbox) |
| **Testes** | Vitest + Testing Library + Playwright (E2E) |
| **Linting** | ESLint 9 + TypeScript ESLint |
| **Sanitização** | DOMPurify |

---

## 📦 Pré-requisitos

- **Node.js** ≥ 18
- **npm** ou **bun**
- Conta no [Supabase](https://supabase.com/) com projeto criado
- Supabase CLI (para gerenciar migrations e edge functions)

---

## 🚀 Instalação e Setup

### 1. Clone o repositório

```bash
git clone <url-do-repositorio>
cd Social Pro
```

### 2. Instale as dependências

```bash
npm install
# ou
bun install
```

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
SUPABASE_PUBLISHABLE_KEY="SUA_PUBLISHABLE_KEY"
SUPABASE_URL="https://SEU_PROJECT_ID.supabase.co"
VITE_SUPABASE_PROJECT_ID="SEU_PROJECT_ID"
VITE_SUPABASE_PUBLISHABLE_KEY="SUA_PUBLISHABLE_KEY"
VITE_SUPABASE_URL="https://SEU_PROJECT_ID.supabase.co"
VITE_DEMO_MODE=true
```

### 4. Aplique as migrations do banco de dados

```bash
npx supabase link --project-ref <seu-project-ref>
npx supabase db push --include-all
```

### 5. Deploy das Edge Functions

```bash
npx supabase functions deploy --project-ref <seu-project-ref> --no-verify-jwt
```

### 6. Inicie o servidor de desenvolvimento

```bash
npm run dev
```

Acesse `http://localhost:8080` e o **Setup Wizard** irá guiá-lo pela configuração inicial:
1. **Super Admin** — crie a conta de administrador
2. **Identidade do App** — nome, descrição e logos
3. **Configurações do Sistema** — registro, verificação de e-mail, manutenção
4. **Iniciar** — revise e lance a aplicação

> 💡 **Dica:** No Setup Wizard, há opção de **"Pular e Gerar Dados de Demonstração"** que cria automaticamente um admin + usuários e conteúdo de exemplo.

---

## 📜 Scripts Disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (porta 8080) |
| `npm run build` | Build de produção |
| `npm run build:dev` | Build em modo development |
| `npm run preview` | Preview do build de produção |
| `npm run lint` | Lint com ESLint |
| `npm run test` | Rodar testes com Vitest |
| `npm run test:watch` | Testes em modo watch |

---

## 🏗 Arquitetura do Projeto

```
Social Pro/
├── public/                    # Assets estáticos, manifest PWA, favicons
├── src/
│   ├── assets/               # Imagens e logos do app
│   ├── components/           # Componentes React (106 arquivos + 7 subdiretórios)
│   │   ├── admin/            # 24 componentes do painel administrativo
│   │   ├── ads/              # Componentes de publicidade (banner, interstitial)
│   │   ├── moderator/        # 3 componentes do painel moderador
│   │   ├── profile/          # Componentes de perfil de usuário
│   │   ├── sidebar/          # Sidebars contextuais por seção
│   │   ├── ui/               # Componentes base (shadcn/ui)
│   │   └── watch/            # Componentes da seção Watch
│   ├── constants/            # Categorias (eventos, grupos, páginas)
│   ├── hooks/                # 20 custom hooks
│   ├── integrations/         # Clientes Supabase e tipos gerados
│   ├── lib/                  # Utilitários (sanitize, deep links, calendar export, etc.)
│   ├── pages/                # 32 páginas da aplicação
│   ├── test/                 # Setup de testes
│   ├── App.tsx               # Router principal e providers
│   ├── main.tsx              # Entry point + registro PWA + splash screen
│   └── index.css             # Estilos globais
├── supabase/
│   ├── functions/            # 13 Edge Functions (serverless)
│   └── migrations/           # 92 migrations SQL
├── index.html                # HTML com splash screen animada
├── vite.config.ts            # Configuração Vite + PWA
├── tailwind.config.ts        # Configuração TailwindCSS
├── tsconfig.json             # Configuração TypeScript
└── package.json              # Dependências e scripts
```

---

## ✨ Features Completas

### 🔐 Autenticação e Segurança

- Login/Registro com e-mail e senha
- Reset de senha com link por e-mail
- Verificação de e-mail obrigatória (configurável)
- Proteção de rotas (ProtectedRoute)
- Sistema de roles: `admin`, `moderator`, `user`
- Detecção de login incomum
- Limite de tentativas de login com lockout
- Autenticação de dois fatores (2FA) via e-mail/SMS
- Suporte a Google Authenticator e Authy
- Palavras censuradas em conteúdo
- Sistema de bloqueio de usuários

### 📰 Feed e Publicações (Posts)

- Feed principal com scroll infinito
- Criação de posts com:
  - Texto rico com formatação
  - Upload múltiplo de imagens (carrossel)
  - Upload de vídeo
  - Upload de áudio
  - GIFs (integração Tenor)
  - Emojis personalizados
  - Check-in com localização
  - Menções de usuários (`@`)
  - Hashtags (`#`) com página dedicada
  - Controle de audiência (público, amigos, privado)
  - Agendamento de publicações
  - Link preview automático
- Reações (curtir, amei, haha, wow, triste, raiva)
- Comentários com threads (respostas aninhadas)
- Compartilhamento de posts
- Embed de posts (código HTML para sites externos)
- Edição de posts com histórico de edições
- Pinagem de posts
- Trending posts na sidebar
- Posts patrocinados (Sponsored Posts)
- Boost de posts (impulsionar)
- Tradução automática de posts

### 📖 Stories e Reels

- **Stories:**
  - Upload de foto/vídeo
  - Visualização em tela cheia com progresso
  - Lista de visualizadores
  - Story Highlights (destaques no perfil)
  - Reações a stories
- **Reels:**
  - Upload de vídeos curtos
  - Player vertical em tela cheia (swipe)
  - Curtidas e comentários
  - Compartilhamento

### 💬 Sistema de Mensagens

- Chat em tempo real (Supabase Realtime)
- Conversas individuais (1:1)
- Grupos de chat
  - Criação de grupo com nome e foto
  - Gerenciamento de membros (admin do chat)
  - Configurações do grupo
- Indicador de digitação (typing indicator)
- Confirmações de leitura (read receipts)
- Anexos de mídia (imagens, documentos)
- Gravação de áudio (voice messages)
- Encaminhamento de mensagens
- Reações a mensagens (emoji)
- Busca em conversas
- Status de presença online/offline

### 🛒 Marketplace

- Listagem completa de anúncios com filtros:
  - Categoria, faixa de preço, localização
  - Estado do item (novo, usado, recondicionado)
  - Ordenação por preço, data, relevância
- Criação de anúncio com:
  - Título, descrição, preço
  - Upload múltiplo de fotos (até 10)
  - Seleção de categoria
  - Condição do item
  - Localização
- Templates de anúncio
- Sistema de ofertas (Make Offer)
- Histórico de preços (gráfico)
- Vendedores verificados com badge
- Avaliações de vendedores (reviews e ratings)
- Dashboard do vendedor com analytics
- Promoção de anúncios (Boost)
- Anúncios recomendados
- Anúncios em destaque (Trending)
- Itens visualizados recentemente
- Denúncia de anúncios
- Detecção automática de fraude
- Sistema de moderação de anúncios

### 👥 Grupos

- Criação de grupos com:
  - Nome, descrição, imagem de capa
  - Categoria
  - Privacidade (público, privado, secreto)
  - Regras do grupo
- Feed exclusivo do grupo
- Sistema de membros (pedidos, aprovação, remoção)
- Roles dentro do grupo (admin, moderador, membro)
- Convite por link único
- Eventos do grupo
- Analytics do grupo (métricas de engajamento)
- Feed de atividades do grupo
- Compartilhamento de posts do grupo
- Notificações configuráveis por grupo
- Recomendações de grupos
- Hover card com preview do grupo

### 📄 Páginas (Pages)

- Criação de páginas (empresas, marcas, criadores)
- Categorias personalizáveis
- Publicações na página
- Eventos da página
- Seguidores e curtidas
- Analytics da página (gráficos de crescimento, engajamento)
- Edição de informações da página
- Boost de página (impulsionar)
- Hover card com preview da página
- Recomendações de páginas

### 📅 Eventos

- Criação de eventos com:
  - Título, descrição, data/hora
  - Localização com mapa
  - Imagem de capa
  - Categoria
  - Limite de participantes
  - Evento online/presencial
- RSVP (Vou, Talvez, Não vou)
- Lista de participantes
- Comentários no evento
- Compartilhamento de eventos
- Visualização em calendário
- Visualização em mapa (Leaflet + MarkerCluster)
- Eventos relacionados
- Exportação para calendário (iCal)
- Eventos desta semana na sidebar
- Lembretes de eventos (Edge Function)
- Digest semanal de eventos (Edge Function)

### 👤 Perfil de Usuário

- Foto de perfil com recorte (crop modal)
- Capa do perfil com recorte
- Informações pessoais (bio, localização, trabalho, educação)
- Barra de completude do perfil
- Abas no perfil:
  - Publicações
  - Sobre
  - Amigos
  - Fotos
  - Check-ins
- Verificação de perfil (badge verificado ✓)
- Visualização de perfil público
- Log de atividades
- Hover card com preview do perfil
- Bloqueio de usuário

### 👫 Sistema de Amigos

- Enviar/aceitar/recusar pedidos de amizade
- Sugestões de amigos ("People You May Know")
- Lista de amigos com busca
- Configurável entre modo "Amigos" e "Seguidores"
- Limite de conexões configurável
- Convite de amigos por link

### 🔔 Notificações

- Centro de notificações completo
- Notificações push (Web Notifications API)
- Sons de notificação configuráveis
- Notificações por tipo:
  - Curtidas, comentários, compartilhamentos
  - Novos seguidores/pedidos de amizade
  - Menções
  - Eventos próximos
  - Atividade em grupos
  - Mensagens
  - Memórias
- Swipeable notifications (mobile)
- Dropdown de notificações no header
- Preferências de notificação configuráveis

### 📺 Watch (Vídeos)

- Seção dedicada para vídeos longos
- Upload de vídeos
- Player de vídeo com controles
- Playlists
- Vídeos recomendados
- Cards de vídeo com preview

### 🔍 Hashtags e Busca

- Busca global (pesquisa unificada)
  - Usuários, posts, grupos, páginas, eventos, marketplace
- Página dedicada por hashtag (`/hashtag/:tag`)
- Hashtags clicáveis em posts
- Trending posts

### 📢 Publicidade e Anúncios

- **Anúncios do Site (Admin):**
  - Banner horizontal
  - Interstitial (tela cheia com frequência configurável)
  - Cards na sidebar
  - Google AdSense integrado
- **Anúncios de Usuários:**
  - Criação de posts patrocinados
  - Orçamento e duração
  - Targeting: idade, gênero, localização, interesses
  - Dashboard de performance
  - Métricas: impressões, cliques, CTR, gastos
  - Edição de anúncios ativos
- Sistema de aprovação (manual ou automática)
- Revenue share configurável
- Frequency capping (controle de frequência)
- Filtro NSFW para anúncios

### 💰 Sistema de Créditos

- Página dedicada para créditos
- Gifting de créditos entre usuários
- Usado para boost de posts, promoção de anúncios, etc.
- Widget de créditos promocionais

### 🕰 Memórias (Memories)

- Card de memórias ("Neste dia, X anos atrás")
- Notificações de memórias (Edge Function)
- Compartilhar memória no feed

### 📌 Itens Salvos

- Salvar posts, anúncios e conteúdo
- Página dedicada com filtros por tipo
- Organização de itens salvos

### 🛡 Central de Segurança

- Centro unificado de segurança
- Gerenciamento de usuários bloqueados
- Denúncia de conteúdo/usuários
- Modal "Find Support" (buscar ajuda)

### 📱 PWA (Progressive Web App)

- Instalável como app nativo (Android, iOS, Desktop)
- Service Worker com Workbox
- Cache offline de assets
- Página dedicada de instalação (`/install`)
- Prompt de instalação customizado
- Banner de status PWA
- Auto-update do Service Worker

### 📝 CMS (Content Management)

- Páginas de conteúdo dinâmicas
- Editor CMS para administradores
- Renderização de páginas por slug (`/page/:slug`)

---

## 🛡 Painel Administrativo

Acessível em `/admin` (requer role `admin`). Painel completo com sidebar agrupada e 24 seções:

### Visão Geral
- Dashboard com estatísticas da plataforma (usuários, grupos, páginas, eventos, anúncios, publicações)
- Cards de moderação (denúncias pendentes, sinais de fraude)
- Ações rápidas para seções comuns
- Atividade recente

### Gerenciamento de Conteúdo
| Seção | Funcionalidades |
|---|---|
| **Usuários** | Lista, busca, edição de roles, ban/unban, exclusão, bulk actions, paginação |
| **Publicações** | Moderação de posts, remoção, visualização de conteúdo |
| **Grupos** | Gerenciamento de todos os grupos, moderação |
| **Páginas** | Gerenciamento de páginas criadas por usuários |
| **Eventos** | Gerenciamento e moderação de eventos |
| **Anúncios (Marketplace)** | Moderação de listings, remoção de conteúdo impróprio |

### Moderação e Segurança
| Seção | Funcionalidades |
|---|---|
| **Denúncias** | Fila de denúncias com filtro (pendente/analisada/todas), ações: descartar, notificar, remover |
| **Sinais de Fraude** | Detecção automática de fraude, sinais com severidade (alta/média/baixa), resolver/reabrir |
| **Vendedores Verificados** | Gerenciamento de badges de vendedor verificado |
| **Solicitações de Verificação** | Aprovar/rejeitar pedidos de verificação de perfil |

### Conteúdo e Anúncios
| Seção | Funcionalidades |
|---|---|
| **Páginas CMS** | Editor WYSIWYG para páginas de conteúdo estático |
| **Anúncios do Site** | Configuração de banners, interstitial, AdSense |
| **Anúncios de Usuários** | Aprovação/rejeição de anúncios criados por usuários |

### Aparência
| Seção | Funcionalidades |
|---|---|
| **Design do Site** | Logo (claro/escuro), favicon, cores da marca, gradientes |
| **Código Personalizado** | Injeção de JS/CSS customizado em todas as páginas |

### Comunicação
| Seção | Funcionalidades |
|---|---|
| **Gerenciar E-mails** | Templates de e-mail do sistema |
| **Enviar E-mail** | E-mail broadcast para todos os usuários |
| **Notificações Push** | Configuração de push notifications |
| **E-mail e SMS** | Configuração SMTP, Twilio, BulkSMS, InfoBip, MSG91 |

### Configurações do Sistema
| Seção | Funcionalidades |
|---|---|
| **Gerenciar Gêneros** | CRUD de opções de gênero |
| **Usuários Online** | Monitor de usuários ativos em tempo real |
| **Vídeo e Áudio** | Configurações de mídia (ffmpeg, limites) |
| **Upload de Arquivos** | Extensões permitidas, tamanho máximo, compressão, storage (S3, DigitalOcean, Wasabi, GCS, Backblaze, FTP) |
| **Configurações** | Configurações gerais (veja seção abaixo) |

---

## 👮 Painel de Moderador

Acessível em `/moderator` (requer role `moderator`). Painel simplificado com:

- **Fila de Moderação de Conteúdo** — revisar posts/comentários reportados
- **Log de Atividades de Moderação** — histórico de ações tomadas
- **Avisos e Bans de Usuários** — emitir avisos, banir/desbanir

---

## ⚡ Supabase Edge Functions

13 funções serverless deployadas no Supabase:

| Função | Descrição |
|---|---|
| `setup-admin` | Cria a conta de super admin durante o Setup Wizard |
| `seed-demo` | Gera dados de demonstração (admin + usuários + conteúdo) |
| `translate-post` | Tradução automática de publicações |
| `fetch-link-preview` | Busca preview de links (OG metadata) |
| `detect-fraud-signals` | Detecção automática de fraude em anúncios |
| `event-reminders` | Envia lembretes de eventos próximos |
| `weekly-event-digest` | Digest semanal de eventos por e-mail |
| `memories-notification` | Notificação de memórias ("Neste dia...") |
| `publish-scheduled-posts` | Publica posts agendados na hora programada |
| `send-broadcast-email` | Envio de e-mail em massa para usuários |
| `auto-verify-sellers` | Verificação automática de vendedores |
| `tenor-proxy` | Proxy para API do Tenor (GIFs) |
| `embed-post` | Geração de embed HTML para posts |

---

## ⚙ Configurações do Administrador

O painel de configurações (`/admin` → Configurações) possui **11 abas** com mais de **200 opções configuráveis**:

| Aba | Itens Principais |
|---|---|
| **Geral** | Cache, manutenção, SEO, idioma padrão (24 idiomas), formato de data, landing page, palavras censuradas |
| **Usuários** | Online status, last seen, exclusão de conta, sistema amigos/seguidores, limite de conexões, convites |
| **Login e Segurança** | Registro, username automático, complexidade de senha, 2FA, Google Auth, Authy, reCAPTCHA, lockout, usernames reservados |
| **Informações do Site** | Título, nome, keywords, descrição, Google Analytics |
| **Chaves de API** | Google Maps, Yandex Maps, Google/Yandex Translation, YouTube, GIPHY |
| **Arquivos e Armazenamento** | Upload de imagem/vídeo/áudio/reels, extensões permitidas, tamanho máximo, compressão, ffmpeg, S3, DigitalOcean, Wasabi, FTP, Google Cloud, Backblaze |
| **E-mail e SMS** | SMTP (host, porta, criptografia), Twilio, BulkSMS, InfoBip, MSG91 |
| **Configurações de IA** | OpenAI API key/modelo, geração de imagens AI, posts AI, blog AI, avatares AI, Replicate, sistema de créditos AI |
| **Recursos** | Marketplace (verificação, fraude, ofertas, histórico de preços), Ads (banners, interstitial, sponsored posts, targeting, AdSense, NSFW filter, revenue share), categorias (marketplace, grupos, páginas, eventos) |
| **Pagamentos** | Moeda, Stripe, PayPal, Razorpay, Coinbase, transferência bancária, sistema Pro (mensal/anual/lifetime), carteira digital |
| **Aplicativos Móveis** | URLs de apps Android/iOS (Messenger, Timeline), PWA (nome, cores, offline, push, install prompt) |

---

## 🌐 Deploy

### Build de Produção

```bash
npm run build
```

O build é gerado na pasta `dist/` e inclui:
- Service Worker para PWA
- Assets otimizados e comprimidos
- Precache de 8 entries (~2.8 MB)

### Hospedagem

O arquivo `public/.htaccess` já está configurado para hospedagem em servidores Apache com suporte a SPA (Single Page Application). Para outros servidores:

- **Vercel**: Adicione um `vercel.json` com rewrite para `index.html`
- **Netlify**: O `_redirects` padrão funciona
- **Nginx**: Configure `try_files $uri /index.html`

### Banco de Dados

As 92 migrations SQL estão em `supabase/migrations/` e cobrem:
- Tabelas: profiles, posts, comments, reactions, stories, reels, groups, pages, events, listings, messages, notifications, ads, e muitas mais
- RLS (Row Level Security) policies
- Storage buckets e policies
- Functions e triggers PostgreSQL
- Extensões: `pg_net`, etc.

---

## 📄 Licença

© [afCode](https://afcode.com.br/). Todos os direitos reservados.

---

<div align="center">

**Social Pro** — Sua rede social, do seu jeito. 🚀

Desenvolvido com ❤️ por [afCode](https://afcode.com.br/)

</div>
]]>
