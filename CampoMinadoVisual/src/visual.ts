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
            this.statusText.style.color = "#ff6b6b";
            this.button.disabled = true;
            this.button.style.opacity = "0.5";
            this.button.style.cursor = "not-allowed";
            return;
        }

        const rowCount = this.dataView.table.rows.length;
        
        // Verificar se excede o limite de 10.000 linhas
        if (rowCount > 10000) {
            this.statusText.innerHTML = `
                <strong style="color: #e74c3c;">❌ LIMITE EXCEDIDO!</strong><br>
                <span style="color: #e74c3c;">Atualmente: ${rowCount.toLocaleString('pt-BR')} linhas</span><br>
                <span style="color: #666;">Máximo permitido: 10.000 linhas</span><br>
                <span style="color: #666; font-size: 12px;">Por favor, aplique filtros para reduzir os dados.</span>
            `;
            this.button.disabled = true;
            this.button.style.opacity = "0.5";
            this.button.style.cursor = "not-allowed";
            this.button.style.background = "linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)";
            return;
        }
        
        // Dados dentro do limite
        this.statusText.innerHTML = `
            <span style="color: #27ae60;"><strong>✅ ${rowCount.toLocaleString('pt-BR')} linhas carregadas</strong></span><br>
            <span style="color: #666; font-size: 12px;">Digite seu e-mail e clique em enviar</span>
        `;
        this.statusText.style.color = "#27ae60";
        this.button.disabled = false;
        this.button.style.opacity = "1";
        this.button.style.cursor = "pointer";
        this.button.style.background = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
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
            console.log("Primeiro registro:", data[0]);
            
            this.statusText.textContent = "Enviando para servidor...";
            
            // Usar XMLHttpRequest com configurações para Power BI Desktop
            const xhr = new XMLHttpRequest();
            const url = 'https://campo-minado-api-36a6b9dc1720.herokuapp.com/api/send-email';
            
            xhr.open('POST', url, true);
            
            // Headers necessários
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.setRequestHeader('Accept', 'application/json');
            
            // Não usar withCredentials para evitar problemas com CORS
            xhr.withCredentials = false;
            
            // Timeout de 60 segundos
            xhr.timeout = 60000;
            
            xhr.onreadystatechange = () => {
                console.log('ReadyState changed to:', xhr.readyState, 'Status:', xhr.status);
            };
            
            xhr.onload = () => {
                console.log('Requisição completa!');
                console.log('Status:', xhr.status);
                console.log('Response:', xhr.responseText);
                
                if (xhr.status >= 200 && xhr.status < 300) {
                    this.statusText.textContent = "✅ E-mail enviado com sucesso! Verifique sua caixa de entrada.";
                    this.statusText.style.color = "#388e3c";
                    this.button.textContent = "✅ Enviado!";
                    
                    setTimeout(() => {
                        this.button.textContent = "📧 Enviar por E-mail";
                        this.button.disabled = false;
                    }, 3000);
                } else {
                    console.error('Erro HTTP:', xhr.status, xhr.responseText);
                    throw new Error(`Erro HTTP: ${xhr.status} - ${xhr.statusText}`);
                }
            };
            
            xhr.onerror = (e) => {
                console.error('===== ERRO na requisição XMLHttpRequest =====');
                console.error('Event:', e);
                console.error('ReadyState:', xhr.readyState);
                console.error('Status:', xhr.status);
                console.error('StatusText:', xhr.statusText);
                console.error('ResponseText:', xhr.responseText);
                throw new Error('Erro ao conectar com o servidor. Verifique se a API está acessível.');
            };
            
            xhr.ontimeout = () => {
                console.error('Timeout na requisição');
                throw new Error('Tempo limite excedido. Tente novamente.');
            };
            
            const payload = JSON.stringify({
                email: email,
                data: data
            });
            
            console.log('===== Enviando requisição =====');
            console.log('URL:', url);
            console.log('Método: POST');
            console.log('Tamanho do payload:', payload.length, 'caracteres');
            console.log('Número de registros:', data.length);
            
            xhr.send(payload);
            console.log('XMLHttpRequest.send() executado');

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
