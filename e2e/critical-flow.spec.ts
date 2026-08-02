import { expect, test } from "@playwright/test";

test("registro, empresa y movimiento financiero", async ({ page }) => {
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  await page.goto("/sign-up");
  await page.getByLabel("Tu nombre").fill("Persona E2E");
  await page.getByLabel("Correo electrónico").fill(`e2e-${unique}@deciflujo.test`);
  await page.getByLabel("Contraseña").fill("DeciflujoE2E123!");
  const signUpResponse = page.waitForResponse(
    (response) => response.url().includes("/api/auth/sign-up/email"),
  );
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  expect((await signUpResponse).status()).toBe(200);

  await expect(page).toHaveURL(/\/onboarding/, { timeout: 20_000 });
  await page.getByLabel("Nombre de la empresa").fill("Empresa E2E");
  await page.getByRole("button", { name: "Crear espacio" }).click();

  await expect(
    page.getByRole("heading", {
      name: "Entiende tus números. Decide con claridad.",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Primeros pasos" }).click();
  await expect(
    page.getByRole("heading", { name: "Primeros pasos en Deciflujo" }),
  ).toBeVisible();
  await expect(page.getByText("Define dónde está tu dinero")).toBeVisible();
  await page.getByRole("button", { name: "Ir al paso 5: Cierre mensual" }).click();
  await page
    .getByLabel("No volver a mostrar el botón “Primeros pasos”")
    .check();
  await page.getByRole("button", { name: "Finalizar" }).click();
  await expect(page.getByRole("button", { name: "Primeros pasos" })).toHaveCount(0);

  await page.getByRole("link", { name: "Centro de ayuda" }).click();
  await page
    .getByRole("link", { name: "Volver a mostrar “Primeros pasos”" })
    .click();
  await expect(page.getByRole("button", { name: "Primeros pasos" })).toBeVisible();

  await page.getByRole("button", { name: "Nuevo movimiento" }).click();
  await page.getByLabel("Descripción").fill("Venta comprobada por E2E");
  await page.getByLabel("Monto (₡)").fill("125000");
  await page.getByRole("button", { name: "Guardar movimiento" }).click();

  await expect(page.getByText("Venta comprobada por E2E")).toBeVisible();
});

test("salud de aplicación y encabezados de seguridad", async ({ request }) => {
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect(await health.json()).toMatchObject({
    status: "ok",
    database: "reachable",
  });

  const signIn = await request.get("/sign-in");
  expect(signIn.headers()["x-content-type-options"]).toBe("nosniff");
  expect(signIn.headers()["x-frame-options"]).toBe("DENY");
});

test("cambios de rol y bajas quedan auditados", async ({ browser, baseURL }) => {
  const origin = baseURL ?? "http://127.0.0.1:3200";
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const ownerEmail = `owner-${unique}@deciflujo.test`;
  const memberEmail = `member-${unique}@deciflujo.test`;
  const headers = { Origin: origin };
  const owner = await browser.newContext({ baseURL: origin });
  const member = await browser.newContext({ baseURL: origin });

  try {
    expect(
      (
        await owner.request.post("/api/auth/sign-up/email", {
          headers,
          data: {
            name: "Propietario E2E",
            email: ownerEmail,
            password: "DeciflujoE2E123!",
          },
        })
      ).status(),
    ).toBe(200);
    const organizationResponse = await owner.request.post(
      "/api/auth/organization/create",
      {
        headers,
        data: { name: "Equipo E2E", slug: `equipo-${unique}` },
      },
    );
    expect(organizationResponse.status()).toBe(200);
    const organization = await organizationResponse.json();
    await owner.request.post("/api/auth/organization/set-active", {
      headers,
      data: { organizationId: organization.id },
    });

    const invitationResponse = await owner.request.post(
      "/api/auth/organization/invite-member",
      {
        headers,
        data: { email: memberEmail, role: "collaborator" },
      },
    );
    expect(invitationResponse.status()).toBe(200);
    const invitation = await invitationResponse.json();

    await member.request.post("/api/auth/sign-up/email", {
      headers,
      data: {
        name: "Miembro E2E",
        email: memberEmail,
        password: "DeciflujoE2E123!",
      },
    });
    expect(
      (
        await member.request.post("/api/auth/organization/accept-invitation", {
          headers,
          data: { invitationId: invitation.id },
        })
      ).status(),
    ).toBe(200);

    const fullOrganization = await (
      await owner.request.get("/api/auth/organization/get-full-organization")
    ).json();
    const target = fullOrganization.members.find(
      (current: { user: { email: string } }) => current.user.email === memberEmail,
    );
    expect(target).toBeTruthy();

    expect(
      (
        await owner.request.patch(`/api/team/members/${target.id}`, {
          headers,
          data: { role: "accountant" },
        })
      ).status(),
    ).toBe(200);
    let audit = await (await owner.request.get("/api/audit-events")).json();
    expect(audit.data.some((event: { action: string }) => event.action === "member.role_changed")).toBe(true);

    expect(
      (
        await owner.request.delete(`/api/team/members/${target.id}`, { headers })
      ).status(),
    ).toBe(200);
    audit = await (await owner.request.get("/api/audit-events")).json();
    expect(audit.data.some((event: { action: string }) => event.action === "member.removed")).toBe(true);
  } finally {
    await owner.close();
    await member.close();
  }
});
