<?php
/**
 * Script para gerar uma NFe de exemplo usando a biblioteca sped-nfe
 */

// Definir timezone para evitar avisos
date_default_timezone_set('America/Sao_Paulo');

// Carregar o autoload
$possiblePaths = [
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
    die("Autoload não encontrado\n");
}

// XML de exemplo completo com protocolo
$xml = '<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infNFe Id="NFe35150300822602000124550010009923461099234656" versao="4.00">
      <ide>
        <cUF>35</cUF>
        <cNF>09923465</cNF>
        <natOp>VENDA PRODUCAO DO ESTAB.</natOp>
        <mod>55</mod>
        <serie>1</serie>
        <nNF>992346</nNF>
        <dhEmi>2023-10-27T10:00:00-03:00</dhEmi>
        <dhSaiEnt>2023-10-27T10:00:00-03:00</dhSaiEnt>
        <tpNF>1</tpNF>
        <idDest>1</idDest>
        <cMunFG>3550308</cMunFG>
        <tpImp>1</tpImp>
        <tpEmis>1</tpEmis>
        <cDV>6</cDV>
        <tpAmb>2</tpAmb>
        <finNFe>1</finNFe>
        <indFinal>0</indFinal>
        <indPres>0</indPres>
        <procEmi>0</procEmi>
        <verProc>App NFe 4.00</verProc>
      </ide>
      <emit>
        <CNPJ>33915604000117</CNPJ>
        <xNome>LEGIAO DA BOA VONTADE</xNome>
        <xFant>LBV COMERCIAL</xFant>
        <enderEmit>
          <xLgr>RUA SERG</xLgr>
          <nro>475</nro>
          <xBairro>CENTRO</xBairro>
          <cMun>3550308</cMun>
          <xMun>SAO PAULO</xMun>
          <UF>SP</UF>
          <CEP>01243001</CEP>
          <cPais>1058</cPais>
          <xPais>BRASIL</xPais>
          <fone>1121114700</fone>
        </enderEmit>
        <IE>142851635</IE>
        <CRT>3</CRT>
      </emit>
      <dest>
        <CNPJ>78467701000114</CNPJ>
        <xNome>NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL</xNome>
        <enderDest>
          <xLgr>AV.CONTORNO</xLgr>
          <nro>2225</nro>
          <xBairro>CENTRO</xBairro>
          <cMun>3505708</cMun>
          <xMun>BARUERI</xMun>
          <UF>SP</UF>
          <CEP>06444111</CEP>
          <cPais>1058</cPais>
          <xPais>BRASIL</xPais>
          <fone>1131987777</fone>
        </enderDest>
        <indIEDest>1</indIEDest>
        <IE>111122223456</IE>
      </dest>
      <det nItem="1">
        <prod>
          <cProd>01042</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL</xProd>
          <NCM>84713019</NCM>
          <CFOP>5101</CFOP>
          <uCom>PC</uCom>
          <qCom>1.00</qCom>
          <vUnCom>100.00</vUnCom>
          <vProd>100.00</vProd>
          <cEANTrib>SEM GTIN</cEANTrib>
          <uTrib>PC</uTrib>
          <qTrib>1.00</qTrib>
          <vUnTrib>100.00</vUnTrib>
          <indTot>1</indTot>
        </prod>
        <imposto>
          <ICMS>
            <ICMS00>
              <orig>0</orig>
              <CST>00</CST>
              <modBC>3</modBC>
              <vBC>100.00</vBC>
              <pICMS>18.00</pICMS>
              <vICMS>18.00</vICMS>
            </ICMS00>
          </ICMS>
          <IPI>
            <cEnq>999</cEnq>
            <IPITrib>
              <CST>50</CST>
              <vBC>100.00</vBC>
              <pIPI>5.00</pIPI>
              <vIPI>5.00</vIPI>
            </IPITrib>
          </IPI>
          <PIS>
            <PISAliq>
              <CST>01</CST>
              <vBC>100.00</vBC>
              <pPIS>1.65</pPIS>
              <vPIS>1.65</vPIS>
            </PISAliq>
          </PIS>
          <COFINS>
            <COFINSAliq>
              <CST>01</CST>
              <vBC>100.00</vBC>
              <pCOFINS>7.60</pCOFINS>
              <vCOFINS>7.60</vCOFINS>
            </COFINSAliq>
          </COFINS>
        </imposto>
      </det>
      <total>
        <ICMSTot>
          <vBC>100.00</vBC>
          <vICMS>18.00</vICMS>
          <vICMSDeson>0.00</vICMSDeson>
          <vFCP>0.00</vFCP>
          <vBCST>0.00</vBCST>
          <vST>0.00</vST>
          <vFCPST>0.00</vFCPST>
          <vFCPSTRet>0.00</vFCPSTRet>
          <vProd>100.00</vProd>
          <vFrete>0.00</vFrete>
          <vSeg>0.00</vSeg>
          <vDesc>0.00</vDesc>
          <vII>0.00</vII>
          <vIPI>5.00</vIPI>
          <vIPIDevol>0.00</vIPIDevol>
          <vPIS>1.65</vPIS>
          <vCOFINS>7.60</vCOFINS>
          <vOutro>0.00</vOutro>
          <vNF>105.00</vNF>
        </ICMSTot>
      </total>
      <transp>
        <modFrete>0</modFrete>
        <transporta>
          <xNome>TRANSPORTADORA TESTE</xNome>
          <IE>77777777777</IE>
          <xEnder>RUA DAS FLORES, 100</xEnder>
          <xMun>SAO PAULO</xMun>
          <UF>SP</UF>
        </transporta>
        <vol>
          <qVol>1</qVol>
          <esp>VOLUME</esp>
          <marca>MARCA</marca>
          <nVol>1234</nVol>
          <pesoL>10.000</pesoL>
          <pesoB>11.000</pesoB>
        </vol>
      </transp>
      <pag>
        <detPag>
          <tPag>01</tPag>
          <vPag>105.00</vPag>
        </detPag>
      </pag>
      <infAdic>
        <infCpl>NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL</infCpl>
      </infAdic>
    </infNFe>
    <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
      <SignedInfo>
        <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
        <SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
        <Reference URI="#NFe35150300822602000124550010009923461099234656">
          <Transforms>
            <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
            <Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
          </Transforms>
          <DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
          <DigestValue>RSJYAWxkOc+wfGDGw/UbXHgBGJM=</DigestValue>
        </Reference>
      </SignedInfo>
      <SignatureValue>Kw1Y7nPxdkNG+5Ib5h28O9/5AO0rMwQQiF/C+Pk9RXS0ipJXfCCdsZ9cixBXuBJVxxhihU/RpataV3YPwbcDQtY3nL9V3KYIce8VbgwqwkVmQ6/c5h+JKSWw8LgQdEj3Db2Hd+kL5MG9RRU37akew0PeFXMKLK0XFrPSQeIUhkUFBOSLYYmWWPO3yFcF1C9hUEJQO6A+kRKY8Obm/UZlQmcDNnfHVftQ3MJBNbL3xTZGRfqKmzMhAA==</SignatureValue>
      <KeyInfo>
        <X509Data>
          <X509Certificate>MIIINTCCBj2gAwIBAgIQEABoI3FQdSnFVyEEKSwjtzANBgkqhkiG9w0BAQsFADCBiTELMAkGA1UEBhMCQlIxEjAQBgNVBAoTCUlDUC1CcmFzaWwxNjA0BgNVBAsTLVNlY3JldGFyaWEgZGEgUmVjZWl0YSBGZWRlcmFsIGRvIEJyYXNpbCAtIFJGQjEtMCsGA1UEAxMkQXV0b3JpZGFkZSBDZXJ0aWZpY2Fkb3JhIFNFUlBST1JGQnY1MB4XDTIyMDYwMjE5MjM1OVoXDTIzMDYwMjE5MjM1OVowgfMxCzAJBgNVBAYTAkJSMRIwEAYDVQQKEwlJQ1AtQnJhc2lsMQswCQYDVQQIEwJTUDESMBA...</X509Certificate>
        </X509Data>
      </KeyInfo>
    </Signature>
  </NFe>
  <protNFe versao="4.00">
    <infProt>
      <tpAmb>2</tpAmb>
      <verAplic>SP_NFE_PL009_V4</verAplic>
      <chNFe>35150300822602000124550010009923461099234656</chNFe>
      <dhRecbto>2023-10-27T10:05:00-03:00</dhRecbto>
      <nProt>135150000012345</nProt>
      <digVal>RSJYAWxkOc+wfGDGw/UbXHgBGJM=</digVal>
      <cStat>100</cStat>
      <xMotivo>Autorizado o uso da NF-e</xMotivo>
    </infProt>
  </protNFe>
</nfeProc>';

// Salvar em um arquivo para uso posterior
$xmlFilePath = __DIR__ . '/nfe_exemplo.xml';
file_put_contents($xmlFilePath, $xml);

echo "XML de exemplo salvo em: $xmlFilePath\n";

// Gerar DANFE de exemplo
try {
    // Carregar biblioteca
    $danfe = new NFePHP\DA\NFe\Danfe($xml, 'P', 'A4', '', 'I', '');
    // A biblioteca atual não tem método montaDANFE, o render já faz isso
    $pdfContent = $danfe->render();
    
    $pdfPath = __DIR__ . '/danfe_exemplo.pdf';
    file_put_contents($pdfPath, $pdfContent);
    
    echo "DANFE gerado com sucesso em: $pdfPath\n";
} catch (Exception $e) {
    echo "Erro ao gerar DANFE: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}