# Controle de Jornada · Dungeons & Dragons Group

Plataforma web interna para registro e acompanhamento da jornada de trabalho de colaboradores distribuídos entre **Brasil e Europa**, com suporte a trabalho remoto, viagens internacionais, correção de marcações com aprovação e fechamento mensal.

> Desafio técnico desenvolvido por **Miguel de Moura Oliveira** · <miguelmoura112@gmail.com>

<!-- Substitua pelos seus prints (crie a pasta docs/screenshots) -->
| Registro de ponto (celular) | Jornada do mês | Aprovação de ajustes |
|---|---|---|
| ![Ponto](docs/screenshots/ponto.png) | ![Jornada](docs/screenshots/jornada.png) | ![Ajustes](docs/screenshots/ajustes.png) |

---

## Sumário

1. [Interpretação do cenário](#1-interpretação-do-cenário)
2. [Funcionalidades](#2-funcionalidades)
3. [Stack](#3-stack)
4. [Arquitetura](#4-arquitetura)
5. [Modelagem de dados](#5-modelagem-de-dados)
6. [Decisões técnicas](#6-decisões-técnicas)
7. [Regras de negócio assumidas](#7-regras-de-negócio-assumidas)
8. [Como executar](#8-como-executar)
9. [Dados e roteiro para avaliação](#9-dados-e-roteiro-para-avaliação)
10. [API](#10-api)
11. [Estrutura de pastas](#11-estrutura-de-pastas)
12. [Limitações e próximos passos](#12-limitações-e-próximos-passos)
13. [Uso de ferramentas de IA](#13-uso-de-ferramentas-de-ia)

---

## 1. Interpretação do cenário

Antes de escrever código, li o enunciado buscando os problemas reais da empresa. Cada trecho virou um requisito da solução:

| O que o enunciado diz | Como interpretei | Onde isso aparece na solução |
|---|---|---|
| Colaboradores entre Brasil e Europa, com viagens frequentes | **Fuso horário é o problema central.** Um registro precisa saber *quando* e *onde* aconteceu. A Europa tem horário de verão; o Brasil não. | Cada marcação guarda o instante em UTC, o fuso IANA e o país (6.1) |
| Inconsistências nos fechamentos mensais e divergências de horário | Registros não podem ser editados livremente, e o horário não pode depender do relógio do usuário | Horário definido pelo servidor, marcações imutáveis, ajustes com aprovação e fechamento mensal (6.2, 6.4, 6.7) |
| Comunicação entre colaboradores, gestores e RH | Três perfis com responsabilidades diferentes | Papéis `EMPLOYEE`, `MANAGER` e `HR`, com permissões no back-end (6.8) |
| Dificuldade no acompanhamento da rotina dos times | Gestores precisam enxergar a jornada do seu time | Tela de equipe e cálculo da jornada com status por dia (6.6) |
| Parte da equipe atua remotamente | A modalidade de trabalho é uma informação relevante | Modalidade de contrato no colaborador e modalidade do dia em cada marcação |
| Registro das atividades da jornada diária | Entrada, início de intervalo, fim de intervalo e saída | Tipos `CLOCK_IN`, `BREAK_START`, `BREAK_END`, `CLOCK_OUT` |
| Utilizável em diferentes dispositivos e contextos | O registro de ponto acontece principalmente pelo celular, inclusive em viagem | Interface responsiva, com a tela de ponto pensada primeiro para o celular (6.10) |
| Nem todos os requisitos foram descritos | Regras precisam ser assumidas e documentadas | Seção 7 |

---

## 2. Funcionalidades

**Colaborador**
- Login com e-mail e senha
- Registro de ponto com detecção automática do fuso horário, sugestão de país e de modalidade (escritório, remoto, viagem)
- Botões que mostram apenas as marcações possíveis no momento
- Jornada do mês dia a dia: horas trabalhadas, intervalo, saldo e status de cada dia
- Marcações exibidas no horário local de onde foram feitas
- Solicitação de ajuste para corrigir uma marcação ou incluir uma esquecida

**Gestor** (além do acima)
- Acompanhamento da jornada dos membros do seu time
- Aprovação ou rejeição dos ajustes do time

**RH** (além do acima)
- Acompanhamento da jornada de todos os colaboradores
- Revisão de ajustes de qualquer colaborador
- Fechamento mensal por colaborador, bloqueado enquanto houver pendências
- Cadastro de unidades, times e colaboradores (pela API; ver seção 12)

---

## 3. Stack

| Camada | Tecnologias |
|---|---|
| Back-end | Node.js, Express, TypeScript |
| Banco de dados | PostgreSQL, Prisma ORM 7 (com migrations versionadas) |
| Datas e fusos | Luxon (back-end), API `Intl` do navegador (front-end) |
| Autenticação | JWT (jsonwebtoken), senhas com hash (bcryptjs) |
| Front-end | React, TypeScript, Vite, Bootstrap, Bootstrap Icons, React Router |

### Sobre a escolha da stack

O enunciado menciona que o ecossistema da empresa usa majoritariamente tecnologias Microsoft no back-end e Angular no front-end, e deixa a proposta livre. Optei por Node.js e React por serem as tecnologias com que tenho mais domínio hoje, o que me permitiu concentrar o tempo do desafio no problema de negócio (fusos, auditoria, fechamento) em vez de na curva de aprendizado de uma nova stack.

Ainda assim, a solução foi pensada para ser próxima do ecossistema da empresa:

- **TypeScript** nas duas pontas, a mesma linguagem do Angular e com tipagem estática semelhante ao C#.
- **Arquitetura em camadas** (controller, service, repository, DTOs), o mesmo padrão usado em aplicações ASP.NET Core, então a organização do código é diretamente transferível.
- **PostgreSQL com migrations versionadas**, conceito equivalente às migrations do Entity Framework.

---

## 4. Arquitetura

### Back-end

Cada camada tem uma única responsabilidade e só conhece a camada imediatamente abaixo:

```
route          → qual endpoint e quais permissões?
controller     → como tratar a requisição HTTP?
service        → quais regras de negócio se aplicam?
repository     → como buscar e gravar os dados?
Prisma Client  → como falar com o PostgreSQL?
```

Complementam as camadas:

- **DTOs**: definem o formato dos dados que entram pela API. São diferentes do formato do banco quando faz sentido (o DTO de colaborador recebe `password`; o banco guarda `password_hash`).
- **middlewares**: autenticação (`authenticate`), autorização por papel (`authorize`) e tratamento centralizado de erros.
- **errors**: erros da aplicação com status HTTP próprio.

As regras de negócio ficam **apenas nos services**. Controllers não conhecem regras, e só os repositories conhecem o Prisma.

### Front-end

```
api/         → comunicação com o back-end (token, erros, uma função por rota)
auth/        → usuário logado e proteção de rotas
components/  → peças reutilizáveis (layout, visão do mês, modal de ajuste)
pages/       → uma tela por arquivo
utils/       → formatação de horários e detecção de fuso
```

A visão do mês (`MonthView`) é um componente único, usado tanto pelo colaborador ("Minha jornada") quanto pelo gestor e pelo RH ("Equipe").

---

## 5. Modelagem de dados

```mermaid
erDiagram
    Office ||--o{ Employee : "lota"
    Team ||--o{ Employee : "agrupa"
    Employee |o--o{ Team : "gerencia"
    Employee ||--o{ TimeEntry : "registra"
    Employee ||--o{ AdjustmentRequest : "solicita"
    Employee |o--o{ AdjustmentRequest : "revisa"
    TimeEntry |o--o{ AdjustmentRequest : "corrigida por"
    Employee ||--o{ MonthlyClosing : "possui"

    Office {
        int id PK
        string name
        char country_code
        string timezone
    }
    Team {
        int id PK
        string name
        int manager_id FK
    }
    Employee {
        int id PK
        string name
        string email UK
        string password_hash
        enum role
        enum work_mode
        string home_timezone
        int daily_expected_minutes
        boolean active
        int office_id FK
        int team_id FK
        timestamptz created_at
    }
    TimeEntry {
        int id PK
        int employee_id FK
        enum type
        timestamptz occurred_at
        string timezone
        int utc_offset_minutes
        date work_date
        char country_code
        enum work_mode
        enum source
        timestamptz superseded_at
    }
    AdjustmentRequest {
        int id PK
        int employee_id FK
        int time_entry_id FK
        enum requested_type
        timestamptz requested_occurred_at
        string timezone
        string reason
        enum status
        int reviewed_by_id FK
        string review_comment
    }
    MonthlyClosing {
        int id PK
        int employee_id FK
        char year_month
        enum status
        int worked_minutes
        int expected_minutes
        int balance_minutes
        int closed_by_id FK
    }
```

O schema completo, com comentários em cada campo, está em [`back-end/prisma/schema.prisma`](back-end/prisma/schema.prisma).

---

## 6. Decisões técnicas

### 6.1 Horário em UTC + fuso IANA da marcação

Cada marcação guarda `occurred_at` em UTC (`timestamptz`), o `timezone` de onde foi feita (ex: `Europe/Lisbon`) e o `utc_offset_minutes` daquele momento.

- **Por quê:** as durações são calculadas sobre instantes em UTC, então mudanças de fuso ou de horário de verão no meio da jornada não geram erro. A exibição usa o fuso original: o RH no Brasil vê "09:00 (Lisboa)", e não "05:00".
- **Alternativa descartada:** guardar o horário local como texto. Torna o cálculo de horas ambíguo em viagens e nas trocas de horário de verão.

Exemplo de uma colaboradora da unidade de São Paulo trabalhando em Lisboa:

```json
{
  "type": "CLOCK_IN",
  "occurred_at": "2026-10-20T08:00:00.000Z",
  "local_time": "2026-10-20T09:00:00.000+01:00",
  "timezone": "Europe/Lisbon",
  "utc_offset_minutes": 60,
  "work_date": "2026-10-20",
  "country_code": "PT",
  "work_mode": "TRAVEL"
}
```

### 6.2 O horário da marcação é definido pelo servidor

O cliente envia apenas o tipo, o fuso, o país e a modalidade. O instante é carimbado pelo servidor.

- **Por quê:** impede registros com horário manipulado pelo relógio do dispositivo, uma das causas de divergência relatadas no cenário.

### 6.3 Data da jornada calculada no fuso local

O `work_date` é a data **local** de onde a pessoa está, e não a data em UTC (às 22:30 em São Paulo já é o dia seguinte em UTC). Em jornadas que passam da meia-noite, todas as marcações herdam o `work_date` da entrada, então a jornada fica inteira em um só dia.

### 6.4 Marcações imutáveis e ajustes com aprovação

Marcações nunca são editadas nem apagadas. Uma correção vira uma **solicitação de ajuste**, com motivo obrigatório, que o gestor do time ou o RH aprova ou rejeita.

Ao aprovar, três operações acontecem **em uma única transação**: a nova marcação é criada (`source = ADJUSTMENT`), a original recebe `superseded_at` (sai do cálculo, mas permanece para auditoria) e a solicitação registra quem aprovou e quando. Sem a transação, uma falha no meio do processo poderia deixar as duas marcações valendo ao mesmo tempo e contar horas em dobro.

- **Por quê:** é a principal resposta ao problema das planilhas: todo dado tem origem rastreável.
- **Consequência:** marcações não têm rotas de alteração nem exclusão. Nem toda entidade precisa de CRUD completo.

### 6.5 Jornada esquecida

Se a última marcação deixou a jornada aberta há mais de 16 horas, ela é considerada esquecida: o colaborador pode iniciar uma nova jornada normalmente, e o dia anterior aparece como **inconsistente** até ser corrigido por ajuste.

- **Por quê:** sem essa regra, quem esquece de registrar a saída ficaria impedido de registrar a entrada no dia seguinte.

### 6.6 Jornada diária calculada, não armazenada

Horas trabalhadas, intervalos, saldo e status de cada dia são calculados a partir das marcações. O cálculo percorre as marcações como uma máquina de estados (fora, trabalhando, em intervalo); uma transição inesperada marca o dia como inconsistente em vez de gerar um número errado.

| Status | Quando | Conta no saldo? |
|---|---|---|
| Completa | Jornada fechada com sequência válida | Sim |
| Em andamento | Jornada aberta agora | Não, ainda não terminou |
| Inconsistente | Jornada esquecida ou sequência quebrada | Sim, e precisa de ajuste |
| Falta | Dia útil passado sem marcação | Sim, como débito |
| Hoje | Dia atual ainda sem marcação | Não |
| Folga | Sábado ou domingo sem marcação | Não |

- **Por quê:** evita dados duplicados que poderiam divergir das marcações. No fechamento, os totais calculados são gravados, congelando o resultado do mês.

### 6.7 Fechamento mensal

O RH fecha o mês de cada colaborador. Depois disso, nenhuma marcação ou ajuste é aceito para o período. O fechamento só é permitido para meses já encerrados, sem dias inconsistentes e sem ajustes pendentes.

### 6.8 Autenticação, permissões e privacidade

O login retorna um token JWT, enviado nas requisições seguintes no cabeçalho `Authorization: Bearer <token>`.

| Papel | Pode |
|---|---|
| `EMPLOYEE` | Registrar e consultar as próprias marcações, solicitar ajustes |
| `MANAGER` | Tudo do colaborador + consultar o time e revisar os ajustes dele |
| `HR` | Consultar todos, revisar qualquer ajuste, fechar meses e gerenciar cadastros |

- **A identidade vem do token**, não da requisição. As rotas de uso pessoal ficam sob `/me` (ex: `POST /me/time-entries`), então um colaborador não consegue registrar ponto em nome de outro.
- **Ninguém revisa a própria solicitação de ajuste** (segregação de funções). Um ajuste do gestor é revisado pelo RH.
- **O hash da senha nunca sai do banco por acidente:** o Prisma Client está configurado para omitir `password_hash` em todas as consultas por padrão; apenas a função de login o solicita explicitamente.
- **O login responde com a mesma mensagem** para e-mail inexistente e senha errada, para não revelar quais e-mails estão cadastrados.
- **Esconder telas no front-end é experiência de uso, não segurança.** Toda permissão é verificada no back-end.

### 6.9 Colaboradores são desativados, não excluídos

`DELETE /employees/:id` marca o colaborador como inativo. Excluir apagaria o histórico de marcações, que é um registro de auditoria. Colaboradores inativos não conseguem fazer login.

### 6.10 Experiência de uso pensada para o celular

- A tela de ponto mostra **apenas os botões das ações possíveis** naquele momento, informadas pelo back-end (`GET /me/time-entries/status`).
- **O fuso é detectado pelo navegador**, mas o navegador não informa o país. O sistema sugere o país a partir do fuso, e o usuário pode corrigir.
- **A modalidade é sugerida automaticamente:** se o fuso detectado é diferente do fuso base do colaborador, a tela já sugere "Viagem".
- No celular, o menu recolhe, os botões ocupam a largura toda e o formulário de ajuste ocupa a tela inteira.

### 6.11 Tratamento de erros padronizado

Todos os erros respondem no formato `{ "message": "..." }`, com o status HTTP adequado:

| Status | Quando |
|---|---|
| 400 | Dados com formato inválido |
| 401 | Sem login ou sessão expirada |
| 403 | Logado, mas sem permissão |
| 404 | Recurso não encontrado |
| 409 | Conflito (e-mail repetido, ajuste já revisado, mês já fechado) |
| 422 | Regra de negócio violada, com mensagem explicando o motivo |
| 500 | Erro inesperado, sem expor detalhes internos |

---

## 7. Regras de negócio assumidas

Como o enunciado deixa várias regras em aberto, estas foram as que assumi:

| Regra | Valor |
|---|---|
| Sequência de marcações | Entrada → (intervalo → retorno, quantas vezes for preciso) → saída |
| Intervalo mínimo entre duas marcações | 1 minuto (evita duplo clique) |
| Jornada aberta considerada esquecida após | 16 horas |
| Jornada diária esperada padrão | 8 horas, configurável por colaborador (máximo de 12 horas) |
| Jornada esperada em sábados e domingos | Zero (o que for trabalhado vira saldo positivo) |
| Feriados | Não considerados nesta versão |
| Prazo para solicitar ajuste | Até 60 dias atrás, nunca para o futuro |
| Motivo do ajuste | Obrigatório, com no mínimo 10 caracteres |
| Motivo da rejeição | Obrigatório |
| Quem revisa ajustes | Gestor do time do solicitante ou RH, nunca o próprio solicitante |
| Fechamento do mês | Só após o fim do mês, sem dias inconsistentes e sem ajustes pendentes |
| Senha | Mínimo de 8 caracteres |
| Validade da sessão | 8 horas |
| Fuso base do colaborador | Herdado da unidade, se não for informado |

---

## 8. Como executar

### Pré-requisitos

- Node.js 20.19 ou superior (recomendado: 22 LTS)
- Docker, para o banco de dados. Alternativamente, qualquer PostgreSQL acessível, inclusive em nuvem.

### 8.1 Clonar o repositório

```bash
git clone https://github.com/<seu-usuario>/<nome-do-repo>.git
cd <nome-do-repo>
```

### 8.2 Subir o banco de dados

```bash
docker compose up -d
```

Cria um PostgreSQL local na porta `5432`, com usuário `postgres`, senha `postgres` e banco `jornada`.

### 8.3 Back-end

```bash
cd back-end
cp .env.example .env
```

Preencha o `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/jornada"
JWT_SECRET="troque-por-um-texto-longo-e-aleatorio"
```

Instale as dependências, gere o cliente do Prisma, crie as tabelas, carregue os dados de exemplo e inicie:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

A API ficará disponível em `http://localhost:8888`.

> Se o `npm` avisar que alguns pacotes têm scripts de instalação não aprovados, rode `npm approve-scripts --all` e repita o `npm install`.

### 8.4 Front-end

Em outro terminal, a partir da raiz do repositório:

```bash
cd front-end
cp .env.example .env
npm install
npm run dev
```

O `.env` do front-end:

```env
VITE_API_URL="http://localhost:8888"
```

A aplicação ficará disponível em `http://localhost:5173`.

---

## 9. Dados e roteiro para avaliação

### Usuários de exemplo

Todos usam a senha **`Senha@123`**.

| Nome | E-mail | Papel | Unidade |
|---|---|---|---|
| Ana Ribeiro | `ana@ddgroup.com` | RH | São Paulo |
| Bruno Costa | `bruno@ddgroup.com` | Gestor do time "Operações Europa" | Lisboa |
| Carla Mendes | `carla@ddgroup.com` | Colaboradora (híbrida) | São Paulo |
| Diego Navarro | `diego@ddgroup.com` | Colaborador (remoto) | Madri |

### O que o seed prepara

O histórico é gerado a partir da **segunda-feira da semana anterior** até o dia anterior à execução do seed, então a demonstração funciona em qualquer data:

- **Carla** passou de segunda a quarta da semana anterior em **Lisboa**, a trabalho, e depois voltou a São Paulo.
- **Diego** **esqueceu de registrar a saída** na quinta-feira da semana anterior, e já enviou uma **solicitação de ajuste**, que está pendente com o gestor.
- **Ana** e **Bruno** têm jornadas regulares.

> O seed apaga todos os dados antes de recriá-los. Para voltar ao estado inicial a qualquer momento, rode `npx prisma db seed` novamente.

### Roteiro sugerido

Para simular o uso no celular, abra as ferramentas do desenvolvedor (`F12`) e ative o modo responsivo (`Ctrl+Shift+M`).

1. **Entre como Carla** e abra **Minha jornada**. Os dias da viagem mostram os horários de Lisboa e os demais, os de São Paulo; todos com 8 horas trabalhadas.
2. **Ainda como Carla**, registre uma entrada na tela **Ponto**. Os botões passam a mostrar apenas "Iniciar intervalo" e "Registrar saída". Tente registrar de novo em seguida: o sistema recusa.
3. **Simule uma viagem:** nas ferramentas do desenvolvedor, `Ctrl+Shift+P` → **Sensors** → em "Location", escolha uma cidade europeia e recarregue. O relógio muda de fuso, o país é sugerido e a modalidade passa para "Viagem".
4. **Entre como Diego** e abra **Minha jornada** no mês da quinta-feira passada: o dia aparece como **Inconsistente**, com um aviso no topo.
5. **Entre como Bruno** e abra **Ajustes**: a solicitação do Diego aparece em "Para revisar". Aprove-a.
6. **Volte como Diego:** a quinta-feira agora está **Completa**, com a saída marcada como ajuste.
7. **Ainda como Bruno**, abra **Equipe** e consulte a jornada da Carla e do Diego.
8. **Entre como Ana** e abra **Fechamento**. Feche o mês anterior de um colaborador sem pendências; tente fechar o mês atual: o sistema não permite.
9. **Teste as permissões:** como Carla, acesse `http://localhost:5173/fechamento` pela barra de endereços. O acesso é negado.

---

## 10. API

Todas as rotas, exceto `/auth/login`, exigem o cabeçalho `Authorization: Bearer <token>`.

| Método | Rota | Quem acessa | Descrição |
|---|---|---|---|
| POST | `/auth/login` | Público | Login, retorna o token e o usuário |
| GET | `/auth/me` | Todos | Usuário logado |
| GET | `/me/time-entries/status` | Todos | Situação da jornada e próximas marcações permitidas |
| POST | `/me/time-entries` | Todos | Registrar marcação |
| GET | `/me/time-entries?from=AAAA-MM-DD&to=AAAA-MM-DD` | Todos | Minhas marcações no período |
| GET | `/me/workdays?month=AAAA-MM` | Todos | Minha jornada do mês, dia a dia |
| GET | `/me/team` | Gestor | Membros dos meus times |
| GET | `/employees/:id/workdays?month=AAAA-MM` | O próprio, gestor do time, RH | Jornada do mês de um colaborador |
| GET | `/adjustment-requests?status=PENDING` | Todos | Solicitações visíveis para o usuário |
| POST | `/adjustment-requests` | Todos | Solicitar ajuste |
| PATCH | `/adjustment-requests/:id/review` | Gestor do time, RH | Aprovar ou rejeitar |
| GET | `/monthly-closings?month=AAAA-MM` | RH | Fechamentos do mês |
| POST | `/monthly-closings` | RH | Fechar o mês de um colaborador |
| GET | `/offices`, `/teams` | Todos | Consultar unidades e times |
| POST, PUT, DELETE | `/offices`, `/teams` | RH | Gerenciar unidades e times |
| GET | `/employees`, `/employees/:id` | Gestor, RH | Consultar colaboradores |
| POST, PUT | `/employees`, `/employees/:id` | RH | Cadastrar e atualizar colaboradores |
| DELETE | `/employees/:id` | RH | Desativar colaborador |

### Exemplos

**Registrar marcação**

```http
POST /me/time-entries
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "CLOCK_IN",
  "timezone": "Europe/Lisbon",
  "country_code": "PT",
  "work_mode": "TRAVEL"
}
```

**Solicitar ajuste de uma saída esquecida**

```http
POST /adjustment-requests
Authorization: Bearer <token>
Content-Type: application/json

{
  "requested_type": "CLOCK_OUT",
  "requested_local_time": "2026-10-08T18:00",
  "timezone": "Europe/Madrid",
  "reason": "Esqueci de registrar a saída, trabalhei até as 18h."
}
```

**Erro de regra de negócio**

```json
{ "message": "Não é possível registrar entrada agora. Próxima marcação esperada: início de intervalo ou saída." }
```

---

## 11. Estrutura de pastas

```
.
├── back-end/
│   ├── prisma/
│   │   ├── schema.prisma        # modelagem
│   │   ├── migrations/          # histórico versionado do banco
│   │   └── seed.ts              # dados de avaliação
│   └── src/
│       ├── bin/server.ts        # ponto de entrada
│       ├── app.ts               # middlewares globais e rotas
│       ├── database/client.ts   # Prisma Client
│       ├── routes/
│       ├── controllers/
│       ├── services/            # regras de negócio
│       ├── repositories/        # acesso a dados
│       ├── dtos/
│       ├── middlewares/         # autenticação, autorização, erros
│       ├── errors/
│       └── types/
├── front-end/
│   └── src/
│       ├── api/
│       ├── auth/
│       ├── components/
│       ├── pages/
│       └── utils/
├── docker-compose.yml
└── README.md
```

---

## 12. Limitações e próximos passos

Itens deixados de fora conscientemente nesta primeira versão, em ordem aproximada de prioridade:

- **Tela de cadastros para o RH.** Unidades, times e colaboradores já podem ser gerenciados pela API, com todas as regras e permissões, mas ainda não pela interface.
- **Testes automatizados**, começando pelos services de maior risco: o cálculo da jornada (`summarize`), a sequência de marcações e a aprovação de ajustes.
- **Feriados por país** no cálculo da jornada esperada.
- **Regras trabalhistas por país**, como o intervalo mínimo para jornadas acima de 6 horas no Brasil e o limite de horas da diretiva europeia de tempo de trabalho.
- **Reabertura de mês fechado** pelo RH, com justificativa registrada.
- **Validação de entrada com uma biblioteca de schemas** (como Zod), gerando mensagens por campo.
- **Resumo do fechamento em uma única rota.** Hoje a tela de fechamento faz uma consulta por colaborador, o que é suficiente para o porte atual, mas não escala para centenas de pessoas.
- **Sessão mais robusta:** token em cookie `httpOnly` em vez de `localStorage`, renovação de token e recuperação de senha. Hoje, um colaborador desativado mantém o acesso até o token expirar (no máximo 8 horas).
- **Viagens como entidade própria**, com período, destino e motivo, e geolocalização opcional para confirmar o país da marcação.
- **Interface em outros idiomas** (espanhol e inglês), dada a operação europeia.
- **Exportação do fechamento** para a folha de pagamento.
- **Registro de ponto sem conexão** (PWA), sincronizado quando a internet voltar, útil em viagens.


---

## 13. Uso de ferramentas de IA

Utilizei um assistente de IA como apoio durante o desenvolvimento, principalmente para discutir alternativas de modelagem, revisar decisões e acelerar a escrita de código repetitivo.

As decisões de arquitetura e as regras de negócio documentadas acima foram analisadas e validadas por mim, e consigo explicar e defender cada uma delas. Todo o código foi revisado, executado e testado localmente antes da entrega.