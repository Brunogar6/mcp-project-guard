# MCP Guard - Architectural Validation Server

Um servidor MCP (Model Context Protocol) que analisa projetos e define regras de arquitetura para diferentes linguagens de programação.

## Funcionalidades

✅ **Detecção automática de linguagem** - Suporta JavaScript, TypeScript, Python, Java, C#, Go, Rust, PHP e outras  
✅ **Regras específicas por linguagem** - Cada linguagem tem suas próprias convenções  
✅ **Análise de estrutura de pastas** - Define padrões de organização adequados  
✅ **Configuração flexível** - Adapta-se ao projeto existente  

## Linguagens Suportadas

| Linguagem | Pastas Padrão | Extensões | Arquivos de Config |
|-----------|---------------|-----------|-------------------|
| **JavaScript** | src, test, tests, lib | .js, .mjs | package.json, .eslintrc |
| **TypeScript** | src, test, tests, dist, build | .ts, .tsx | package.json, tsconfig.json |
| **Python** | src, tests, app, core | .py | requirements.txt, pyproject.toml |
| **Java** | src/main/java, src/test/java | .java | pom.xml, build.gradle |
| **C#** | src, tests, bin, obj | .cs | .csproj, .sln |
| **Go** | cmd, internal, pkg, test | .go | go.mod, go.sum |
| **Rust** | src, tests, target | .rs | Cargo.toml, Cargo.lock |
| **PHP** | src, tests, vendor | .php | composer.json, composer.lock |

## Instalação

```bash
npm install
```

## Como Usar

### 1. Como servidor MCP standalone

```bash
npm start
```

### 2. Em outro projeto (configuração do Claude Desktop)

Adicione ao seu arquivo de configuração do Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json` no Mac ou `%APPDATA%\Claude\claude_desktop_config.json` no Windows):

```json
{
  "mcpServers": {
    "mcp-guard": {
      "command": "node",
      "args": ["/caminho/para/mcp-guard/index.js"],
      "env": {}
    }
  }
}
```

### 3. Testando manualmente

```bash
# Testa no diretório atual
echo '{"method": "tools/call", "params": {"name": "project_guard", "arguments": {}}}' | node index.js

# Testa em um projeto específico
echo '{"method": "tools/call", "params": {"name": "project_guard", "arguments": {"path": "/caminho/para/projeto"}}}' | node index.js
```

## Exemplo de Saída

```json
{
  "summary": {
    "detectedLanguage": "typescript",
    "layers": ["domain", "application", "infrastructure"],
    "folderPattern": ["src", "test", "tests", "dist", "build"],
    "fileExtensions": [".ts", ".tsx"],
    "configFiles": ["package.json", "tsconfig.json", ".eslintrc", "jest.config.js"],
    "allowedLanguages": ["typescript"]
  },
  "instructions": "You must generate code following these rules:\n    - Use only layers: domain, application, infrastructure\n    - Respect folder structure: src, test, tests, dist, build\n    - Do not create files outside these folders\n    - Language: typescript\n    - Follow conventions already present in the existing code."
}
```

## Arquitetura do Projeto

```
mcp-guard/
├── index.js           # Servidor MCP principal
├── package.json       # Configuração do projeto
└── README.md         # Este arquivo
```

## Desenvolvimento

Para desenvolvimento com auto-reload:

```bash
npm run dev
```

## Contribuição

1. Fork o repositório
2. Crie uma branch para sua feature
3. Faça commit das mudanças
4. Abra um Pull Request

## Licença

MIT