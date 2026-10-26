import { describe, expect, it } from "vitest";
import {
  cortar,
  decodificarEntidades,
  feedPermitido,
  lerData,
  limparUrl,
  parseFeed,
} from "@/lib/rss";

// Recorte no formato do feed do GKPB e do Propmark (WordPress).
const RSS_WORDPRESS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
<channel>
  <title>GKPB</title>
  <link>https://gkpb.com.br</link>
  <description>Descrição do canal, não é item</description>
  <item>
    <title><![CDATA[McDia Feliz 2026 bate recorde histórico e arrecada R$ 28,5 milhões]]></title>
    <link>https://gkpb.com.br/200062/mcdia-feliz-2026-2/?utm_source=rss&amp;utm_medium=rss</link>
    <dc:creator><![CDATA[Redação]]></dc:creator>
    <pubDate>Fri, 23 Oct 2026 18:57:57 +0000</pubDate>
    <media:title>Título da imagem, não da notícia</media:title>
    <description><![CDATA[<p>A campanha arrecadou R$ 28,5 milhões para projetos de saúde e educação infantil.</p><img src="x.jpg"/>]]></description>
    <content:encoded><![CDATA[<p>Texto inteiro da matéria que não deve ser usado quando há description.</p>]]></content:encoded>
  </item>
  <item>
    <title>Aussie transforma erro de pronúncia em ação &#8216;anti-branding&#8217;</title>
    <link>https://propmark.com.br/anunciantes/aussie/</link>
    <pubDate>Thu, 22 Oct 2026 17:43:00 +0000</pubDate>
    <description>&lt;p&gt;Marca assume o jeito errado&amp;nbsp;de falar.&lt;/p&gt;</description>
  </item>
  <item>
    <title>Sem link, fica de fora</title>
  </item>
</channel>
</rss>`;

const ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Blog</title>
  <link href="https://exemplo.com.br/"/>
  <entry>
    <title type="html">Fisioterapia &amp; esporte</title>
    <link rel="self" href="https://exemplo.com.br/feed/1"/>
    <link rel="alternate" href="https://exemplo.com.br/post/1"/>
    <published>2026-10-20T12:00:00-03:00</published>
    <summary>Resumo do post.</summary>
  </entry>
</feed>`;

describe("parseFeed", () => {
  it("lê os itens do RSS e ignora a descrição do canal", () => {
    const itens = parseFeed(RSS_WORDPRESS);
    expect(itens).toHaveLength(2);
    expect(itens[0]).toEqual({
      titulo: "McDia Feliz 2026 bate recorde histórico e arrecada R$ 28,5 milhões",
      url: "https://gkpb.com.br/200062/mcdia-feliz-2026-2/",
      resumo: "A campanha arrecadou R$ 28,5 milhões para projetos de saúde e educação infantil.",
      publicadoEm: "2026-10-23T18:57:57.000Z",
    });
  });

  it("decodifica entidades e HTML escapado", () => {
    const [, aussie] = parseFeed(RSS_WORDPRESS);
    expect(aussie.titulo).toBe("Aussie transforma erro de pronúncia em ação ‘anti-branding’");
    expect(aussie.resumo).toBe("Marca assume o jeito errado de falar.");
  });

  it("lê Atom pelo link alternate", () => {
    expect(parseFeed(ATOM)).toEqual([
      {
        titulo: "Fisioterapia & esporte",
        url: "https://exemplo.com.br/post/1",
        resumo: "Resumo do post.",
        publicadoEm: "2026-10-20T15:00:00.000Z",
      },
    ]);
  });

  it("devolve vazio para uma página HTML comum", () => {
    expect(parseFeed("<!doctype html><html><body><h1>Notícias</h1></body></html>")).toEqual([]);
  });

  it("não repete o mesmo link dentro do feed", () => {
    const duplicado = RSS_WORDPRESS.replace("</channel>", `<item><title>De novo</title><link>https://gkpb.com.br/200062/mcdia-feliz-2026-2/</link></item></channel>`);
    expect(parseFeed(duplicado)).toHaveLength(2);
  });

  it("usa o texto completo só quando não há description", () => {
    const xml = `<rss><channel><item><title>T</title><link>https://a.com.br/x</link><content:encoded><![CDATA[<p>Só o conteúdo.</p>]]></content:encoded></item></channel></rss>`;
    expect(parseFeed(xml)[0].resumo).toBe("Só o conteúdo.");
  });
});

describe("lerData", () => {
  it("lê RFC 822 e ISO", () => {
    expect(lerData("Mon, 26 Oct 2026 09:03:39 +0000")).toBe("2026-10-26T09:03:39.000Z");
    expect(lerData("2026-10-26T06:00:00-03:00")).toBe("2026-10-26T09:00:00.000Z");
  });

  it("entende mês em português", () => {
    expect(lerData("seg, 26 out 2026 09:03:39 +0000")).toBe("2026-10-26T09:03:39.000Z");
  });

  it("devolve null sem data legível", () => {
    expect(lerData("ontem à tarde")).toBeNull();
    expect(lerData(null)).toBeNull();
  });
});

describe("limparUrl", () => {
  it("tira utm e âncora, mantém o resto", () => {
    expect(limparUrl("https://a.com.br/x?id=3&utm_source=rss#topo")).toBe("https://a.com.br/x?id=3");
  });

  it("recusa o que não é http", () => {
    expect(limparUrl("javascript:alert(1)")).toBeNull();
    expect(limparUrl("não é url")).toBeNull();
  });
});

describe("cortar", () => {
  it("corta na palavra e põe reticências", () => {
    const texto = "palavra ".repeat(80).trim();
    const cortado = cortar(texto, 50);
    expect(cortado.length).toBeLessThanOrEqual(51);
    expect(cortado.endsWith("palavra…")).toBe(true);
  });

  it("não mexe em texto curto", () => {
    expect(cortar("curto", 50)).toBe("curto");
  });
});

describe("decodificarEntidades", () => {
  it("decodifica números e nomes, deixa o desconhecido", () => {
    expect(decodificarEntidades("a &amp; b &#233; &#xE7; &foo;")).toBe("a & b é ç &foo;");
  });
});

describe("feedPermitido", () => {
  it("aceita feed público", () => {
    expect(feedPermitido("https://rss.tecmundo.com.br/feed")).toBe(true);
    expect(feedPermitido("https://www.meioemensagem.com.br/feed")).toBe(true);
  });

  it("barra rede interna e endereço sem domínio", () => {
    for (const url of [
      "http://localhost:3000/feed",
      "http://127.0.0.1/feed",
      "http://192.168.0.10/rss",
      "http://10.0.0.1/rss",
      "http://169.254.169.254/latest",
      "http://servidor/feed",
      "http://api.internal/feed",
      "ftp://a.com.br/feed",
    ]) {
      expect(feedPermitido(url), url).toBe(false);
    }
  });
});
