import { chromium } from "@playwright/test";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const baseURL = process.env.DECIFLUJO_VIDEO_URL ?? "http://localhost:3200";
const outputDirectory = path.resolve("artifacts/linkedin");
const rawVideoPath = path.join(outputDirectory, "deciflujo-linkedin-demo.webm");
const localBrowserLibraries = path.join(
  os.homedir(),
  ".local/share/deciflujo-playwright-libs/usr/lib/x86_64-linux-gnu",
);

if (existsSync(localBrowserLibraries)) {
  process.env.LD_LIBRARY_PATH = [
    localBrowserLibraries,
    process.env.LD_LIBRARY_PATH,
  ]
    .filter(Boolean)
    .join(":");
}

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
let context = await browser.newContext({
  baseURL,
  colorScheme: "light",
  locale: "es-CR",
});
let page;
let recordedVideo;

async function pause(milliseconds) {
  await page.waitForTimeout(milliseconds);
}

async function showTitle(title, subtitle) {
  await page.setContent(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            overflow: hidden;
            color: #f7f9fd;
            background:
              radial-gradient(circle at 78% 18%, rgba(53, 103, 168, .24), transparent 30%),
              radial-gradient(circle at 15% 82%, rgba(214, 123, 63, .16), transparent 28%),
              #101f36;
            font-family: Arial, Helvetica, sans-serif;
          }
          main { width: 78%; text-align: center; }
          .mark {
            width: 118px;
            height: 118px;
            margin: 0 auto 38px;
            display: grid;
            place-items: center;
            border: 2px solid rgba(255,255,255,.45);
            border-radius: 30px;
            background: rgba(255,255,255,.1);
            box-shadow: 0 24px 60px rgba(0,0,0,.22);
            font-size: 58px;
            font-weight: 700;
          }
          h1 { margin: 0; font-size: 70px; letter-spacing: -3px; }
          p { margin: 24px auto 0; max-width: 760px; color: #d6e4f3; font-size: 30px; line-height: 1.35; }
          .tag { margin-top: 54px; color: #93b4dc; font-size: 20px; letter-spacing: 4px; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <main>
          <div class="mark">D</div>
          <h1>${title}</h1>
          <p>${subtitle}</p>
          <div class="tag">Control para pequeñas empresas</div>
        </main>
      </body>
    </html>
  `);
}

async function caption(title, subtitle) {
  await page.evaluate(
    ({ titleText, subtitleText }) => {
      document.querySelector("nextjs-portal")?.remove();
      document.querySelector("[data-video-caption]")?.remove();
      const element = document.createElement("div");
      element.dataset.videoCaption = "true";
      element.innerHTML = `<strong>${titleText}</strong><span>${subtitleText}</span>`;
      Object.assign(element.style, {
        position: "fixed",
        zIndex: "9999",
        left: "40px",
        right: "40px",
        bottom: "38px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        padding: "24px 28px",
        border: "1px solid rgba(255,255,255,.24)",
        borderRadius: "18px",
        color: "white",
        background: "rgba(16,31,54,.94)",
        boxShadow: "0 18px 48px rgba(0,0,0,.24)",
        fontFamily: "Arial, Helvetica, sans-serif",
      });
      const strong = element.querySelector("strong");
      const span = element.querySelector("span");
      Object.assign(strong.style, { fontSize: "26px", lineHeight: "1.1" });
      Object.assign(span.style, {
        color: "#d6e4f3",
        fontSize: "18px",
        lineHeight: "1.35",
      });
      document.body.append(element);
    },
    { titleText: title, subtitleText: subtitle },
  );
}

async function post(url, data) {
  const response = await context.request.post(url, {
    headers: { Origin: baseURL },
    data,
  });
  if (!response.ok()) {
    throw new Error(`${url} respondió ${response.status()}: ${await response.text()}`);
  }
  return response.json();
}

try {
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  await post("/api/auth/sign-up/email", {
    name: "Jesús Rodríguez",
    email: `demo-${unique}@deciflujo.test`,
    password: "DeciflujoVideo123!",
  });
  const organization = await post("/api/auth/organization/create", {
    name: "Café Horizonte",
    slug: `cafe-horizonte-${unique}`,
  });
  await post("/api/auth/organization/set-active", {
    organizationId: organization.id,
  });

  const setupPage = await context.newPage();
  await setupPage.goto("/", { waitUntil: "networkidle" });
  await setupPage.close();

  const accountsResponse = await context.request.get("/api/accounts");
  if (!accountsResponse.ok()) {
    throw new Error(
      `/api/accounts respondió ${accountsResponse.status()}: ${await accountsResponse.text()}`,
    );
  }
  const existingAccounts = (await accountsResponse.json()).data;
  const accountId =
    existingAccounts[0]?.id ??
    (
      await post("/api/accounts", {
        name: "Cuenta principal",
        type: "bank",
        openingBalanceCents: 300_000_00,
      })
    ).data.id;
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const transactions = [
    ["Ventas del mes", 1_250_000_00, "income", "Ventas"],
    ["Servicios profesionales", 425_000_00, "income", "Servicios"],
    ["Pago a proveedores", 380_000_00, "expense", "Operación"],
    ["Campaña digital", 160_000_00, "expense", "Marketing"],
    ["Pago de planilla", 520_000_00, "expense", "Nómina"],
  ];
  for (const [description, amountCents, type, category] of transactions) {
    await post("/api/transactions", {
      description,
      amountCents,
      type,
      category,
      accountId,
      occurredOn: today,
    });
  }
  for (const [category, plannedCents] of [
    ["Marketing", 200_000_00],
    ["Nómina", 650_000_00],
    ["Operación", 500_000_00],
  ]) {
    await post("/api/budgets", { month, category, plannedCents });
  }
  await post("/api/open-items", {
    kind: "receivable",
    counterpartyName: "Cliente Aurora",
    concept: "Proyecto de julio",
    amountCents: 600_000_00,
    dueOn: today,
  });
  await post("/api/open-items", {
    kind: "payable",
    counterpartyName: "Proveedor Central",
    concept: "Compra de inventario",
    amountCents: 250_000_00,
    dueOn: today,
  });

  const storageState = await context.storageState();
  await context.close();
  context = await browser.newContext({
    baseURL,
    viewport: { width: 1080, height: 1350 },
    recordVideo: {
      dir: outputDirectory,
      size: { width: 1080, height: 1350 },
    },
    colorScheme: "light",
    locale: "es-CR",
    storageState,
  });
  page = await context.newPage();
  recordedVideo = page.video();

  await showTitle("Deciflujo", "Entiende tus números. Decide con claridad.");
  await pause(3600);

  await page.goto("/", { waitUntil: "networkidle" });
  await caption(
    "Tu negocio en una sola vista",
    "Saldo, ingresos, egresos y margen operativo actualizados automáticamente.",
  );
  await pause(5200);

  await page.getByRole("button", { name: "Nuevo movimiento" }).click();
  await page.getByLabel("Descripción").fill("Venta corporativa");
  await page.getByLabel("Monto (₡)").fill("225000");
  await caption(
    "Registra cada movimiento",
    "Indica el monto, la categoría y la cuenta; Deciflujo recalcula el saldo.",
  );
  await pause(2500);
  await page.getByRole("button", { name: "Guardar movimiento" }).click();
  await page.getByText("Venta corporativa").waitFor({ state: "visible" });
  await pause(2700);

  await page.goto("/budgets", { waitUntil: "networkidle" });
  await caption(
    "Presupuestos contra gastos reales",
    "Las alertas aparecen al acercarte o superar el límite mensual.",
  );
  await pause(5000);

  await page.goto("/receivables", { waitUntil: "networkidle" });
  await caption(
    "Cobros y pagos bajo control",
    "Visualiza vencimientos y registra pagos sin perder el historial.",
  );
  await pause(5000);

  await page.goto("/trends", { waitUntil: "networkidle" });
  await caption(
    "Tendencias y cierres mensuales",
    "Compara resultados y protege los períodos que ya fueron confirmados.",
  );
  await pause(5200);

  await showTitle("Deciflujo", "Entiende tus números. Decide con claridad.");
  await pause(4000);
} finally {
  await context.close();
  await recordedVideo?.saveAs(rawVideoPath);
  await browser.close();
}

console.log(rawVideoPath);
