const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");

const app = express();
app.use(cors());

app.get("/scrape", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "URL obrigatória" });

  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded" });

    const titleRaw = await page.title();
    const title = titleRaw
      .replace(/Bem[- ]vind[oa]s?[:\-]?\s*/i, "")
      .replace(/\s*\|\s*Home/i, "")
      .trim();

    const bodyText = await page.evaluate(() => document.body.innerText);

    const motorLink = await page.evaluate(() => {
      const links = [...document.querySelectorAll("a, button")];
      const reservar = links.find((el) => {
        const href = el.href || "";
        const text = el.innerText || "";
        return /reservar|booking|hbook|system|checkin/i.test(href + text);
      });
      return reservar?.href || null;
    });

    const cidade = bodyText.match(/(Florianópolis|Itacaré|Arraial.*|Ubatuba|Ilhabela|Paraty|Bombinhas|Jericoacoara|Pipa|Lençóis)/i)?.[0] || "";
    const estado = bodyText.match(/\b(SP|RJ|SC|BA|CE|RN|MA)\b/i)?.[0] || "";

    const estilo = bodyText.match(/(rústico|praia|charmoso|pé na areia|natureza|familiar|tranquilo|romântico)/i)?.[0] || "";
    const diferenciais = bodyText.match(/piscina|café da manhã|estacionamento|wifi|bar|pet friendly/i)?.[0] || "";
    const canal = bodyText.includes("WhatsApp") ? "WhatsApp" : "Site";

    await browser.close();

    return res.json({
      nome_pousada: title,
      cidade,
      estado,
      link_motor: motorLink || "",
      estilo,
      diferenciais,
      canal,
    });
  } catch (e) {
    return res.status(500).json({
      error: "Erro ao fazer scraping",
      detalhe: e.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});
