import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import * as os from 'os';

const execAsync = util.promisify(exec);

/**
 * Gera um PDF do DANFE a partir do XML do documento fiscal usando a biblioteca sped-da via PHP
 * 
 * @param xmlContent String contendo o XML do documento (NFe)
 * @returns Caminho para o arquivo PDF gerado
 */
export async function generateDANFE(xmlContent: string): Promise<{ success: boolean, pdfPath?: string, error?: string, debug?: any }> {
  try {
    if (!xmlContent) {
      throw new Error('Conteúdo XML não fornecido');
    }

    console.log('Gerando DANFE para XML de tamanho:', xmlContent.length);
    
    // Cria um arquivo temporário para o XML
    const tempDir = os.tmpdir();
    const xmlPath = path.join(tempDir, `nfe_${Date.now()}.xml`);
    const pdfPath = path.join(tempDir, `danfe_${Date.now()}.pdf`);

    // Escreve o XML no arquivo
    fs.writeFileSync(xmlPath, xmlContent);
    console.log('XML salvo em:', xmlPath);

    // Escapar o XML para enviar como parâmetro de linha de comando (base64)
    const xmlBase64 = Buffer.from(xmlContent).toString('base64');
    console.log('XML convertido para base64');

    // Executa o script PHP para gerar o DANFE
    const phpScriptPath = path.resolve('./php_bridge/danfe_generator.php');

    if (!fs.existsSync(phpScriptPath)) {
      throw new Error(`Script PHP não encontrado em ${phpScriptPath}`);
    }

    console.log('Executando comando PHP para gerar DANFE...');
    const command = `php ${phpScriptPath} "${xmlBase64}" "${pdfPath}"`;
    const { stdout, stderr } = await execAsync(command);

    console.log('Saída do PHP:', stdout);
    
    if (stderr) {
      console.error('Erro na execução do PHP:', stderr);
    }

    // Extrair o JSON da saída
    const jsonMatch = stdout.match(/==JSON_BEGIN==\n([\s\S]*?)\n==JSON_END==/);
    if (!jsonMatch) {
      throw new Error(`Não foi possível extrair JSON da saída: ${stdout}`);
    }

    // Analisar a resposta
    const result = JSON.parse(jsonMatch[1]);

    if (!result.success) {
      throw new Error(`Erro ao gerar DANFE: ${result.error || 'Erro desconhecido'}`);
    }

    console.log(`DANFE gerado com sucesso: ${result.outputPath}`);

    // Verifica se o arquivo PDF foi gerado
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDF não encontrado no caminho esperado: ${pdfPath}`);
    }

    const fileStats = fs.statSync(pdfPath);
    console.log(`Tamanho do arquivo PDF: ${fileStats.size} bytes`);

    if (fileStats.size === 0) {
      throw new Error('PDF gerado está vazio');
    }

    return {
      success: true,
      pdfPath
    };

  } catch (error) {
    console.error('Erro ao gerar DANFE:', error);
    return {
      success: false,
      error: (error as Error).message,
      debug: {
        stack: (error as Error).stack,
        name: (error as Error).name
      }
    };
  }
}