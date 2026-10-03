import { expect, test, type Page } from '@playwright/test';

/** Convierte "00:12,34" a segundos. */
function clockSeconds(text: string): number {
	const m = text.match(/(\d+):(\d+),(\d+)/);
	if (!m) throw new Error(`reloj ilegible: ${text}`);
	return Number(m[1]) * 60 + Number(m[2]) + Number(m[3]) / 100;
}

async function readClocks(page: Page) {
	const ref = await page.locator('.dial .time').first().textContent();
	const local = await page.locator('.dial .time.local').textContent();
	return { ref: clockSeconds(ref ?? ''), local: clockSeconds(local ?? '') };
}

async function setField(page: Page, label: string | RegExp, value: string) {
	const field = page.getByLabel(label, { exact: typeof label === 'string' });
	await field.click();
	await field.fill(value);
	await field.press('Enter');
}

function collectErrors(page: Page): string[] {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));
	page.on('console', (m) => {
		if (m.type() === 'error') errors.push(m.text());
	});
	return errors;
}

test.beforeEach(async ({ page }) => {
	// Sin tutorial ni escenario guardado entre pruebas.
	await page.addInitScript(() => {
		try {
			if (!sessionStorage.getItem('e2e-init')) {
				localStorage.clear();
				localStorage.setItem('black-hole-lab:tutorial:v1', '1');
				sessionStorage.setItem('e2e-init', '1');
			}
		} catch {
			/* sin almacenamiento */
		}
	});
});

