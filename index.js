#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";

function logUsage(action, details = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        action,
        pid: process.pid,
        cwd: process.cwd(),
        ...details
    };

    const logDir = path.join(process.cwd(), '.mcp-logs');
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    const logFile = path.join(logDir, `mcp-usage-${new Date().toISOString().split('T')[0]}.log`);
    const logLine = JSON.stringify(logEntry) + '\n';

    try {
        fs.appendFileSync(logFile, logLine);
        console.error(`[MCP-LOG] ${timestamp} - ${action} - ${JSON.stringify(details)}`);
    } catch (error) {
        console.error(`[MCP-ERROR] Failed to write log: ${error.message}`);
    }
}

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
        version: "1.1.1",
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
                name: "analyze_architecture",
                description: "Analyze project architecture, detect language, and return validation rules",
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
            },
            {
                name: "find_similar_code",
                description: "Find existing similar components, functions, or patterns in the project",
                inputSchema: {
                    type: "object",
                    properties: {
                        component_type: {
                            type: "string",
                            description: "Type of component/code to find (e.g., 'modal', 'button', 'api', 'form', 'service')",
                            default: "component"
                        },
                        search_term: {
                            type: "string",
                            description: "Specific term to search for in code (optional)",
                            default: ""
                        },
                        path: {
                            type: "string",
                            description: "Project path to search in",
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

    if (name === "analyze_architecture") {
        const projectPath = args?.path || process.cwd();

        logUsage('ARCHITECTURE_ANALYZED', {
            tool: name,
            projectPath,
            message: 'analyze_architecture tool was called'
        });

        const architecture = analyzeArchitecture(projectPath);

        logUsage('ARCHITECTURE_COMPLETE', {
            detectedLanguage: architecture.detectedLanguage,
            componentsFound: architecture.existingPatterns.components.length,
            message: 'Architecture analysis completed'
        });

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        summary: architecture,
                        instructions: `ARCHITECTURE RULES FOR ${architecture.detectedLanguage.toUpperCase()} PROJECT:
    - Use only layers: ${architecture.layers.join(", ")}
    - Respect folder structure: ${architecture.folderPattern.join(", ")}
    - Do not create files outside these folders
    - Language: ${architecture.allowedLanguages.join(", ")}
    - Follow conventions already present in the existing code
    
    PROJECT OVERVIEW:
    - Detected ${architecture.existingPatterns.components.length} existing components
    - Found ${architecture.existingPatterns.patterns.length} code patterns
    - Project uses ${architecture.detectedLanguage} with ${architecture.layers.length} architectural layers
    
    NEXT STEP: Use find_similar_code tool to search for existing patterns before creating new code.`
                    }, null, 2)
                }
            ]
        };
    }
    else if (name === "find_similar_code") {
        const projectPath = args?.path || process.cwd();
        const componentType = args?.component_type || 'component';
        const searchTerm = args?.search_term || '';

        logUsage('SIMILAR_CODE_SEARCH', {
            tool: name,
            projectPath,
            componentType,
            searchTerm,
            message: 'find_similar_code tool was called'
        });

        const similarResults = findSimilarCode(projectPath, componentType, searchTerm);

        logUsage('SIMILAR_CODE_COMPLETE', {
            exactMatches: similarResults.exactMatches.length,
            similarMatches: similarResults.similarMatches.length,
            patternsFound: similarResults.patterns.length,
            message: 'Similar code search completed'
        });

        let guidance = `=== SIMILAR CODE ANALYSIS ===\n\n`;

        if (similarResults.exactMatches.length > 0) {
            guidance += `🎯 EXACT MATCHES (${similarResults.exactMatches.length}):\n`;
            similarResults.exactMatches.forEach(match => {
                guidance += `- ${match.file}\n`;
                if (match.snippet) {
                    guidance += `  Code preview:\n${match.snippet.substring(0, 200)}...\n\n`;
                }
            });
        }

        if (similarResults.similarMatches.length > 0) {
            guidance += `🔍 SIMILAR MATCHES (${similarResults.similarMatches.length}):\n`;
            similarResults.similarMatches.forEach(match => {
                guidance += `- ${match.file} (search: "${match.searchTerm}")\n`;
            });
            guidance += `\n`;
        }

        if (similarResults.imports.length > 0) {
            guidance += `📦 RELEVANT IMPORTS:\n`;
            const uniqueImports = [...new Set(similarResults.imports.map(i => i.import))];
            uniqueImports.slice(0, 5).forEach(imp => {
                guidance += `- ${imp}\n`;
            });
            guidance += `\n`;
        }

        if (similarResults.patterns.length > 0) {
            guidance += `🛠️ CODE PATTERNS DETECTED:\n`;
            similarResults.patterns.forEach(pattern => {
                guidance += `- ${pattern.pattern} in ${pattern.file}\n`;
            });
            guidance += `\n`;
        }

        if (similarResults.exactMatches.length === 0 && similarResults.similarMatches.length === 0) {
            guidance += `❌ NO SIMILAR CODE FOUND\n`;
            guidance += `Consider creating a new ${componentType} following the project's architecture.\n\n`;
        } else {
            guidance += `✅ RECOMMENDATION:\n`;
            guidance += `Follow the patterns found above when creating your new ${componentType}.\n`;
            guidance += `Reuse imports, structure, and coding style from existing similar components.\n\n`;
        }

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        componentType,
                        searchTerm,
                        exactMatches: similarResults.exactMatches.length,
                        similarMatches: similarResults.similarMatches.length,
                        patterns: similarResults.patterns.length,
                        guidance,
                        results: similarResults
                    }, null, 2)
                }
            ]
        };
    }

    throw new Error(`Unknown tool: ${name}`);
});

