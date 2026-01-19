import powerbi from "powerbi-visuals-api";
import IVisual = powerbi.extensibility.visual.IVisual;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import DataView = powerbi.DataView;
import { PDFGenerator } from "./pdfGenerator";

export class Visual implements IVisual {
    private target: HTMLElement;
    private host: IVisualHost;
    private button: HTMLButtonElement;
    private statusText: HTMLDivElement;
    private dataView: DataView;
    private pdfGenerator: PDFGenerator;

    constructor(options: VisualConstructorOptions) {
        this.target = options.element;
        this.host = options.host;
        this.pdfGenerator = new PDFGenerator();

        // Criar container principal
        const container = document.createElement("div");
        container.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            padding: 20px;
            font-family: 'Segoe UI', Arial, sans-serif;
        `;

        // Criar botão de download
        this.button = document.createElement("button");
        this.button.textContent = "📥 Baixar Base";
        this.button.style.cssText = `
            padding: 15px 30px;
            font-size: 16px;
            font-weight: bold;
            color: white;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            border-radius: 8px;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            transition: all 0.3s ease;
            outline: none;
        `;

        this.button.onmouseover = () => {
            this.button.style.transform = "translateY(-2px)";
            this.button.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.6)";
        };

        this.button.onmouseout = () => {
            this.button.style.transform = "translateY(0)";
            this.button.style.boxShadow = "0 4px 15px rgba(102, 126, 234, 0.4)";
        };

        this.button.onclick = () => this.downloadPDFs();

        // Criar texto de status
        this.statusText = document.createElement("div");
        this.statusText.style.cssText = `
            margin-top: 20px;
            font-size: 14px;
            color: #666;
            text-align: center;
        `;

        container.appendChild(this.button);
        container.appendChild(this.statusText);
        this.target.appendChild(container);
    }

    public update(options: VisualUpdateOptions) {
        this.dataView = options.dataViews && options.dataViews[0];

        if (!this.dataView || !this.dataView.table) {
            this.statusText.textContent = "⚠️ Arraste os campos necessários para o visual";
            this.button.disabled = true;
            this.button.style.opacity = "0.5";
            this.button.style.cursor = "not-allowed";
            return;
        }

        const rowCount = this.dataView.table.rows.length;
        this.statusText.textContent = `✅ ${rowCount} registros carregados. Clique para gerar os PDFs.`;
        this.button.disabled = false;
        this.button.style.opacity = "1";
        this.button.style.cursor = "pointer";
    }

    private async downloadPDFs() {
        console.log("=== Início do download de PDFs ===");
        console.log("Navegador:", navigator.userAgent);
        console.log("Power BI host:", this.host);
        
        if (!this.dataView || !this.dataView.table) {
            console.error("Nenhum dado disponível!");
            this.statusText.textContent = "❌ Nenhum dado disponível";
            return;
        }

        console.log("Dados disponíveis:", this.dataView.table.rows.length, "linhas");
        console.log("Colunas:", this.dataView.table.columns.map(c => c.displayName));

        this.button.disabled = true;
        this.button.textContent = "⏳ Gerando PDFs...";
        this.statusText.textContent = "Preparando dados...";

        try {
            // Extrair dados do dataView
            console.log("Extraindo dados do dataView...");
            const data = this.extractDataForAPI(this.dataView);
            console.log("Dados extraídos:", data.length, "registros");
            
            // URL da API no Heroku
            const API_URL = 'https://campo-minado-api.herokuapp.com/api/generate-pdfs';
            
            console.log("Enviando para API via form POST:", API_URL);
            this.statusText.textContent = "Enviando para servidor...";
            
            // Criar form para POST (bypass CSP)
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = API_URL;
            form.target = '_blank'; // Abre em nova aba
            form.style.display = 'none';
            
            // Adicionar dados como campo hidden
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'data';
            input.value = JSON.stringify(data);
            form.appendChild(input);
            
            // Adicionar ao DOM e submeter
            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);
            
            console.log("Form submetido com sucesso");
            this.statusText.textContent = "✅ Solicitação enviada! O download começará em uma nova aba.";

            this.button.textContent = "📥 Baixar Base";
            this.button.disabled = false;
            console.log("=== Processo finalizado ===");
        } catch (error) {
            console.error("=== ERRO ao gerar PDFs ===", error);
            console.error("Stack trace:", error.stack);
            this.statusText.textContent = `❌ Erro: ${error.message}`;
            this.button.textContent = "📥 Baixar Base";
            this.button.disabled = false;
        }
    }

    private extractDataForAPI(dataView: DataView): any[] {
        const table = dataView.table;
        const rows = table.rows;
        const columns = table.columns;

        const columnMap = {
            codVendedor: -1,
            classeProduto: -1,
            codCliente: -1,
            nomeCliente: -1,
            codProduto: -1,
            nomeProduto: -1,
            qtVendida: -1
        };

        // Mapear índices das colunas
        columns.forEach((col, idx) => {
            const roleName = col.roles;
            if (roleName["codVendedor"]) columnMap.codVendedor = idx;
            if (roleName["classeProduto"]) columnMap.classeProduto = idx;
            if (roleName["codCliente"]) columnMap.codCliente = idx;
            if (roleName["nomeCliente"]) columnMap.nomeCliente = idx;
            if (roleName["codProduto"]) columnMap.codProduto = idx;
            if (roleName["nomeProduto"]) columnMap.nomeProduto = idx;
            if (roleName["qtVendida"]) columnMap.qtVendida = idx;
        });

        return rows.map(row => ({
            codVendedor: row[columnMap.codVendedor]?.toString() || "",
            classeProduto: row[columnMap.classeProduto]?.toString() || "",
            codCliente: row[columnMap.codCliente]?.toString() || "",
            nomeCliente: row[columnMap.nomeCliente]?.toString() || "",
            codProduto: row[columnMap.codProduto]?.toString() || "",
            nomeProduto: row[columnMap.nomeProduto]?.toString() || "",
            qtVendida: Number(row[columnMap.qtVendida]) || 0
        }));
    }
}
