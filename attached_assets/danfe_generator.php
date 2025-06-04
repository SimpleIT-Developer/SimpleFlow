<?php
/**
 * Script para geração de DANFE a partir do XML da NFe
 * Utiliza a biblioteca sped-da para gerar o PDF conforme exemplo oficial:
 * https://github.com/nfephp-org/sped-da/tree/master/examples/nfe
 */

// Definir timezone para evitar avisos
date_default_timezone_set('America/Sao_Paulo');

try {
    // Carregar o autoload
    $possiblePaths = [
        __DIR__ . '/vendor/autoload.php',
        __DIR__ . '/../php_bridge/vendor/autoload.php',
        './php_bridge/vendor/autoload.php',
        '/home/runner/workspace/php_bridge/vendor/autoload.php'
    ];

    $autoloadFound = false;
    foreach ($possiblePaths as $path) {
        if (file_exists($path)) {
            require_once $path;
            $autoloadFound = true;
            break;
        }
    }

    if (!$autoloadFound) {
        throw new Exception("Autoload não encontrado");
    }

    // Verificar se o XML foi fornecido
    $xmlContent = isset($argv[1]) ? $argv[1] : null;
    $outputPath = isset($argv[2]) ? $argv[2] : tempnam(sys_get_temp_dir(), 'danfe_') . '.pdf';

    if (!$xmlContent) {
        throw new Exception("Conteúdo XML não fornecido. Use: php danfe_generator.php [xml_content] [output_path]");
    }

    // Verificar se o XML é base64
    if (preg_match('/^[a-zA-Z0-9\/\r\n+]*={0,2}$/', $xmlContent)) {
        // Se for base64, decodifique
        $xmlContent = base64_decode($xmlContent);
    }

    // Salvar o XML em um arquivo temporário para que o Danfe possa processá-lo
    $xmlFile = tempnam(sys_get_temp_dir(), 'xml_') . '.xml';
    file_put_contents($xmlFile, $xmlContent);

    // Debug
    echo "XML salvo em: " . $xmlFile . PHP_EOL;
    echo "Tamanho do XML: " . strlen($xmlContent) . PHP_EOL;
    echo "Primeiros 100 caracteres: " . substr($xmlContent, 0, 100) . PHP_EOL;

    try {
        // Inicializar o DANFE usando o sped-da conforme documentação oficial
        $danfe = new NFePHP\DA\NFe\Danfe($xmlContent, 'P', 'A4', '', 'I', '');
        
        // Adicionar rodapé personalizado
        $danfe->creditsIntegratorFooter('Sistema Fiscal');
        
        // Gerar o PDF do DANFE
        $pdf = $danfe->render();

        // Salvar o PDF no caminho especificado
        file_put_contents($outputPath, $pdf);

        // Retornar informações para o Node.js
        echo "==JSON_BEGIN==\n";
        echo json_encode([
            'success' => true,
            'message' => 'DANFE gerado com sucesso',
            'outputPath' => $outputPath
        ]);
        echo "\n==JSON_END==\n";
    } catch (Exception $e) {
        // Tentar método alternativo
        echo "Erro com o método original: " . $e->getMessage() . PHP_EOL;
        echo "Tentando método alternativo..." . PHP_EOL;

        // Método alternativo usando o arquivo XML
        $danfe = new NFePHP\DA\NFe\Danfe($xmlFile);
        // Adicionar rodapé personalizado sem tentar chamar montaDANFE
        $pdf = $danfe->render();
        file_put_contents($outputPath, $pdf);

        echo "==JSON_BEGIN==\n";
        echo json_encode([
            'success' => true,
            'message' => 'DANFE gerado com sucesso (método alternativo)',
            'outputPath' => $outputPath
        ]);
        echo "\n==JSON_END==\n";
    }

} catch (Exception $e) {
    echo "Erro detalhado: " . $e->getMessage() . PHP_EOL;
    echo "Stack trace: " . $e->getTraceAsString() . PHP_EOL;
    
    echo "==JSON_BEGIN==\n";
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao gerar DANFE',
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    echo "\n==JSON_END==\n";
}