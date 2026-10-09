# Controle de Jornada · Dungeons & Dragons Group

Plataforma web interna para registro e acompanhamento da jornada de trabalho de colaboradores distribuídos entre **Brasil e Europa**, com suporte a trabalho remoto e viagens internacionais.

> Desafio técnico desenvolvido por **<Miguel de Moura Oliveira>**  · <seu miguelmoura112@gmail.com>
> Tempo aproximado de desenvolvimento: **<X horas>**

---

## Sumário

1. [Interpretação do cenário](#1-interpretação-do-cenário)
2. [Funcionalidades](#2-funcionalidades)
3. [Stack](#3-stack)
4. [Arquitetura](#4-arquitetura)
5. [Modelagem de dados](#5-modelagem-de-dados)
6. [Decisões técnicas](#6-decisões-técnicas)
7. [Como executar](#7-como-executar)
8. [Dados para avaliação](#8-dados-para-avaliação)
9. [Estrutura de pastas](#9-estrutura-de-pastas)
10. [Limitações e próximos passos](#10-limitações-e-próximos-passos)

---

## 1. Interpretação do cenário

Antes de escrever código, li o enunciado buscando os problemas reais da empresa. Cada trecho virou um requisito da modelagem:

| O que o enunciado diz | Como interpretei | Onde isso aparece na solução |
|---|---|---|
| Colaboradores entre Brasil e Europa, com viagens frequentes | **Fuso horário é o problema central.** Um registro precisa saber *quando* e *onde* aconteceu. A Europa tem horário de verão; o Brasil não. | Cada marcação guarda o instante em UTC + o fuso IANA + o país |
| Inconsistências nos fechamentos mensais | Registros não podem ser editados livremente | Marcações imutáveis, ajustes com aprovação e fechamento mensal |
| Comunicação entre colaboradores, gestores e RH | Três perfis com responsabilidades diferentes | Papéis `EMPLOYEE`, `MANAGER` e `HR` |
| Parte da equipe atua remotamente | A modalidade de trabalho é uma informação relevante | Modalidade de contrato no colaborador e modalidade do dia em cada marcação |
| "Registro das atividades relacionadas à jornada" | Entrada, início de intervalo, fim de intervalo e saída | Tipos de marcação `CLOCK_IN`, `BREAK_START`, `BREAK_END`, `CLOCK_OUT` |

---

## 2. Funcionalidades

- [ ] Cadastro de unidades, times e colaboradores
- [ ] Registro de marcações (entrada, intervalo, retorno, saída) com horário carimbado pelo servidor
- [ ] Validação da sequência de marcações
- [ ] Detecção automática do fuso horário do navegador
- [ ] Visualização das marcações no fuso local de onde foram feitas
- [ ] Jornada diária calculada: horas trabalhadas, intervalo, saldo e status
- [ ] Solicitação de ajuste de marcação com justificativa
- [ ] Aprovação ou rejeição de ajustes pelo gestor
- [ ] Fechamento mensal pelo RH, bloqueando alterações no período

> Marque os itens concluídos antes de entregar. Itens não feitos vão para a seção 10.

---

## 3. Stack

| Camada | Tecnologias |
|---|---|
| Back-end | Node.js, Express, TypeScript |
| Banco de dados | PostgreSQL, Prisma ORM 7 (com migrations) |
| Datas e fusos | Luxon |
| Front-end | React, TypeScript, Vite, Bootstrap, React Router |

---

## 4. Arquitetura

O back-end segue uma arquitetura em camadas, onde cada camada tem uma única responsabilidade e só conhece a camada imediatamente abaixo:

```
route        → qual endpoint?
controller   → como tratar a requisição HTTP?
service      → quais regras de negócio se aplicam?
repository   → como buscar e gravar os dados?
Prisma Client → como falar com o PostgreSQL?
```

Complementam as camadas:

- **DTOs**: tipam os dados que entram na aplicação.
- **errors**: erros padronizados (`NotFoundError` → 404, `BusinessRuleError` → 422).

As regras de negócio (cálculo de fuso, sequência de marcações, bloqueio de mês fechado) ficam **apenas nos services**. Os repositories não contêm regra nenhuma.

---

## 5. Modelagem de dados

```mermaid
erDiagram
    Office ||--o{ Employee : "lota"
    Team ||--o{ Employee : "agrupa"
    Employee ||--o{ Team : "gerencia"
    Employee ||--o{ TimeEntry : "registra"
    Employee ||--o{ AdjustmentRequest : "solicita"
    Employee ||--o{ AdjustmentRequest : "revisa"
    TimeEntry |o--o{ AdjustmentRequest : "corrigida por"
    Employee ||--o{ MonthlyClosing : "possui"

    Office {
        int id PK
        string name
        char country_code
        string timezone
    }
    Employee {
        int id PK
        string name
        string email UK
        enum role
        enum work_mode
        string home_timezone
        int daily_expected_minutes
        int office_id FK
        int team_id FK
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
        string reason
        enum status
        int reviewed_by_id FK
    }
    MonthlyClosing {
        int id PK
        int employee_id FK
        char year_month
        enum status
        int balance_minutes
    }
```

O schema completo está em [`back-end/prisma/schema.prisma`](back-end/prisma/schema.prisma).

---

## 6. Decisões técnicas

### 6.1 Horário em UTC + fuso IANA da marcação

Cada marcação guarda `occurred_at` em UTC (`timestamptz`) e o `timezone` de onde foi feita (ex: `Europe/Lisbon`).

- **Por quê:** durações são calculadas em UTC, então mudanças de fuso ou de horário de verão no meio da jornada não geram erro. A exibição usa o fuso original, então o RH no Brasil vê "09:00 (Lisboa)" e não "05:00".
- **Alternativa descartada:** guardar o horário local como texto. Torna o cálculo de horas ambíguo em viagens e na troca de horário de verão.

Exemplo de um colaborador da unidade de São Paulo trabalhando em Lisboa:

```json
{
  "type": "CLOCK_IN",
  "occurred_at": "2026-10-20T08:00:00.000Z",
  "timezone": "Europe/Lisbon",
  "utc_offset_minutes": 60,
  "work_date": "2026-10-20",
  "country_code": "PT",
  "work_mode": "TRAVEL"
}
```

### 6.2 O horário da marcação é definido pelo servidor

O cliente envia apenas o tipo da marcação, o fuso, o país e a modalidade. O instante é carimbado pelo servidor.

- **Por quê:** impede registros com horário manipulado pelo relógio do computador, um dos problemas de inconsistência relatados no cenário.

### 6.3 `work_date` calculado no fuso da marcação

A data da jornada é a data **local** de onde a pessoa está, não a data em UTC (às 22:30 em São Paulo já é o dia seguinte em UTC). Para jornadas que passam da meia-noite, todas as marcações herdam o `work_date` da entrada.

### 6.4 Marcações são imutáveis

Marcações nunca são editadas nem apagadas. Uma correção vira uma **solicitação de ajuste** que o gestor aprova. Ao aprovar, uma nova marcação é criada (`source = ADJUSTMENT`) e a original recebe `superseded_at`, saindo do cálculo mas permanecendo para auditoria.

- **Por quê:** é a principal resposta ao problema das planilhas: todo dado tem origem rastreável.
- **Consequência:** `TimeEntry` não tem rotas de `PUT` nem `DELETE`. Nem toda entidade precisa de CRUD completo.

### 6.5 Fechamento mensal

Depois que o RH fecha o mês de um colaborador, nenhuma marcação ou ajuste é aceito para aquele período.

### 6.6 Jornada diária calculada, não armazenada

Horas trabalhadas, intervalo e saldo são calculados a partir das marcações. Isso evita dados duplicados que podem divergir. Se o volume crescer, o cálculo pode ser materializado em uma tabela própria.

### 6.7 Sem autenticação na v1

Para priorizar o núcleo do problema (registro e cálculo da jornada), a v1 não tem login: o usuário atual é escolhido em um seletor no front-end. A modelagem já tem papéis (`role`), então adicionar autenticação com JWT é um passo natural (seção 10).

---

## 7. Como executar

### Pré-requisitos

- Node.js 20 ou superior
- PostgreSQL: via Docker (recomendado) **ou** um banco em nuvem, como o Prisma Postgres

### 7.1 Clonar o repositório

```bash
git clone https://github.com/<seu-usuario>/<nome-do-repo>.git
cd <nome-do-repo>
```

### 7.2 Subir o banco de dados (Docker)

```bash
docker compose up -d
```

Isso cria um PostgreSQL local na porta `5432`, com usuário `postgres`, senha `postgres` e banco `jornada`.

### 7.3 Back-end

```bash
cd back-end
cp .env.example .env
```

Preencha o `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/jornada"
```

Instale as dependências, crie as tabelas, popule com dados de exemplo e inicie:

```bash
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

A API ficará disponível em `http://localhost:8888`.

### 7.4 Front-end

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

## 8. Dados para avaliação

### Usuários criados pelo seed

| Nome | Papel | Unidade | Situação para testar |
|---|---|---|---|
| Ana | RH | São Paulo | Fechar o mês |
| Bruno | Gestor | Lisboa | Aprovar ajustes do time |
| Carla | Colaboradora | São Paulo | Marcações feitas em viagem a Lisboa |
| Diego | Colaborador | Madri (remoto) | Jornada com ajuste pendente |

> Ajuste esta tabela para refletir o seu `prisma/seed.ts`.

### Roteiro sugerido de avaliação

1. Abra o front-end e selecione **Carla**.
2. Veja as marcações da viagem a Lisboa exibidas no horário local de Lisboa.
3. Registre uma entrada e tente registrar outra entrada em seguida: o sistema bloqueia.
4. Selecione **Bruno** e aprove o ajuste pendente de Diego.
5. Selecione **Ana** e feche o mês de um colaborador; depois tente registrar algo naquele mês.

### Endpoints

| Método | Rota | Descrição |
|---|---|---|
| GET, POST | `/offices` | Listar e criar unidades |
| GET, PUT, DELETE | `/offices/:id` | Consultar, atualizar e excluir unidade |
| GET, POST | `/teams` | Listar e criar times |
| GET, POST | `/employees` | Listar e criar colaboradores |
| GET, PUT, DELETE | `/employees/:id` | Consultar, atualizar e excluir colaborador |
| POST | `/employees/:id/time-entries` | Registrar marcação |
| GET | `/employees/:id/time-entries?from=&to=` | Listar marcações do período |
| GET | `/employees/:id/workdays?month=2026-10` | Jornada calculada por dia |
| GET, POST | `/adjustment-requests` | Listar e solicitar ajustes |
| PATCH | `/adjustment-requests/:id/review` | Aprovar ou rejeitar ajuste |
| POST | `/monthly-closings` | Fechar o mês de um colaborador |

Exemplo de registro de marcação:

```http
POST /employees/3/time-entries
Content-Type: application/json

{
  "type": "CLOCK_IN",
  "timezone": "Europe/Lisbon",
  "country_code": "PT",
  "work_mode": "TRAVEL"
}
```

Respostas de erro seguem o formato:

```json
{ "message": "Não é possível registrar saída sem uma entrada em aberto." }
```

---

## 9. Estrutura de pastas

```
.
├── back-end/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   └── src/
│       ├── bin/server.ts
│       ├── app.ts
│       ├── database/client.ts
│       ├── errors/
│       ├── dto/
│       ├── repositories/
│       ├── services/
│       ├── controllers/
│       └── routes/
├── front-end/
│   └── src/
├── docker-compose.yml
└── README.md
```

---

## 10. Limitações e próximos passos

Itens deixados de fora conscientemente nesta primeira versão:

- **Autenticação e autorização** com JWT, aplicando as permissões de cada papel nas rotas
- **Feriados por país** no cálculo da jornada esperada
- **Regras trabalhistas por país** (CLT no Brasil, diretiva europeia de tempo de trabalho)
- **Entidade própria para viagens**, com período, destino e motivo
- **Geolocalização** para confirmar o país da marcação
- **Exportação** do fechamento mensal para a folha de pagamento
- **Testes automatizados** dos services, principalmente das regras de fuso e sequência
