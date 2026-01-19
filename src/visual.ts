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
        if (!this.dataView || !this.dataView.table) {
            alert("Nenhum dado disponível para processar!");
            return;
        }

        this.button.disabled = true;
        this.button.textContent = "⏳ Gerando PDFs...";
        this.statusText.textContent = "Processando dados...";

        try {
            const zipBlob = await this.pdfGenerator.generatePDFsAndZip(this.dataView);
            
            // Download do ZIP
            const url = URL.createObjectURL(zipBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'CAMPO_MINADO_POR_VENDEDOR.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            this.statusText.textContent = "✅ Download concluído com sucesso!";
            this.button.textContent = "📥 Baixar Base";
            this.button.disabled = false;
        } catch (error) {
            console.error("Erro ao gerar PDFs:", error);
            this.statusText.textContent = "❌ Erro ao gerar PDFs. Verifique o console.";
            this.button.textContent = "📥 Baixar Base";
            this.button.disabled = false;
            alert("Erro ao gerar PDFs: " + error.message);
        }
    }
}
