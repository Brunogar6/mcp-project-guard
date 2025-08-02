#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";

function analyzeArchitecture(projectPath) {
    const detectedLanguage = detectProjectLanguage(projectPath);
    const commonLayers = ["domain", "application", "infrastructure"];
    
    // Language-specific configurations
    const languageConfigs = {
        javascript: {
            layers: commonLayers,
            folderPattern: ["src", "test", "tests", "lib"],
            fileExtensions: [".js", ".mjs"],
            configFiles: ["package.json", ".eslintrc", "jest.config.js"]
        },
        typescript: {
            layers: commonLayers,
            folderPattern: ["src", "test", "tests", "dist", "build"],
            fileExtensions: [".ts", ".tsx"],
            configFiles: ["package.json", "tsconfig.json", ".eslintrc", "jest.config.js"]
        },
        python: {
            layers: ["domain", "application", "infrastructure", "adapters"],
            folderPattern: ["src", "tests", "app", "core"],
            fileExtensions: [".py"],
            configFiles: ["requirements.txt", "pyproject.toml", "setup.py", "poetry.lock"]
        },
        java: {
            layers: ["domain", "application", "infrastructure", "presentation"],
            folderPattern: ["src/main/java", "src/test/java", "target"],
            fileExtensions: [".java"],
            configFiles: ["pom.xml", "build.gradle", "gradle.properties"]
        },
        csharp: {
            layers: ["Domain", "Application", "Infrastructure", "Presentation"],
            folderPattern: ["src", "tests", "bin", "obj"],
            fileExtensions: [".cs"],
            configFiles: [".csproj", ".sln", "appsettings.json"]
        },
        go: {
            layers: ["domain", "application", "infrastructure", "interfaces"],
            folderPattern: ["cmd", "internal", "pkg", "test"],
            fileExtensions: [".go"],
            configFiles: ["go.mod", "go.sum"]
        },
        rust: {
            layers: ["domain", "application", "infrastructure", "adapters"],
            folderPattern: ["src", "tests", "target"],
            fileExtensions: [".rs"],
            configFiles: ["Cargo.toml", "Cargo.lock"]
        },
        php: {
            layers: ["Domain", "Application", "Infrastructure", "Presentation"],
            folderPattern: ["src", "tests", "vendor"],
            fileExtensions: [".php"],
            configFiles: ["composer.json", "composer.lock", "phpunit.xml"]
        }
    };

    const config = languageConfigs[detectedLanguage] || {
        layers: commonLayers,
        folderPattern: ["src", "test", "tests"],
        fileExtensions: [".*"],
        configFiles: []
    };

    return {
        detectedLanguage,
        layers: config.layers,
        folderPattern: config.folderPattern,
        fileExtensions: config.fileExtensions,
        configFiles: config.configFiles,
        allowedLanguages: [detectedLanguage]
    };
}

function detectProjectLanguage(projectPath) {
    try {
        // Check for specific config files
        const files = fs.readdirSync(projectPath);
        
        // JavaScript/TypeScript detection
        if (files.includes('package.json')) {
            const packageJson = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf8'));
            if (packageJson.devDependencies?.typescript || packageJson.dependencies?.typescript || files.includes('tsconfig.json')) {
                return 'typescript';
            }
            return 'javascript';
        }
        
        // Python detection
        if (files.some(f => ['requirements.txt', 'pyproject.toml', 'setup.py', 'poetry.lock'].includes(f))) {
            return 'python';
        }
        
        // Java detection
        if (files.some(f => ['pom.xml', 'build.gradle'].includes(f))) {
            return 'java';
        }
        
        // C# detection
        if (files.some(f => f.endsWith('.csproj') || f.endsWith('.sln'))) {
            return 'csharp';
        }
        
        // Go detection
        if (files.includes('go.mod')) {
            return 'go';
        }
        
        // Rust detection
        if (files.includes('Cargo.toml')) {
            return 'rust';
        }
        
        // PHP detection
        if (files.includes('composer.json')) {
            return 'php';
        }
        
        // Fallback: detect by file extensions
        const allFiles = getAllFiles(projectPath);
        const extensions = allFiles.map(f => path.extname(f).toLowerCase());
        
        const extensionCounts = {};
        extensions.forEach(ext => {
            extensionCounts[ext] = (extensionCounts[ext] || 0) + 1;
        });
        
        const mostCommonExt = Object.keys(extensionCounts).reduce((a, b) => 
            extensionCounts[a] > extensionCounts[b] ? a : b, ''
        );
        
        const extensionToLanguage = {
            '.js': 'javascript',
            '.mjs': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.py': 'python',
            '.java': 'java',
            '.cs': 'csharp',
            '.go': 'go',
            '.rs': 'rust',
            '.php': 'php'
        };
        
        return extensionToLanguage[mostCommonExt] || 'unknown';
        
    } catch (error) {
        return 'unknown';
    }
}

function getAllFiles(dirPath, filesList = []) {
    try {
        const files = fs.readdirSync(dirPath);
        files.forEach(file => {
            const filePath = path.join(dirPath, file);
            if (fs.statSync(filePath).isDirectory()) {
                if (!file.startsWith('.') && !['node_modules', 'target', 'build', 'dist', 'vendor'].includes(file)) {
                    getAllFiles(filePath, filesList);
                }
            } else {
                filesList.push(filePath);
            }
        });
    } catch (error) {
        // Ignore errors for inaccessible directories
    }
    return filesList;
}

const server = new Server(
  {
    name: "mcp-guard",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "project_guard",
        description: "Analyze project architecture and return validation rules",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Project path to analyze",
              default: process.cwd()
            }
          }
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === "project_guard") {
    const projectPath = args?.path || process.cwd();
    const architecture = analyzeArchitecture(projectPath);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            summary: architecture,
            instructions: `You must generate code following these rules:
    - Use only layers: ${architecture.layers.join(", ")}
    - Respect folder structure: ${architecture.folderPattern.join(", ")}
    - Do not create files outside these folders
    - Language: ${architecture.allowedLanguages.join(", ")}
    - Follow conventions already present in the existing code.`
          }, null, 2)
        }
      ]
    };
  }
  
  throw new Error(`Unknown tool: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
