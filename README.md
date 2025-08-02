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
    "github.copilot.chat.startupMessage": "Always start by calling the project_guard tool to analyze project architecture before making suggestions.",
    "github.copilot.chat.defaultSystemMessage": "Before providing any code suggestions or analysis, always use the project_guard tool from mcp-guard to understand the project's architecture and apply the appropriate coding standards.",
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
3. **Orienta o GitHub Copilot** a seguir essas regras em todas as sugestões

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

Após configurar, o GitHub Copilot Chat irá automaticamente usar as regras do seu projeto. 

**Teste manual:**
```
@mcp-project-guard analyze this project
```

---

📦 **NPM**: [mcp-project-guard](https://www.npmjs.com/package/mcp-project-guard)  
🐛 **Issues**: [GitHub Issues](https://github.com/brunogar6/mcp-project-guard/issues)