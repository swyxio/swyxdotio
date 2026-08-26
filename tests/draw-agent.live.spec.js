import { expect, test } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { authenticateTools } from './helpers/tools-auth.js';

test.describe.configure({ retries: 0 });

// Explicitly paid, localhost-only evaluation. No model responses or drawing commands are mocked.
test('real drawing agent produces three source-grounded essay figures', async ({ browser }) => {
	test.skip(process.env.DRAW_LIVE_AGENT !== '1', 'Requires explicit paid-inference approval.');
	test.setTimeout(900_000);
	const origin = process.env.DRAW_LIVE_ORIGIN || 'http://localhost:4193';
	expect(['localhost', '127.0.0.1']).toContain(new URL(origin).hostname);
	const directory = process.env.DRAW_LIVE_OUTPUT;
	if (!directory) throw new Error('Set DRAW_LIVE_OUTPUT to a persistent evaluation directory.');
	await mkdir(directory, { recursive: true });
	const ledgerPath = join(directory, 'spend.json');
	/** @type {{capUsd: number, accountedUsd: number, requests: {job:string,reservedUsd:number,costUsd:number|null,status:string}[]}} */
	let ledger = { capUsd: 0.5, accountedUsd: 0, requests: [] };
	try {
		ledger = JSON.parse(await readFile(ledgerPath, 'utf8'));
	} catch (error) {
		if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error;
	}
	if (ledger.capUsd !== 0.5 || !Number.isFinite(ledger.accountedUsd) || ledger.accountedUsd < 0) {
		throw new Error('The existing evaluation cost ledger is invalid.');
	}
	const artifactDirectory = join(directory, process.env.DRAW_LIVE_RUN || 'baseline');
	await mkdir(artifactDirectory, { recursive: true });
	const jobs = [
		{
			id: 'architecture-comparison',
			prompt:
				'Create an editable essay figure comparing two ways to answer a support question: retrieval-first (search product docs, ground the answer) and a tool-using agent (choose a tool, observe the result, repeat until done or a limit). Same question and answer on both sides. Explain the control-flow difference, not a benchmark or a universal winner. Use the visual reasoning of swyx essays, sparse labels and meaningful color. Use the matching native preset if helpful. Make it useful at article width and review the result.'
		},
		{
			id: 'agent-tool-loop',
			prompt:
				'Draw an editable agent/tool loop for checking a package delivery: user asks, agent decides, tool queries tracking, observation returns to agent. Make the feedback edge and an independent answer/stop branch unambiguous; stop on done, budget, or error. No invented shipment data. Use swyx essay-figure aesthetics and native bound shapes. Use the matching preset if useful, adapt labels to the delivery example, and review the result.'
		},
		{
			id: 'notes-to-diagram',
			workflow: 'Try Notes → diagram workflow',
			prompt:
				'My rough notes: Publishing short learning notes may improve understanding because explaining reveals gaps and reader feedback prompts revision. I have not measured a learning improvement and have no study to cite. Objection: performing for an audience can crowd out deliberate practice. The claim should be conditional: public notes help when followed by private practice and revision. Turn this into one editable explanatory argument diagram, not an infographic. Keep the evidence gap and objection visible. Use native shapes and connectors and inspect the finished figure.'
		}
	];
	const outcomes = [];
	for (const job of jobs) {
		const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
		const page = await context.newPage();
		/** @type {any[]} */
		const records = [];
		let failure = null;
		await page.addInitScript(() => {
			Reflect.deleteProperty(window, 'showOpenFilePicker');
			Reflect.deleteProperty(window, 'showSaveFilePicker');
		});
		// Exclude media inference from this diagram-only authorization.
		await page.route('**/tools/api/draw/edit**', (route) => route.abort());
		await page.route('**/tools/api/draw/agent', async (route) => {
			if (route.request().method() === 'GET') return route.continue();
			// $0.05 conservatively covers one bounded request; keep unknown/failed calls reserved.
			if (ledger.accountedUsd + 0.05 > ledger.capUsd + Number.EPSILON) {
				await route.fulfill({
					status: 402,
					json: { error: 'Evaluation reached its total $0.50 cap.' }
				});
				return;
			}
			/** @type {{job:string,reservedUsd:number,costUsd:number|null,status:string}} */
			const entry = { job: job.id, reservedUsd: 0.05, costUsd: null, status: 'pending' };
			ledger.requests.push(entry);
			ledger.accountedUsd += 0.05;
			await writeFile(ledgerPath, JSON.stringify(ledger, null, 2));
			try {
				const response = await route.fetch({ timeout: 120_000, maxRetries: 0 });
				const result = await response.json();
				entry.status = String(response.status());
				if (Number.isFinite(result.modelCostUsd) && result.modelCostUsd >= 0) {
					entry.costUsd = result.modelCostUsd;
					ledger.accountedUsd += result.modelCostUsd - entry.reservedUsd;
				}
				records.push({
					status: response.status(),
					content: result.content,
					toolCalls: result.toolCalls,
					usage: result.usage,
					modelCostUsd: result.modelCostUsd,
					error: result.error,
					code: result.code
				});
				console.log(
					JSON.stringify({
						job: job.id,
						round: records.length,
						status: response.status(),
						totalAccountedUsd: ledger.accountedUsd,
						commands: result.toolCalls?.length ?? 0
					})
				);
				await route.fulfill({ response });
			} catch (error) {
				entry.status = 'unavailable';
				await route.abort();
			} finally {
				await writeFile(ledgerPath, JSON.stringify(ledger, null, 2));
			}
		});
		try {
			await page.goto(`${origin}/tools/draw`);
			await authenticateTools(page);
			await page.reload();
			await page.getByRole('button', { name: 'Manage drawing pages', exact: true }).click();
			await page.getByRole('button', { name: 'New page', exact: true }).click();
			await page.getByRole('button', { name: 'Open drawing assistant', exact: true }).click();
			const assistant = page.getByRole('region', { name: 'Drawing assistant' });
			await assistant
				.getByRole('combobox', { name: 'Assistant spending limit' })
				.selectOption('0.25');
			const composer = assistant.getByRole('textbox', { name: 'Message drawing assistant' });
			if (job.workflow) {
				await assistant.getByRole('button', { name: job.workflow, exact: true }).click();
				await composer.fill(`${await composer.inputValue()}\n${job.prompt}`);
			} else await composer.fill(job.prompt);
			await assistant.getByRole('button', { name: 'Send', exact: true }).click();
			await expect(assistant.getByRole('button', { name: 'Stop', exact: true })).toBeVisible();
			await expect(assistant.getByRole('button', { name: 'Send', exact: true })).toBeVisible({
				timeout: 240_000
			});
			await writeFile(
				join(artifactDirectory, `${job.id}-assistant.txt`),
				await assistant.innerText()
			);
			if (await assistant.getByRole('alert').count())
				failure = await assistant.getByRole('alert').innerText();
			await assistant.getByRole('button', { name: 'Minimize drawing assistant' }).click();
			await page.getByRole('checkbox', { name: 'Library', exact: true }).uncheck({ force: true });
			const scene = await page.evaluate(() => {
				const key = document.querySelector('.draw-canvas')?.getAttribute('data-storage-key');
				if (!key) throw new Error('The drawing account is not ready.');
				return JSON.parse(localStorage.getItem(key) || '{"elements":[]}');
			});
			await writeFile(
				join(artifactDirectory, `${job.id}.excalidraw`),
				JSON.stringify({ type: 'excalidraw', version: 2, source: origin, ...scene }, null, 2)
			);
			await page.screenshot({ path: join(artifactDirectory, `${job.id}-viewport.png`) });
			if (scene.elements.some((/** @type {any} */ element) => !element.isDeleted)) {
				await page.getByTestId('main-menu-trigger').click();
				await page.getByRole('button', { name: 'Export image...', exact: true }).click();
				for (const format of ['PNG', 'SVG']) {
					const downloadEvent = page.waitForEvent('download');
					await page.getByRole('button', { name: `Export to ${format}`, exact: true }).click();
					await (
						await downloadEvent
					).saveAs(join(artifactDirectory, `${job.id}.${format.toLowerCase()}`));
				}
			} else failure ||= 'The model produced no visible elements.';
		} catch (error) {
			failure = error instanceof Error ? error.message : String(error);
		} finally {
			await writeFile(
				join(artifactDirectory, `${job.id}-responses.json`),
				JSON.stringify(records, null, 2)
			);
			outcomes.push({ job: job.id, rounds: records.length, failure });
			await writeFile(join(artifactDirectory, 'outcomes.json'), JSON.stringify(outcomes, null, 2));
			await context.close();
		}
	}
	expect(outcomes.filter((outcome) => outcome.failure)).toEqual([]);
	expect(ledger.accountedUsd).toBeLessThanOrEqual(0.5);
});
