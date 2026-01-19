import powerbiVisualsConfigs from "eslint-plugin-powerbi-visuals";

export default [
    powerbiVisualsConfigs.configs.recommended,
    {
        ignores: ["node_modules/**", "dist/**", ".vscode/**", ".tmp/**"],
        rules: {
            "powerbi-visuals/no-document-write": "off" // Necessário para abrir nova janela com download
        }
    },
];