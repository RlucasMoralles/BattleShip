# Campo Minado - Power BI Custom Visual

Visual customizado para Power BI que gera PDFs de análise de vendas por vendedor e categoria de produto.

## 📋 Funcionalidades

- Botão interativo "Baixar Base"
- Geração automática de PDFs organizados por vendedor e categoria
- Layout estilo "Campo Minado" com células coloridas (verde para vendas positivas, vermelho para zero)
- Download em formato ZIP com estrutura de pastas organizada
- Suporte a grandes volumes de dados

## 🚀 Instalação e Compilação

### Pré-requisitos

1. **Node.js** (versão 14 ou superior)
2. **Power BI Custom Visuals Tools**:
   ```bash
   npm install -g powerbi-visuals-tools
   ```

### Passos de Instalação

1. Instalar dependências:
   ```bash
   npm install
   ```

2. Criar certificado SSL (primeira vez):
   ```bash
   pbiviz --install-cert
   ```

3. Iniciar modo de desenvolvimento:
   ```bash
   npm start
   ```
   Ou:
   ```bash
   pbiviz start
   ```

4. Compilar para produção:
   ```bash
   npm run package
   ```
   
   O arquivo `.pbiviz` será gerado na pasta `dist/`.

## 📊 Como Usar no Power BI

### 1. Importar o Visual

- Abra o Power BI Desktop
- Vá em **Visualizações** → **...** → **Importar visual de um arquivo**
- Selecione o arquivo `.pbiviz` da pasta `dist/`

### 2. Configurar os Campos

Arraste os seguintes campos para o visual:

| Campo | Descrição |
|-------|-----------|
| **Código Vendedor** | Identificador do vendedor |
| **Classe Produto** | Categoria/classe do produto |
| **Código Cliente** | Identificador do cliente |
| **Nome Cliente** | Nome do cliente |
| **Código Produto** | Identificador do produto |
| **Nome Produto** | Nome/descrição do produto |
| **Quantidade Vendida** | Medida de quantidade vendida |

### 3. Gerar PDFs

1. Após configurar todos os campos, o botão ficará habilitado
2. Clique em **"📥 Baixar Base"**
3. Aguarde o processamento
4. O arquivo ZIP será baixado automaticamente

## 📁 Estrutura do ZIP Gerado

```
CAMPO_MINADO_POR_VENDEDOR.zip
├── VENDEDOR_001/
│   ├── 001_5 A 9 CHK.pdf
│   ├── 001_CATEGORIA_A.pdf
│   └── ...
├── VENDEDOR_002/
│   └── ...
└── ...
```

## 🎨 Características do PDF

- **Formato**: A3 Paisagem
- **Fonte**: Helvetica, tamanho 6pt
- **Layout**: 
  - Cabeçalhos de produtos inclinados a 60°
  - Células coloridas (verde/vermelho)
  - Grades para melhor visualização
- **Informações**: Vendedor, Categoria, Clientes e Produtos

## 🔧 Personalização

Você pode ajustar as configurações no arquivo `src/pdfGenerator.ts`:

```typescript
private readonly FONTE = "helvetica";
private readonly TAM_FONTE = 6;
private readonly ROW_HEIGHT = 10;
private readonly HEADER_ANGLE = 60;
```

## 🐛 Troubleshooting

### Visual não aparece no Power BI
- Certifique-se de que o certificado SSL foi instalado: `pbiviz --install-cert`
- Reinicie o Power BI Desktop

### Erro ao compilar
- Limpe o cache: `npm run clean` (se disponível)
- Reinstale dependências: `rm -rf node_modules && npm install`

### PDFs não são gerados
- Verifique se todos os 7 campos obrigatórios foram preenchidos
- Confirme que há dados na tabela

## 📦 Dependências Principais

- `jspdf`: Geração de PDFs
- `jszip`: Criação de arquivos ZIP
- `powerbi-visuals-api`: API do Power BI
- `powerbi-visuals-tools`: Ferramentas de desenvolvimento

## 📄 Licença

MIT

## 👤 Autor

Lucas Pereira

---

**Versão**: 1.0.0