function findSimilarCode(projectPath, componentType, searchTerm = '') {
    const results = {
        exactMatches: [],
        similarMatches: [],
        codeExamples: [],
        imports: [],
        patterns: []
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
                const lowerContent = content.toLowerCase();
                const fileName = path.basename(filePath).toLowerCase();

                if (fileName.includes(componentType.toLowerCase()) ||
                    lowerContent.includes(componentType.toLowerCase())) {

                    const codeSnippet = extractRelevantCode(content, componentType);
                    results.exactMatches.push({
                        file: relativePath,
                        type: componentType,
                        snippet: codeSnippet,
                        score: 100
                    });
                }

                if (searchTerm && lowerContent.includes(searchTerm.toLowerCase())) {
                    const codeSnippet = extractCodeAroundTerm(content, searchTerm);
                    results.similarMatches.push({
                        file: relativePath,
                        searchTerm,
                        snippet: codeSnippet,
                        score: 80
                    });
                }

                const imports = extractRelevantImports(content, componentType);
                results.imports.push(...imports.map(imp => ({
                    import: imp,
                    file: relativePath
                })));

                const patterns = detectCodePatterns(content, componentType);
                results.patterns.push(...patterns.map(pattern => ({
                    ...pattern,
                    file: relativePath
                })));

            } catch (error) {

            }
        });

    } catch (error) {

    }

    return results;
}

function extractRelevantCode(content, componentType) {
    const lines = content.split('\n');
    const relevantLines = [];
    let capturing = false;
    let braceCount = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lowerLine = line.toLowerCase();

        if (lowerLine.includes(componentType.toLowerCase()) &&
            (lowerLine.includes('function') || lowerLine.includes('class') || lowerLine.includes('const'))) {
            capturing = true;
            relevantLines.push(line);
            braceCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
            continue;
        }

        if (capturing) {
            relevantLines.push(line);
            braceCount += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;

            if (braceCount <= 0 && relevantLines.length > 1) {
                break;
            }
        }

        if (relevantLines.length > 50) break;
    }

    return relevantLines.slice(0, 30).join('\n');
}

function extractCodeAroundTerm(content, searchTerm) {
    const lines = content.split('\n');
    const termIndex = lines.findIndex(line =>
        line.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (termIndex === -1) return '';

    const start = Math.max(0, termIndex - 5);
    const end = Math.min(lines.length, termIndex + 10);

    return lines.slice(start, end).join('\n');
}

function extractRelevantImports(content, componentType) {
    const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
    const imports = [];
    let match;

    while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        const fullImport = match[0];

        if (importPath.toLowerCase().includes(componentType.toLowerCase()) ||
            fullImport.toLowerCase().includes(componentType.toLowerCase()) ||
            componentType === 'modal' && (importPath.includes('dialog') || importPath.includes('popup')) ||
            componentType === 'button' && importPath.includes('btn') ||
            componentType === 'form' && importPath.includes('input')) {
            imports.push(fullImport);
        }
    }

    return imports;
}

function detectCodePatterns(content, componentType) {
    const patterns = [];

    if (componentType === 'modal') {
        if (content.includes('createPortal')) {
            patterns.push({ type: 'portal', pattern: 'React Portal usage detected' });
        }
        if (content.includes('useEffect') && content.includes('escape')) {
            patterns.push({ type: 'keyboard', pattern: 'Escape key handling detected' });
        }
        if (content.includes('backdrop') || content.includes('overlay')) {
            patterns.push({ type: 'backdrop', pattern: 'Backdrop/overlay pattern detected' });
        }
    }

    if (componentType === 'form') {
        if (content.includes('useForm') || content.includes('react-hook-form')) {
            patterns.push({ type: 'form-library', pattern: 'React Hook Form detected' });
        }
        if (content.includes('yup') || content.includes('joi') || content.includes('zod')) {
            patterns.push({ type: 'validation', pattern: 'Schema validation detected' });
        }
    }

    if (componentType === 'api' || componentType === 'service') {
        if (content.includes('axios')) {
            patterns.push({ type: 'http-client', pattern: 'Axios HTTP client detected' });
        }
        if (content.includes('fetch')) {
            patterns.push({ type: 'fetch-api', pattern: 'Fetch API detected' });
        }
    }

    return patterns;
}

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
