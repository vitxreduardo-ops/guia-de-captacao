import { describe, expect, it } from "vitest";
import { parseContent } from "@/lib/planejamentoTypes";
import { aplicarEdicao } from "@/lib/planejamentoEdit";

const base = new Date(2026, 10, 15);

const conteudo = () =>
  parseContent(
    {
      ano: 2026,
      mes: 11,
      resumo: "Resumo velho",
      fatos: ["10 entregas", "3 stories"],
      comQuemFalamos: "Pacientes",
      comoFunciona: ["Grava na quarta"],
      regras: ["Sem promessa"],
      tomDeVoz: ["Calmo"],
      avisos: ["Aviso 1"],
      linhas: [{ titulo: "Rotina", descricao: "Bastidores" }],
      rotina: [{ dia: "Seg", texto: "Feed", tipo: "feed" }],
      entregas: [
        {
          dia: 3,
          tipo: "reels",
          titulo: "Reel A",
          fala: "Fala velha",
          rascunhos: ["fala"],
          telas: ["Tela 1", "Tela 2"],
          comoFazer: ["Passo 1"],
          detalhes: [{ rotulo: "Gancho", texto: "Texto do gancho" }],
          referencias: [{ titulo: "Ref", url: "https://exemplo.com/a" }],
          legenda: "Legenda velha",
        },
      ],
    },
    base,
  );

const ok = (r: ReturnType<typeof aplicarEdicao>) => {
  if (!r.ok) throw new Error(r.erro);
  return r;
};

describe("aplicarEdicao: entrega", () => {
  it("troca um campo de texto e devolve o valor anterior", () => {
    const r = ok(aplicarEdicao(conteudo(), ["e", "e0", "titulo"], "  Reel B  "));
    expect(r.content.entregas[0].titulo).toBe("Reel B");
    expect(r.valor).toBe("Reel B");
    expect(r.anterior).toBe("Reel A");
  });

  it("não altera o conteúdo recebido", () => {
    const c = conteudo();
    ok(aplicarEdicao(c, ["e", "e0", "titulo"], "Outro"));
    expect(c.entregas[0].titulo).toBe("Reel A");
  });

  it("edita item de lista pelo índice", () => {
    const r = ok(aplicarEdicao(conteudo(), ["e", "e0", "telas", "1"], "Nova tela"));
    expect(r.content.entregas[0].telas).toEqual(["Tela 1", "Nova tela"]);
    expect(r.anterior).toBe("Tela 2");
  });

  it("edita rótulo e texto de um detalhe", () => {
    const a = ok(aplicarEdicao(conteudo(), ["e", "e0", "detalhes", "0", "texto"], "Novo"));
    expect(a.content.entregas[0].detalhes[0]).toEqual({ rotulo: "Gancho", texto: "Novo" });
    const b = ok(aplicarEdicao(conteudo(), ["e", "e0", "detalhes", "0", "rotulo"], "Cenário"));
    expect(b.content.entregas[0].detalhes[0].rotulo).toBe("Cenário");
  });

  it("revisar fala, legenda ou card tira a marca de rascunho da IA", () => {
    const r = ok(aplicarEdicao(conteudo(), ["e", "e0", "fala"], "Fala revisada"));
    expect(r.content.entregas[0].rascunhos).toEqual([]);
  });

  it("campo opcional pode ser esvaziado; título e itens de lista não", () => {
    expect(ok(aplicarEdicao(conteudo(), ["e", "e0", "legenda"], "")).content.entregas[0].legenda).toBe("");
    expect(aplicarEdicao(conteudo(), ["e", "e0", "titulo"], "  ").ok).toBe(false);
    expect(aplicarEdicao(conteudo(), ["e", "e0", "telas", "0"], "").ok).toBe(false);
  });

  it("link de referência precisa ser http(s); o título pode ficar vazio", () => {
    expect(aplicarEdicao(conteudo(), ["e", "e0", "referencias", "0", "url"], "javascript:alert(1)").ok).toBe(false);
    expect(aplicarEdicao(conteudo(), ["e", "e0", "referencias", "0", "url"], "instagram.com/p/x").ok).toBe(false);
    const r = ok(aplicarEdicao(conteudo(), ["e", "e0", "referencias", "0", "url"], "https://instagram.com/p/x"));
    expect(r.content.entregas[0].referencias[0].url).toBe("https://instagram.com/p/x");
    expect(ok(aplicarEdicao(conteudo(), ["e", "e0", "referencias", "0", "titulo"], "")).content.entregas[0].referencias[0].titulo).toBe("");
  });
});

describe("aplicarEdicao: estratégia", () => {
  it("edita textos soltos, itens de lista, linhas e rotina", () => {
    expect(ok(aplicarEdicao(conteudo(), ["s", "resumo"], "Resumo novo")).content.resumo).toBe("Resumo novo");
    expect(ok(aplicarEdicao(conteudo(), ["s", "fatos", "1"], "4 stories")).content.fatos).toEqual(["10 entregas", "4 stories"]);
    expect(ok(aplicarEdicao(conteudo(), ["s", "avisos", "0"], "Aviso novo")).content.avisos).toEqual(["Aviso novo"]);
    expect(ok(aplicarEdicao(conteudo(), ["s", "linhas", "0", "descricao"], "Outra")).content.linhas[0].descricao).toBe("Outra");
    expect(ok(aplicarEdicao(conteudo(), ["s", "rotina", "0", "texto"], "Card às 11h")).content.rotina[0].texto).toBe("Card às 11h");
  });

  it("título de linha é obrigatório, descrição não", () => {
    expect(aplicarEdicao(conteudo(), ["s", "linhas", "0", "titulo"], "").ok).toBe(false);
    expect(ok(aplicarEdicao(conteudo(), ["s", "linhas", "0", "descricao"], "")).content.linhas[0].descricao).toBe("");
  });
});

describe("aplicarEdicao: o que nunca pode ser editado", () => {
  it.each([
    [["e", "e0", "tipo"]],
    [["e", "e0", "dia"]],
    [["e", "e0", "id"]],
    [["e", "e0", "rascunhos"]],
    [["e", "e9", "titulo"]],
    [["e", "e0", "telas", "7"]],
    [["e", "e0", "telas", "-1"]],
    [["e", "e0", "telas", "x"]],
    [["e", "e0", "telas"]],
    [["e", "e0", "titulo", "extra"]],
    [["s", "ano"]],
    [["s", "mes"]],
    [["s", "entregas", "0"]],
    [["s", "rotina", "0", "dia"]],
    [["s", "fatos", "5"]],
    [["x", "resumo"]],
    [[]],
    [["__proto__", "x"]],
  ])("recusa %j", (caminho) => {
    expect(aplicarEdicao(conteudo(), caminho as string[], "valor").ok).toBe(false);
  });

  it("recusa texto acima de 4000 caracteres", () => {
    expect(aplicarEdicao(conteudo(), ["s", "resumo"], "a".repeat(4001)).ok).toBe(false);
    expect(aplicarEdicao(conteudo(), ["s", "resumo"], "a".repeat(4000)).ok).toBe(true);
  });

  it("normaliza quebras de linha do Windows", () => {
    const r = ok(aplicarEdicao(conteudo(), ["e", "e0", "fala"], "a\r\nb"));
    expect(r.content.entregas[0].fala).toBe("a\nb");
  });
});
