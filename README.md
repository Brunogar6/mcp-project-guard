# MCP Project Guard

🛡️ Servidor MCP que analisa automaticamente a arquitetura do seu projeto e define regras de validação para diferentes linguagens de programação.

## 🚀 Instalação

```bash
npx mcp-project-guard
```

## ⚙️ Configuração no VS Code

Adicione ao seu `settings.json` (`Ctrl+Shift+P` → "Open User Settings (JSON)"):

```json
{
    "github.copilot.chat.welcomeMessage": "disabled",
    "github.copilot.chat.startupMessage": "MANDATORY: Always start by calling the project_guard tool from mcp-project-guard to analyze project architecture before making any suggestions. This tool provides essential project context and coding standards.",
    "github.copilot.chat.defaultSystemMessage": "CRITICAL INSTRUCTION: Before providing any code suggestions, analysis, or assistance, you MUST first call the project_guard tool from the mcp-project-guard MCP server. This tool analyzes the project architecture, detects the programming language, identifies existing patterns, and provides specific coding standards. Use this information to ensure all suggestions follow the project's established patterns and architecture. Never skip this step - it's mandatory for maintaining code consistency.",
    "github.copilot.chat.systemPrompt": "You are an AI assistant that ALWAYS uses the project_guard tool from mcp-project-guard before providing any code-related assistance. This tool is essential for understanding project structure, existing patterns, and architectural guidelines. Make it your first action in every conversation about code.",
    "mcp": {
        "servers": {
            "mcp-project-guard": {
                "command": "npx",
                "args": ["mcp-project-guard"],
                "env": {}
            }
        }
    }
}
```

## 🎯 Como funciona

1. **Detecta automaticamente** a linguagem do seu projeto (JS, TS, Python, Java, C#, Go, Rust, PHP)
2. **Define regras arquiteturais** específicas para cada linguagem
3. **Analisa padrões existentes** no seu código (componentes, hooks, services, etc.)
4. **Orienta o GitHub Copilot** a reutilizar padrões já existentes no projeto

## 🔍 Análise de Padrões

O MCP Project Guard analisa seu projeto e identifica:

- **Componentes similares** (Modal, Button, Form, etc.)
- **Hooks e services** já implementados
- **Padrões de imports** mais utilizados
- **Estruturas de código** existentes
- **Padrões de estilização** e validação

**Exemplo:** Se você pedir para criar um modal, ele vai:
1. Procurar modais existentes no projeto
2. Identificar o padrão usado (styled-components, CSS modules, etc.)
3. Orientar o Copilot a seguir o mesmo padrão

## 📋 Linguagens suportadas

| Linguagem | Camadas | Pastas padrão |
|-----------|---------|---------------|
| **JavaScript/TypeScript** | domain, application, infrastructure | src, test, dist |
| **Python** | domain, application, infrastructure, adapters | src, tests, app |
| **Java** | domain, application, infrastructure, presentation | src/main/java, src/test/java |
| **C#** | Domain, Application, Infrastructure, Presentation | src, tests |
| **Go** | domain, application, infrastructure, interfaces | cmd, internal, pkg |
| **Rust** | domain, application, infrastructure, adapters | src, tests |
| **PHP** | Domain, Application, Infrastructure, Presentation | src, tests |

## 🔄 Uso

Após configurar, o GitHub Copilot Chat irá automaticamente:
- Analisar padrões existentes no projeto
- Sugerir reutilização de componentes similares  
- Manter consistência com o código existente

**Teste manual:**
```
@mcp-project-guard analyze this project
```

**Para componentes específicos:**
```
Crie um modal seguindo os padrões do projeto
```

---

📦 **NPM**: [mcp-project-guard](https://www.npmjs.com/package/mcp-project-guard)  
🐛 **Issues**: [GitHub Issues](https://github.com/brunogar6/mcp-project-guard/issues)