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

    const title = await page.title();
    const bodyText = await page.evaluate(() => document.body.innerText);

    const motorLink = await page.evaluate(() => {
      const links = [...document.querySelectorAll("a")];
      const reservar = links.find((a) =>
        /reservar|booking|hbook|system|checkin/i.test(a.href)
      );
      return reservar ? reservar.href : null;
    });

    await browser.close();

    return res.json({
      nome_pousada: title,
      cidade: bodyText.match(/Florianópolis|Itacaré|Arraial.*|Ubatuba|Ilhabela|Paraty/i)?.[0] || "",
      estado: bodyText.match(/\b[A-Z]{2}\b/)?.[0] || "",
      link_motor: motorLink || "",
      estilo: bodyText.match(/(rústico|praia|charmoso|pé na areia|natureza|familiar)/i)?.[0] || "",
      diferenciais: bodyText.match(/piscina|café da manhã|estacionamento|wifi|bar/i)?.[0] || "",
      canal: bodyText.includes("WhatsApp") ? "WhatsApp" : "Site",
    });
  } catch (e) {
    return res.status(500).json({ error: "Erro ao fazer scraping", detalhe: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});
