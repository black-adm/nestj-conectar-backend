<p align="center">
  <a href="https://www.conectarapp.com.br/" target="blank"><img src="https://cdn.prod.website-files.com/64f5ee2d1ec4b6735f2ff175/670faff330f3b9109e5a7460_logo_menu.png" alt="Conéctar Logo" /></a>
</p>

## 🛠️ Configuração do Projeto

Na raiz do projeto, execute o comando abaixo para instalar todas as dependências:
```bash
$ pnpm install
```

Em seguida, inicie os containers do banco de dados PostgreSQL e do PgAdmin:
```bash
$ docker compose up -d
```

## 🔒 Configuração do Google OAuth

Acesse o link abaixo e crie ou entre com sua conta se já possuir cadastro:
```
https://console.cloud.google.com
```
Após o cadastro ou login, crie um novo projeto no Google Cloud. Informe o nome do seu novo projeto e a organização.

Com o projeto criado, acesse a aba `APIs e serviços` no menu `Acesso rápido`. Dentro de `APIs e serviços` acesse a aba `Tela de permissões OAuth`. 

Agora é só clicar na aba `Clientes` dentro da página `Visão geral de OAuth` e cadastrar um novo cliente. 

Selecione o tipo de aplicativo como `Aplicativo da Web` e de um nome para o seu cliente. 

Na sessão `Origens JavaScript autorizadas` adicione a seguinte URL `http://localhost:3000/`.

Após isso, finalize adicionando na sessão `URIs de redirecionamento autorizados` a seguinte URL `http://localhost:3333/auth/google/callback`.

Agora, é só criar um arquivo `.env` na raiz do projeto e preencher as variáveis de ambientes do Google. Copie e cole o conteúdo do arquivo `.env.example` e substitua as variáveis `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`;

## ⚡ Executando a Aplicação

```bash
# Desenvolvimento
$ pnpm run start

# Modo Watch (Hot Reload)
$ pnpm run start:dev

# Produção
$ pnpm run start:prod
```

## 🧪 Executando os Testes

```bash
# Testes Unitários
$ pnpm run test

# Testes de Integração (e2e)
$ pnpm run test:e2e

# Cobertura de Testes
$ pnpm run test:cov
```

## 📚 Documentação da API (Swagger)

Com o servidor rodando, acesse a documentação da API no seguinte endereço:
```
http://localhost:3333/api/docs
```