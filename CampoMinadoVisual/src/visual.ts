import powerbi from "powerbi-visuals-api";
import IVisual = powerbi.extensibility.visual.IVisual;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import DataView = powerbi.DataView;
import { PDFGenerator } from "./pdfGenerator";
import { VisualFormattingSettingsModel } from "./settings";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";

export class Visual implements IVisual {
    private target: HTMLElement;
    private host: IVisualHost;
    private emailInput: HTMLInputElement;
    private button: HTMLButtonElement;
    private statusText: HTMLDivElement;
    private dataView: DataView;
    private pdfGenerator: PDFGenerator;
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;

    constructor(options: VisualConstructorOptions) {
        this.target = options.element;
        this.host = options.host;
        this.pdfGenerator = new PDFGenerator();
        this.formattingSettingsService = new FormattingSettingsService();

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

        // Título
        const title = document.createElement("div");
        title.textContent = "📊 Campo Minado - Gerador de PDFs";
        title.style.cssText = `
            font-size: 20px;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 20px;
        `;

        // Campo de e-mail
        const emailLabel = document.createElement("label");
        emailLabel.textContent = "E-mail para receber o arquivo:";
        emailLabel.style.cssText = `
            font-size: 14px;
            color: #666;
            margin-bottom: 8px;
        `;

        this.emailInput = document.createElement("input");
        this.emailInput.type = "email";
        this.emailInput.placeholder = "seu@email.com";
        this.emailInput.style.cssText = `
            padding: 12px;
            font-size: 14px;
            width: 300px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            outline: none;
            margin-bottom: 20px;
            transition: border-color 0.3s;
        `;
        this.emailInput.onfocus = () => {
            this.emailInput.style.borderColor = "#667eea";
        };
        this.emailInput.onblur = () => {
            this.emailInput.style.borderColor = "#e0e0e0";
        };

        // Criar botão de enviar
        this.button = document.createElement("button");
        this.button.textContent = "📧 Enviar por E-mail";
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

        this.button.onclick = () => this.sendEmail();

        // Criar texto de status
        this.statusText = document.createElement("div");
        this.statusText.style.cssText = `
            margin-top: 20px;
            font-size: 14px;
            color: #666;
            text-align: center;
            max-width: 400px;
        `;

        container.appendChild(title);
        container.appendChild(emailLabel);
        container.appendChild(this.emailInput);
        container.appendChild(this.button);
        container.appendChild(this.statusText);
        this.target.appendChild(container);
    }

    public update(options: VisualUpdateOptions) {
        this.dataView = options.dataViews && options.dataViews[0];
        
        if (this.dataView) {
            this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(VisualFormattingSettingsModel, this.dataView);
        }

        if (!this.dataView || !this.dataView.table) {
            this.statusText.textContent = "⚠️ Arraste os campos necessários para o visual";
            this.button.disabled = true;
            this.button.style.opacity = "0.5";
            this.button.style.cursor = "not-allowed";
            return;
        }

        const rowCount = this.dataView.table.rows.length;
        this.statusText.textContent = `✅ ${rowCount} registros prontos. Digite seu e-mail e clique em enviar.`;
        this.button.disabled = false;
        this.button.style.opacity = "1";
        this.button.style.cursor = "pointer";
    }

    private async sendEmail() {
        console.log("=== Início do envio de e-mail ===");
        
        // Validar e-mail
        const email = this.emailInput.value.trim();
        if (!email) {
            this.statusText.textContent = "❌ Por favor, digite um e-mail";
            this.statusText.style.color = "#d32f2f";
            return;
        }

        if (!email.includes('@') || !email.includes('.')) {
            this.statusText.textContent = "❌ E-mail inválido";
            this.statusText.style.color = "#d32f2f";
            return;
        }
        
        if (!this.dataView || !this.dataView.table) {
            console.error("Nenhum dado disponível!");
            this.statusText.textContent = "❌ Nenhum dado disponível";
            this.statusText.style.color = "#d32f2f";
            return;
        }

        console.log("Dados disponíveis:", this.dataView.table.rows.length, "linhas");

        this.button.disabled = true;
        this.button.textContent = "⏳ Enviando...";
        this.statusText.textContent = "Processando dados...";
        this.statusText.style.color = "#666";

        try {
            // Extrair dados do dataView
            const data = this.extractDataForAPI(this.dataView);
            console.log("Dados extraídos:", data.length, "registros");
            
            this.statusText.textContent = "Enviando para servidor...";
            
            // Usar XMLHttpRequest ao invés de fetch
            const xhr = new XMLHttpRequest();
            xhr.open('POST', 'https://campo-minado-api-36a6b9dc1720.herokuapp.com/api/send-email', true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            
            xhr.onload = () => {
                console.log('Resposta recebida:', xhr.status);
                if (xhr.status >= 200 && xhr.status < 300) {
                    this.statusText.textContent = "✅ E-mail enviado com sucesso! Verifique sua caixa de entrada.";
                    this.statusText.style.color = "#388e3c";
                    this.button.textContent = "✅ Enviado!";
                } else {
                    throw new Error(`Erro HTTP: ${xhr.status}`);
                }
                
                setTimeout(() => {
                    this.button.textContent = "📧 Enviar por E-mail";
                    this.button.disabled = false;
                }, 3000);
            };
            
            xhr.onerror = () => {
                console.error('Erro na requisição');
                throw new Error('Erro ao conectar com o servidor');
            };
            
            const payload = JSON.stringify({
                email: email,
                data: data
            });
            
            console.log('Enviando via XMLHttpRequest...');
            xhr.send(payload);

        } catch (error) {
            console.error("=== ERRO ao enviar e-mail ===", error);
            this.statusText.textContent = `❌ Erro: ${error.message}`;
            this.statusText.style.color = "#d32f2f";
            this.button.textContent = "📧 Enviar por E-mail";
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
            bairro: -1,
            cidade: -1,
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
            if (roleName["bairro"]) columnMap.bairro = idx;
            if (roleName["cidade"]) columnMap.cidade = idx;
            if (roleName["codProduto"]) columnMap.codProduto = idx;
            if (roleName["nomeProduto"]) columnMap.nomeProduto = idx;
            if (roleName["qtVendida"]) columnMap.qtVendida = idx;
        });

        const reportTitle = this.formattingSettings?.generalCard?.reportTitle?.value || "Relatório de Vendas";
        const zeroValueColor = this.formattingSettings?.generalCard?.zeroValueColor?.value?.value || "#FFFFFF";
        const withSalesColor = this.formattingSettings?.generalCard?.withSalesColor?.value?.value || "#90EE90";
        
        return rows.map(row => ({
            codVendedor: row[columnMap.codVendedor]?.toString() || "",
            classeProduto: row[columnMap.classeProduto]?.toString() || "",
            codCliente: row[columnMap.codCliente]?.toString() || "",
            nomeCliente: row[columnMap.nomeCliente]?.toString() || "",
            bairro: row[columnMap.bairro]?.toString() || "",
            cidade: row[columnMap.cidade]?.toString() || "",
            titulo: reportTitle,
            zeroValueColor: zeroValueColor,
            withSalesColor: withSalesColor,
            codProduto: row[columnMap.codProduto]?.toString() || "",
            nomeProduto: row[columnMap.nomeProduto]?.toString() || "",
            qtVendida: Number(row[columnMap.qtVendida]) || 0
        }));
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
