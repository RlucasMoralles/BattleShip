import { jsPDF } from "jspdf";
import JSZip from "jszip";
import powerbi from "powerbi-visuals-api";
import DataView = powerbi.DataView;

interface DataRow {
    codVendedor: string;
    classeProduto: string;
    codCliente: string;
    nomeCliente: string;
    codProduto: string;
    nomeProduto: string;
    qtVendida: number;
}

interface PivotRow {
    codCliente: string;
    nomeCliente: string;
    [produto: string]: any;
}

export class PDFGenerator {
    private readonly FONTE = "helvetica";
    private readonly TAM_FONTE = 6;
    private readonly ROW_HEIGHT = 10;
    private readonly PADDING_TXT = 4;
    private readonly HEADER_FONT_SIZE = 6;
    private readonly HEADER_ANGLE = 60;
    private readonly HEADER_HEIGHT = 38;
    private readonly MARGEM_X = 10;
    private readonly MARGEM_Y = 10;

    public async generatePDFsAndZip(dataView: DataView): Promise<Blob> {
        try {
            console.log("Iniciando geração de PDFs...");
            const data = this.extractData(dataView);
            console.log("Dados extraídos:", data.length, "registros");
            
            const groupedData = this.groupByVendedorAndCategoria(data);
            console.log("Dados agrupados por vendedor/categoria:", Object.keys(groupedData));
            
            const zip = new JSZip();

            for (const [vendedor, categorias] of Object.entries(groupedData)) {
                const vendedorFolder = zip.folder(vendedor.toString());

                for (const [categoria, rows] of Object.entries(categorias)) {
                    console.log(`Gerando PDF para vendedor ${vendedor}, categoria ${categoria}`);
                    const pivotData = this.createPivotTable(rows);
                    const pdfBlob = this.gerarPDF(vendedor, categoria, pivotData);
                    
                    vendedorFolder.file(`${vendedor}_${categoria}.pdf`, pdfBlob);
                }
            }

            console.log("Gerando arquivo ZIP...");
            const zipBlob = await zip.generateAsync({ type: "blob" });
            console.log("ZIP gerado com sucesso:", zipBlob.size, "bytes");
            return zipBlob;
        } catch (error) {
            console.error("Erro ao gerar PDFs:", error);
            throw error;
        }
    }

    private extractData(dataView: DataView): DataRow[] {
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

    private groupByVendedorAndCategoria(data: DataRow[]): Record<string, Record<string, DataRow[]>> {
        const grouped: Record<string, Record<string, DataRow[]>> = {};

        data.forEach(row => {
            if (!grouped[row.codVendedor]) {
                grouped[row.codVendedor] = {};
            }
            if (!grouped[row.codVendedor][row.classeProduto]) {
                grouped[row.codVendedor][row.classeProduto] = [];
            }
            grouped[row.codVendedor][row.classeProduto].push(row);
        });

        return grouped;
    }

    private createPivotTable(data: DataRow[]): PivotRow[] {
        const pivotMap = new Map<string, PivotRow>();

        data.forEach(row => {
            const key = `${row.codCliente}_${row.nomeCliente}`;
            const produto = `${row.codProduto} - ${row.nomeProduto}`;

            if (!pivotMap.has(key)) {
                pivotMap.set(key, {
                    codCliente: row.codCliente,
                    nomeCliente: row.nomeCliente
                });
            }

            const pivotRow = pivotMap.get(key);
            pivotRow[produto] = (pivotRow[produto] || 0) + row.qtVendida;
        });

        return Array.from(pivotMap.values());
    }

    private gerarPDF(vendedor: string, categoria: string, pivotData: PivotRow[]): Blob {
        // A3 Landscape: 420mm x 297mm = 1587pt x 1123pt
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'pt',
            format: 'a3'
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Título
        doc.setFontSize(14);
        doc.setFont(this.FONTE, "bold");
        doc.text(`VENDEDOR: ${vendedor}`, this.MARGEM_X, this.MARGEM_Y + 14);
        doc.text(`CLASSE: ${categoria}`, this.MARGEM_X, this.MARGEM_Y + 30);

        if (pivotData.length === 0) {
            doc.text("Nenhum dado disponível", this.MARGEM_X, this.MARGEM_Y + 60);
            return doc.output('blob');
        }

        // Obter produtos (todas as colunas exceto codCliente e nomeCliente)
        const produtos = Object.keys(pivotData[0]).filter(k => k !== 'codCliente' && k !== 'nomeCliente');
        
        // Calcular larguras
        const usableWidth = pageWidth - 2 * this.MARGEM_X;
        const wCod = 60;
        const wNome = 150;
        const wProdTotal = usableWidth - wCod - wNome;
        const wProd = wProdTotal / produtos.length;

        // Posição inicial
        let y = this.MARGEM_Y + 50;

        // Desenhar cabeçalhos inclinados
        doc.setFontSize(this.HEADER_FONT_SIZE);
        doc.setFont(this.FONTE, "normal");

        let x = this.MARGEM_X + wCod + wNome;
        produtos.forEach(produto => {
            const currentX = x;
            doc.text(produto, currentX + 6, y + this.HEADER_HEIGHT - 10, {
                angle: this.HEADER_ANGLE
            });
            x += wProd;
        });

        y += this.HEADER_HEIGHT;

        // Desenhar dados
        doc.setFontSize(this.TAM_FONTE);
        
        const maxRows = Math.floor((pageHeight - y - this.MARGEM_Y) / this.ROW_HEIGHT);
        const displayData = pivotData.slice(0, maxRows);

        displayData.forEach((row, i) => {
            const rowY = y + i * this.ROW_HEIGHT;
            let rowX = this.MARGEM_X;

            // Código Cliente
            doc.setTextColor(0, 0, 0);
            doc.text(row.codCliente, rowX + 2, rowY + this.ROW_HEIGHT - 2);
            rowX += wCod;

            // Nome Cliente
            doc.text(row.nomeCliente, rowX + 2, rowY + this.ROW_HEIGHT - 2);
            rowX += wNome;

            // Produtos
            produtos.forEach(produto => {
                const valor = row[produto] || 0;
                
                // Fundo colorido
                if (valor > 0) {
                    doc.setFillColor(0, 255, 0); // Verde
                } else {
                    doc.setFillColor(255, 0, 0); // Vermelho
                }
                doc.rect(rowX, rowY, wProd, this.ROW_HEIGHT, 'F');

                // Texto centralizado
                doc.setTextColor(0, 0, 0);
                const textX = rowX + wProd / 2;
                const textY = rowY + this.ROW_HEIGHT / 2 + 2;
                doc.text(valor.toString(), textX, textY, { align: 'center' });

                rowX += wProd;
            });
        });

        // Desenhar grades
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);

        const yBottom = y + displayData.length * this.ROW_HEIGHT;

        // Linhas horizontais
        for (let i = 0; i <= displayData.length; i++) {
            const lineY = y + i * this.ROW_HEIGHT;
            doc.line(this.MARGEM_X, lineY, this.MARGEM_X + usableWidth, lineY);
        }

        // Linhas verticais
        x = this.MARGEM_X;
        doc.line(x, y, x, yBottom);
        x += wCod;
        doc.line(x, y, x, yBottom);
        x += wNome;
        doc.line(x, y, x, yBottom);
        
        produtos.forEach(() => {
            x += wProd;
            doc.line(x, y, x, yBottom);
        });

        return doc.output('blob');
    }
}
