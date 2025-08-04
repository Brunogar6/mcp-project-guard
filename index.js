#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";

function analyzeExistingPatterns(projectPath) {
    const patterns = {
        components: [],
        hooks: [],
        services: [],
        utils: [],
        patterns: [],
        imports: [],
        exports: []
    };

    try {
        const allFiles = getAllFiles(projectPath);
        const codeFiles = allFiles.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cs', '.go', '.rs', '.php'].includes(ext);
        });

        codeFiles.forEach(filePath => {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const relativePath = path.relative(projectPath, filePath);
                
                const componentMatches = content.match(/(?:class|function|const)\s+([A-Z][a-zA-Z0-9]*)/g);
                if (componentMatches) {
                    componentMatches.forEach(match => {
                        const name = match.split(/\s+/)[1];
                        patterns.components.push({
                            name,
                            file: relativePath,
                            type: detectComponentType(content, name)
                        });
                    });
                }

                const hookMatches = content.match(/(?:use[A-Z][a-zA-Z0-9]*|on[A-Z][a-zA-Z0-9]*)/g);
                if (hookMatches) {
                    hookMatches.forEach(hook => {
                        patterns.hooks.push({
                            name: hook,
                            file: relativePath
                        });
                    });
                }

                const importMatches = content.match(/import\s+.*?from\s+['"]([^'"]+)['"]/g);
                if (importMatches) {
                    importMatches.forEach(imp => {
                        const module = imp.match(/from\s+['"]([^'"]+)['"]/)?.[1];
                        if (module && !module.startsWith('.')) {
                            patterns.imports.push({
                                module,
                                file: relativePath,
                                statement: imp
                            });
                        }
                    });
                }

                detectSpecificPatterns(content, relativePath, patterns);

            } catch (error) {
                
            }
        });

    } catch (error) {
        
    }

    return patterns;
}

function detectComponentType(content, componentName) {
    const lowerContent = content.toLowerCase();
    const lowerName = componentName.toLowerCase();
    
    if (lowerName.includes('modal') || lowerContent.includes('modal')) return 'modal';
    if (lowerName.includes('button') || lowerContent.includes('onclick')) return 'button';
    if (lowerName.includes('form') || lowerContent.includes('onsubmit')) return 'form';
    if (lowerName.includes('table') || lowerContent.includes('thead')) return 'table';
    if (lowerName.includes('card') || lowerContent.includes('card')) return 'card';
    if (lowerName.includes('header') || lowerContent.includes('nav')) return 'header';
    if (lowerName.includes('footer')) return 'footer';
    if (lowerName.includes('sidebar')) return 'sidebar';
    if (lowerName.includes('service') || lowerContent.includes('api')) return 'service';
    if (lowerName.includes('hook') || lowerName.startsWith('use')) return 'hook';
    
    return 'component';
}

function detectSpecificPatterns(content, filePath, patterns) {
    if (content.includes('useState') || content.includes('setState')) {
        patterns.patterns.push({
            type: 'state-management',
            pattern: 'React State',
            file: filePath,
            example: content.match(/const\s+\[[^\]]+\]\s*=\s*useState[^;]+;?/)?.[0]
        });
    }

    if (content.includes('fetch') || content.includes('axios') || content.includes('api')) {
        patterns.patterns.push({
            type: 'api-call',
            pattern: 'API Integration',
            file: filePath,
            example: content.match(/(fetch|axios)\([^)]+\)/)?.[0]
        });
    }

    if (content.includes('styled') || content.includes('className') || content.includes('css')) {
        patterns.patterns.push({
            type: 'styling',
            pattern: 'Component Styling',
            file: filePath
        });
    }

    if (content.includes('validate') || content.includes('schema') || content.includes('yup') || content.includes('joi')) {
        patterns.patterns.push({
            type: 'validation',
            pattern: 'Form Validation',
            file: filePath
        });
    }
}

function generatePatternGuidance(patterns, requestedComponent = 'component') {
    let guidance = '\n\n=== EXISTING PATTERNS IN PROJECT ===\n';
    
    const similarComponents = patterns.components.filter(comp => 
        comp.type === requestedComponent || 
        comp.name.toLowerCase().includes(requestedComponent.toLowerCase())
    );

    if (similarComponents.length > 0) {
        guidance += `\nSIMILAR COMPONENTS FOUND:\n`;
        similarComponents.forEach(comp => {
            guidance += `- ${comp.name} (${comp.type}) in ${comp.file}\n`;
        });
        guidance += `\n=> Follow the same pattern as these existing components!\n`;
    }

    const commonImports = {};
    patterns.imports.forEach(imp => {
        commonImports[imp.module] = (commonImports[imp.module] || 0) + 1;
    });
    
    const topImports = Object.entries(commonImports)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    if (topImports.length > 0) {
        guidance += `\nCOMMON IMPORTS IN PROJECT:\n`;
        topImports.forEach(([module, count]) => {
            guidance += `- ${module} (used ${count} times)\n`;
        });
    }

    const patternTypes = {};
    patterns.patterns.forEach(p => {
        if (!patternTypes[p.type]) patternTypes[p.type] = [];
        patternTypes[p.type].push(p);
    });

    Object.entries(patternTypes).forEach(([type, typePatterns]) => {
        guidance += `\n${type.toUpperCase()} PATTERNS:\n`;
        typePatterns.slice(0, 3).forEach(p => {
            guidance += `- ${p.pattern} in ${p.file}\n`;
            if (p.example) {
                guidance += `  Example: ${p.example}\n`;
            }
        });
    });

    return guidance;
}

function analyzeArchitecture(projectPath) {
    const detectedLanguage = detectProjectLanguage(projectPath);
    const commonLayers = ["domain", "application", "infrastructure"];
    
    const existingPatterns = analyzeExistingPatterns(projectPath);

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
        allowedLanguages: [detectedLanguage],
        existingPatterns
    };
}

function detectProjectLanguage(projectPath) {
    try {
        const files = fs.readdirSync(projectPath);

        if (files.includes('package.json')) {
            const packageJson = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf8'));
            if (packageJson.devDependencies?.typescript || packageJson.dependencies?.typescript || files.includes('tsconfig.json')) {
                return 'typescript';
            }
            return 'javascript';
        }

        if (files.some(f => ['requirements.txt', 'pyproject.toml', 'setup.py', 'poetry.lock'].includes(f))) {
            return 'python';
        }

        if (files.some(f => ['pom.xml', 'build.gradle'].includes(f))) {
            return 'java';
        }

        if (files.some(f => f.endsWith('.csproj') || f.endsWith('.sln'))) {
            return 'csharp';
        }

        if (files.includes('go.mod')) {
            return 'go';
        }

        if (files.includes('Cargo.toml')) {
            return 'rust';
        }

        if (files.includes('composer.json')) {
            return 'php';
        }

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
        
    }
    return filesList;
}

const server = new Server(
  {
    name: "mcp-project-guard",
    version: "1.0.3",
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
    const requestedComponent = args?.component || 'component';
    const architecture = analyzeArchitecture(projectPath);
    
    const patternGuidance = generatePatternGuidance(architecture.existingPatterns, requestedComponent);

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
    - Follow conventions already present in the existing code.
    
    IMPORTANT: Always look for similar existing components before creating new ones!
    ${patternGuidance}
    
    => Before creating anything new, check if there are similar patterns in the project and follow the same approach!`
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