test('carga: título, controles y métricas iniciales sin errores', async ({ page }) => {
	const errors = collectErrors(page);
	await page.goto('/');
	await expect(page).toHaveTitle(/Black Hole Lab/);
	await expect(page.getByRole('tab', { name: 'Relojes' })).toHaveAttribute('aria-selected', 'true');
	await expect(page.getByText('Pausado', { exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Iniciar', exact: true })).toBeEnabled();
	await expect(page.locator('.metric', { hasText: 'Ritmo local' })).toContainText('0,866×');
	await expect(page.locator('.metric', { hasText: 'Radio de Schwarzschild' })).toContainText(
		'29,5'
	);
	await expect(page.getByText('Malla ilustrativa')).toHaveCount(0);
	expect(errors).toEqual([]);
});

test('relojes: x = 1,1 da q ≈ 0,302 y los relojes acumulan con esa razón; pausa y reset', async ({
	page
}) => {
	await page.clock.install();
	await page.goto('/');
	await setField(page, 'Radio (rs)', '1,1');
	await expect(page.locator('.metric', { hasText: 'Ritmo local' })).toContainText('0,302×');
	await expect(page.locator('.metric', { hasText: 'Radio del observador' })).toContainText(
		'32,5 km'
	);
	await expect(page.locator('.clocks').getByText(/aceleración enorme/)).toBeVisible();

	await page.getByRole('button', { name: 'Iniciar', exact: true }).click();
	await page.clock.runFor(4000);
	await page.getByRole('button', { name: 'Pausar' }).click();
	const c1 = await readClocks(page);
	expect(c1.ref).toBeGreaterThan(3);
	expect(c1.local / c1.ref).toBeCloseTo(Math.sqrt(1 - 1 / 1.1), 1);

	// En pausa no avanza aunque pase el tiempo.
	await page.clock.runFor(60_000);
	const c2 = await readClocks(page);
	expect(c2).toEqual(c1);

	// Paso manual: +0,1 s didácticos.
	await page.getByRole('button', { name: /Paso/ }).click();
	await expect.poll(async () => (await readClocks(page)).ref).toBeCloseTo(c1.ref + 0.1, 1);

	// Reiniciar conserva parámetros.
	await page.getByRole('button', { name: 'Reiniciar experimento' }).click();
	await expect.poll(async () => (await readClocks(page)).ref).toBe(0);
	await expect(page.getByLabel('Radio (rs)', { exact: true })).toHaveValue('1,1');
});

test('masa: lock rs conserva q y duplica rs; lock km cambia x o rechaza', async ({ page }) => {
	await page.goto('/');
	await setField(page, 'Masa', '20');
	await expect(page.locator('.metric', { hasText: 'Ritmo local' })).toContainText('0,866×');
	await expect(page.locator('.metric', { hasText: 'Radio de Schwarzschild' })).toContainText(
		'59,1'
	);

	await page.getByLabel(/Mantener distancia en km/).check();
	await setField(page, 'Masa', '40');
	// 4 rs con 20 M☉ = 236 km ⇒ con 40 M☉ son 2 rs.
	await expect(page.getByLabel('Radio (rs)', { exact: true })).toHaveValue('2');
	await expect(page.locator('.metric', { hasText: 'Ritmo local' })).toContainText('0,707×');

	// 2 rs con 40 M☉ = 236 km ⇒ con 100 M☉ serían 0,8 rs: rechazo explícito.
	await setField(page, 'Masa', '100');
	await expect(page.getByText(/No se cambió la masa/).first()).toBeVisible();
	await expect(page.getByLabel('Masa', { exact: true })).toHaveAttribute('aria-invalid', 'true');
	await expect(page.locator('.metric', { hasText: 'Radio de Schwarzschild' })).toContainText('118');
	await page.getByRole('button', { name: /Usar escala rs y aplicar 100/ }).click();
	await expect(page.getByLabel('Masa', { exact: true })).toHaveValue('100');
	await expect(page.getByLabel('Radio (rs)', { exact: true })).toHaveValue('2');
});

test('entrada inválida: no convierte vacío en cero y Escape cancela', async ({ page }) => {
	await page.goto('/');
	const field = page.getByLabel('Radio (rs)', { exact: true });
	await field.fill('');
	await field.press('Enter');
	await expect(page.getByRole('alert')).toContainText('Escribe un número');
	await field.fill('0,5');
	await field.press('Enter');
	await expect(page.getByRole('alert')).toContainText('Fuera de rango');
	await field.press('Escape');
	await expect(field).toHaveValue('4');
	await expect(page.locator('.metric', { hasText: 'Ritmo local' })).toContainText('0,866×');
});

test('teclado: tabs con flechas y observador con flechas/Inicio', async ({ page }) => {
	await page.goto('/');
	const tab = page.getByRole('tab', { name: 'Relojes' });
	await tab.focus();
	await page.keyboard.press('ArrowRight');
	await expect(page.getByRole('tab', { name: 'Órbitas' })).toBeFocused();
	await expect(page.getByRole('tab', { name: 'Órbitas' })).toHaveAttribute('aria-selected', 'true');
	await page.keyboard.press('ArrowLeft');
	await expect(page.getByRole('tab', { name: 'Relojes' })).toHaveAttribute('aria-selected', 'true');

	const handle = page.getByRole('slider', { name: /Observador: arrastra/ });
	await handle.focus();
	await page.keyboard.press('Shift+ArrowLeft');
	await expect(handle).toHaveAttribute('aria-valuenow', '3.5');
	await page.keyboard.press('Home');
	await expect(handle).toHaveAttribute('aria-valuenow', '1.01');
	await expect(page.locator('.metric', { hasText: 'Ritmo local' })).toContainText('0,100×');
	await page.keyboard.press('End');
	await expect(page.getByRole('button', { name: /Encuadrar observador/ })).toBeVisible();
	await page.getByRole('button', { name: /Encuadrar observador/ }).click();
	await expect(handle).toBeVisible();
	await expect(handle).toHaveAttribute('aria-valuenow', '20');
});

test('drag del observador con captura de puntero y límite mínimo', async ({ page }) => {
	await page.goto('/');
	const handle = page.getByRole('slider', { name: /Observador: arrastra/ });
	const scene = page.locator('.scene canvas');
	const box = (await scene.boundingBox())!;
	const h = (await handle.boundingBox())!;
	const cx = box.x + box.width / 2;
	const cy = box.y + box.height / 2;
	await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
	await page.mouse.down();
	// Al centro: se limita a 1,01 rs, nunca cruza el horizonte.
	await page.mouse.move(cx + 2, cy, { steps: 8 });
	await page.mouse.up();
	await expect(handle).toHaveAttribute('aria-valuenow', '1.01');
	// Alejar por arrastre hacia arriba: cambia x y ángulo.
	const h2 = (await handle.boundingBox())!;
	await page.mouse.move(h2.x + h2.width / 2, h2.y + h2.height / 2);
	await page.mouse.down();
	await page.mouse.move(cx, cy - box.height * 0.3, { steps: 8 });
	await page.mouse.up();
	const x = Number(await handle.getAttribute('aria-valuenow'));
	expect(x).toBeGreaterThan(3);
	// Después de soltar, mover el ratón no arrastra.
	await page.mouse.move(cx + 50, cy + 50);
	expect(Number(await handle.getAttribute('aria-valuenow'))).toBe(x);
});

test('órbitas: circular estable, precesión con dos modelos y límite de lanzamientos', async ({
	page
}) => {
	await page.clock.install();
	await page.goto('/');
	await page.getByRole('tab', { name: 'Órbitas' }).click();
	await page.locator('[data-preset=orbit-circular]').click();
	await page.getByRole('button', { name: 'Órbita circular en este radio' }).click();
	await expect(page.getByText(/Circular estable en 6,00 rs/)).toBeVisible();

	await page.locator('[data-preset=orbit-precession]').click();
	await expect(page.getByLabel('Comparar')).toBeChecked();
	await page.getByRole('button', { name: 'Lanzar par' }).click();
	const rows = page.locator('table.bodies tbody tr');
	await expect(rows).toHaveCount(2);
	await expect(rows.nth(0)).toContainText('Schwarzschild');
	await expect(rows.nth(1)).toContainText('Newton');
	await expect(rows.nth(1)).toContainText('No aplica (Newton)');
	await expect(page.locator('.legend')).toContainText('Newton (discontinua, rombo)');

	await page.getByRole('button', { name: /Iniciar/ }).click();
	await page.clock.runFor(16_000);
	await page.getByRole('button', { name: 'Pausar' }).click();
	// Tras ~320 T las posiciones radiales difieren (precesión real, misma T).
	const xs = await rows.locator('td:nth-child(3)').allTextContents();
	const [xg, xn] = xs.map((t) => Number(t.replace(',', '.')));
	expect(Math.abs(xg! - xn!)).toBeGreaterThan(0.05);
	await page.getByText('Fórmulas, hipótesis y diagnóstico').click();
	await expect(page.locator('details.science')).toContainText(/avance por vuelta\s+3,77/);

	// Límite de 8 lanzamientos con opción explícita.
	for (let i = 0; i < 7; i++) {
		await page.getByRole('button', { name: 'Lanzar par' }).click();
		await expect(page.getByText(`${i + 2}/8 lanzamientos`)).toBeVisible();
	}
	await page.getByRole('button', { name: 'Lanzar par' }).click();
	await expect(page.getByText('Límite de 8 lanzamientos alcanzado.')).toBeVisible();
	await page.getByRole('button', { name: 'Eliminar el más antiguo y lanzar' }).click();
	await expect(page.getByText('8/8 lanzamientos')).toBeVisible();
	await page.getByRole('button', { name: 'Limpiar trayectorias' }).first().click();
	await expect(rows).toHaveCount(0);
});

test('órbitas: caída capturada en el cutoff y escape radial', async ({ page }) => {
	await page.clock.install();
	await page.goto('/');
	await page.getByRole('tab', { name: 'Órbitas' }).click();
	await page.locator('[data-preset=orbit-infall]').click();
	await page.getByRole('button', { name: 'Lanzar', exact: true }).click();
	await page.locator('[data-preset=orbit-escape]').click();
	await page.getByRole('button', { name: 'Lanzar', exact: true }).click();
	await expect(page.locator('table.bodies tbody tr')).toHaveCount(1); // preset reinicia el experimento
	await page.getByRole('button', { name: /Iniciar/ }).click();
	await page.clock.runFor(6000);
	await expect(page.locator('table.bodies tbody tr').first()).toContainText(
		/Escapa|Fuera del área/
	);
});

test('fotones: B = 2,4 capturado, B = 3 dispersado, casi crítico no estable', async ({ page }) => {
	await page.clock.install();
	await page.goto('/');
	await page.getByRole('tab', { name: 'Fotones' }).click();
	for (const id of ['photon-captured', 'photon-scattered']) {
		await page.locator(`[data-preset=${id}]`).click();
		await page.getByRole('button', { name: 'Emitir fotón' }).click();
		await expect(page.locator('table.bodies tbody tr')).toHaveCount(1);
		await page.getByRole('button', { name: /Iniciar|Continuar/ }).click();
		await page.clock.runFor(4000);
		await page.getByRole('button', { name: 'Pausar' }).click();
		const status = id === 'photon-captured' ? /Capturada/ : /Escapa|Fuera del área/;
		await expect(page.locator('table.bodies tbody tr').first()).toContainText(status);
		await expect(page.locator('table.bodies tbody tr').first()).toContainText('sin reloj propio');
	}
	await page.locator('[data-preset=photon-near-critical]').click();
	await expect(page.getByText(/Próximo a la órbita inestable/)).toBeVisible();
	await expect(page.getByText(/(^|\s)estable\b/i)).toHaveCount(0);
	await expect(page.getByText('Trayectoria prevista (en pausa)')).toBeVisible();
	await expect(page.locator('.readout strong')).toContainText(/Escapa/);
	// Cambiar B actualiza la previsión sin bloquear.
	await setField(page, '|B|', '2');
	await expect(page.locator('.readout strong')).toContainText(/Capturada/);
});

test('compartir: enlace restaura en pausa; URL inválida avisa y usa valores iniciales', async ({
	page,
	context
}) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	await page.goto('/');
	await page.getByRole('tab', { name: 'Fotones' }).click();
	await setField(page, '|B|', '2,9');
	await page.getByRole('button', { name: 'Copiar enlace' }).click();
	await expect(page.getByText(/Enlace copiado/).first()).toBeVisible();
	const link = await page.evaluate(() => navigator.clipboard.readText());
	expect(link).toContain('#scenario=');

	const fresh = await context.newPage();
	await fresh.goto(link);
	await expect(fresh.getByRole('tab', { name: 'Fotones' })).toHaveAttribute(
		'aria-selected',
		'true'
	);
	await expect(fresh.getByLabel('|B|', { exact: true })).toHaveValue('2,9');
	await expect(fresh.getByText('Pausado', { exact: true })).toBeVisible();

	// En la misma pestaña, un enlace inválido avisa y conserva el escenario actual.
	await fresh.goto('/#scenario=bm9wZQ');
	await expect(fresh.getByRole('alert').first()).toContainText('escenario no válido');
	await expect(fresh.getByRole('tab', { name: 'Fotones' })).toHaveAttribute(
		'aria-selected',
		'true'
	);
	// Al abrirlo de nuevo, una URL inválida usa los valores iniciales (no el escenario local).
	const other = await context.newPage();
	await other.goto('/#scenario=bm9wZQ');
	await expect(other.getByRole('alert').first()).toContainText('Se usan los valores iniciales');
	await expect(other.getByRole('tab', { name: 'Relojes' })).toHaveAttribute(
		'aria-selected',
		'true'
	);
	await other.getByRole('button', { name: 'Quitar el escenario del enlace' }).click();
	await expect(other).toHaveURL(/\/$/);
});

test('JSON y PNG: exportación real, reimportación y rechazo que conserva el estado', async ({
	page
}) => {
	await page.goto('/');
	await setField(page, 'Radio (rs)', '2,5');
	const jsonDownload = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Exportar JSON' }).click();
	const json = await jsonDownload;
	expect(json.suggestedFilename()).toBe('black-hole-lab-scenario.json');
	const path = await json.path();
	const text = await (await import('node:fs/promises')).readFile(path, 'utf8');
	expect(JSON.parse(text)).toMatchObject({ schemaVersion: 1, observer: { radiusRs: 2.5 } });

	const pngDownload = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Exportar PNG' }).click();
	const png = await pngDownload;
	expect(png.suggestedFilename()).toBe('black-hole-lab-clocks.png');
	const bytes = await (await import('node:fs/promises')).readFile(await png.path());
	expect(bytes.subarray(1, 4).toString()).toBe('PNG');
	expect(bytes.length).toBeGreaterThan(20_000);

	// Import inválido: se conserva el escenario actual.
	await setField(page, 'Radio (rs)', '6');
	const input = page.locator('input[type=file]');
	await input.setInputFiles({
		name: 'malo.json',
		mimeType: 'application/json',
		buffer: Buffer.from('{"schemaVersion":1}')
	});
	await expect(page.locator('.actions-panel').getByText(/Importación rechazada/)).toBeVisible();
	await expect(page.getByLabel('Radio (rs)', { exact: true })).toHaveValue('6');
	// Import válido del archivo exportado.
	await input.setInputFiles({
		name: 'ok.json',
		mimeType: 'application/json',
		buffer: Buffer.from(text)
	});
	await expect(page.getByLabel('Radio (rs)', { exact: true })).toHaveValue('2,5');
	await expect(page.getByText('Pausado', { exact: true })).toBeVisible();
});

test('persistencia local y Valores iniciales', async ({ page }) => {
	await page.goto('/');
	await setField(page, 'Radio (rs)', '7');
	await page.waitForTimeout(500);
	await page.reload();
	await expect(page.getByLabel('Radio (rs)', { exact: true })).toHaveValue('7');
	await page.getByRole('button', { name: 'Valores iniciales' }).click();
	await expect(page.getByLabel('Radio (rs)', { exact: true })).toHaveValue('4');
	await page.reload();
	await expect(page.getByLabel('Radio (rs)', { exact: true })).toHaveValue('4');
});

test('ocultar la pestaña pausa y no reanuda solo', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Iniciar', exact: true }).click();
	await expect(page.locator('.status', { hasText: 'En marcha' })).toBeVisible();
	await page.evaluate(() => {
		Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
		document.dispatchEvent(new Event('visibilitychange'));
	});
	await expect(page.getByText('Pausado', { exact: true })).toBeVisible();
	await expect(page.getByText(/Pausado al cambiar de pestaña/).first()).toBeVisible();
});

test('/about se carga directamente con fuentes e hipótesis', async ({ page }) => {
	await page.goto('/about');
	await expect(page.getByRole('heading', { level: 1, name: 'Modelo y fuentes' })).toBeVisible();
	await expect(page.getByText(/no la sombra/)).toBeVisible();
	await expect(page.getByRole('link', { name: /Physics 675/ })).toBeVisible();
	await page.reload();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Modelo y fuentes');
});

for (const vp of [
	{ width: 360, height: 800 },
	{ width: 768, height: 1024 },
	{ width: 1440, height: 900 },
	{ width: 800, height: 360 }
]) {
	test(`sin desbordamiento horizontal en ${vp.width}×${vp.height}`, async ({ page }) => {
		await page.setViewportSize(vp);
		for (const tab of ['Relojes', 'Órbitas', 'Fotones']) {
			await page.goto('/');
			await page.getByRole('tab', { name: tab }).click();
			const overflow = await page.evaluate(
				() => document.documentElement.scrollWidth - document.documentElement.clientWidth
			);
			expect(overflow, tab).toBeLessThanOrEqual(0);
			await expect(page.getByRole('button', { name: /Iniciar/ })).toBeVisible();
		}
	});
}
