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