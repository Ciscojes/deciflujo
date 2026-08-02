const required = [
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "DATABASE_PROVIDER",
  "DATABASE_URL",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
];

const placeholderPattern = /(replace-with|your-|example\.com|localhost)/i;
const errors = [];

for (const name of required) {
  const value = process.env[name]?.trim();
  if (!value) errors.push(`${name} es obligatorio.`);
  else if (placeholderPattern.test(value)) errors.push(`${name} todavía contiene un valor de ejemplo.`);
}

if (process.env.BETTER_AUTH_SECRET && process.env.BETTER_AUTH_SECRET.length < 32) {
  errors.push("BETTER_AUTH_SECRET debe tener al menos 32 caracteres.");
}

for (const name of ["BETTER_AUTH_URL"]) {
  try {
    const url = new URL(process.env[name] ?? "");
    if (url.protocol !== "https:") errors.push(`${name} debe utilizar HTTPS.`);
  } catch {
    errors.push(`${name} debe ser una URL válida.`);
  }
}

if (process.env.DATABASE_PROVIDER !== "postgres") {
  errors.push("DATABASE_PROVIDER debe ser postgres en producción.");
}
if (process.env.DATABASE_URL && !/[?&]sslmode=(require|verify-full)/.test(process.env.DATABASE_URL)) {
  errors.push("DATABASE_URL debe exigir TLS mediante sslmode=require o verify-full.");
}

if (errors.length > 0) {
  console.error("La configuración de producción no está lista:");
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log("Configuración de producción válida. No se mostraron secretos.");
}
