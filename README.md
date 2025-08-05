# MCP Project Guard

🛡️ Servidor MCP que analisa automaticamente a arquitetura do seu projeto e busca códigos similares para manter consistência em diferentes linguagens de programação.

## 🚀 Instalação

```bash
npx mcp-project-guard
```

## ⚙️ Configuração no VS Code

Adicione ao seu `settings.json` (`Ctrl+Shift+P` → "Open User Settings (JSON)"):

```json
{
    "github.copilot.chat.welcomeMessage": "disabled",
    "github.copilot.chat.startupMessage": "Use the MCP Project Guard tools to analyze architecture and find similar code patterns.",
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

## 🛠️ Tools Disponíveis

### 1. `analyze_architecture`
Analisa a arquitetura geral do projeto:
- Detecta linguagem de programação
- Define regras e camadas arquiteturais  
- Conta componentes existentes
- Retorna estrutura de pastas recomendada

### 2. `find_similar_code`
Busca códigos similares no projeto:
- Encontra componentes similares por tipo
- Extrai trechos de código relevantes
- Identifica padrões e imports usados
- Sugere reutilização de código existente

## 🎯 Como usar no GitHub Copilot

### Workflow recomendado:
```
1. @mcp-project-guard analyze_architecture
2. @mcp-project-guard find_similar_code component_type:modal
3. [Agora o Copilot tem contexto completo para gerar código]
```

### Exemplos práticos:

**Para criar um modal:**
```
@mcp-project-guard find_similar_code component_type:modal
Crie um modal para exibir detalhes do usuário
```

**Para criar uma API:**
```
@mcp-project-guard find_similar_code component_type:api search_term:fetch
Como criar uma nova rota de API?
```

**Para criar um formulário:**
```
@mcp-project-guard find_similar_code component_type:form
Preciso de um formulário de cadastro
```

**Análise geral:**
```
@mcp-project-guard analyze_architecture
Qual a estrutura recomendada para este projeto?
```

## 🔍 Verificar uso

```bash
npx mcp-check-usage
```

---

📦 **NPM**: [mcp-project-guard](https://www.npmjs.com/package/mcp-project-guard)  
🐛 **Issues**: [GitHub Issues](https://github.com/brunogar6/mcp-project-guard/issues)