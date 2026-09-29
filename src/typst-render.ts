import { $typst } from "@myriaddreamin/typst.ts";
import typst_ts_web_compiler from "@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm"
import typst_ts_renderer from "@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm"

export function initTypst() {
	$typst.setCompilerInitOptions({
		getModule: () => {
			return {
				module_or_path: typst_ts_web_compiler
			};
		},
	});
	
	$typst.setRendererInitOptions({
		getModule: () => {
			return {
				module_or_path: typst_ts_renderer
			};
		},
	});
}

const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

/** Maximum number of cached SVG elements to keep in memory. */
const MAX_CACHE_SIZE = 500;

/**
 * Clear all render caches. Should be called on plugin unload to
 * release DOM elements held in memory.
 */
export function clearRenderCaches() {
	cache.clear();
	pending.clear();
}

/**
 * Serial compilation queue — ensures only one WASM compilation runs
 * at a time. Without this, concurrent renderTypst() calls race over
 * the single-threaded compiler, causing resets mid-compilation.
 */
let compileQueue: Promise<void> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
	const result = compileQueue.then(fn);
	// Swallow errors so the queue continues processing
	compileQueue = result.then(() => {}, () => {});
	return result;
}

/**
 * Reset the compiler before rendering to prevent source file accumulation.
 *
 * The $typst.svg() path internally uses getVector() → getCompiler() which,
 * unlike getCompilerReset(), does NOT call compiler.reset(). Each call adds
 * a new temp source file via addSource() that is never cleaned up (removeTmp
 * calls unmapShadow which is a no-op for addSource files). This causes the
 * WASM compiler's memory to grow indefinitely, making rendering progressively
 * slower.
 */
async function renderSvg(mainContent: string): Promise<string> {
	const compiler = await $typst.getCompiler();
	await compiler.reset();
	return $typst.svg({ mainContent });
}

/**
 * Post-process an SVG string from the Typst compiler:
 * - Replace the uncommon placeholder color with currentColor
 * - Scale dimensions from typst points to em units
 */
function processSvgString(svgString: string, uncommonColor: string): string {
	const value = svgString
		.replaceAll(`fill="${uncommonColor}"`, 'fill="currentColor"')
		.replaceAll(`stroke="${uncommonColor}"`, 'stroke="currentColor"');

	const container = document.createElement('div');
	// eslint-disable-next-line @microsoft/sdl/no-inner-html -- SVG from bundled WASM compiler, not untrusted input
	container.innerHTML = value;
	const svg = container.firstElementChild;

	if (!svg) {
		throw new Error("SVG element node undefined");
	}

	// typst's default font size
	const defaultEm = 11;
	const height = parseFloat(svg.getAttribute('data-height') || 'NaN');
	const width = parseFloat(svg.getAttribute('data-width') || 'NaN');
	// scale from typst pixels to obsidian font size
	svg.setAttribute("height", `${height / defaultEm}em`);
	svg.setAttribute("width", `${width / defaultEm}em`);

	return container.innerHTML;
}

export function renderTypst(math: string, block: boolean, preamble?: string, uncommonColor: string = "#a6a59f"): HTMLElement {
	const mainContent = `
#set page(height: auto, width: auto, margin: 0pt)
#set text(fill: rgb("${uncommonColor}"))
	
	${preamble ?? ''}
	
$${math}$
`;
	
	const parent = document.createElement("span");
	parent.toggleClass("typst-block-parent", block);
	
	const cacheKey = mainContent;
	
	if (cache.has(cacheKey)) {
		// eslint-disable-next-line @microsoft/sdl/no-inner-html -- cached SVG from bundled WASM compiler
		parent.innerHTML = cache.get(cacheKey)!;
		return parent;
	}
	
	let promise = pending.get(cacheKey);
	if (!promise) {
		promise = enqueue(() => renderSvg(mainContent)).then((svgString) => {
			const processed = processSvgString(svgString, uncommonColor);
			
			if (cache.size >= MAX_CACHE_SIZE) {
				const firstKey = cache.keys().next().value as string | undefined;
				if (firstKey !== undefined) {
					cache.delete(firstKey);
				}
			}
			cache.set(cacheKey, processed);
			return processed;
		});
		
		pending.set(cacheKey, promise);
		void promise.then(
			() => pending.delete(cacheKey),
			() => pending.delete(cacheKey)
		);
	}
	
	promise.then((svgHtml) => {
		// eslint-disable-next-line @microsoft/sdl/no-inner-html -- SVG from bundled WASM compiler
		parent.innerHTML = svgHtml;
	}).catch((e) => {
		let errorMessage = e instanceof Error ? e.message : String(e) || "unknown error";
		const match = errorMessage.match(/message:\s*"((?:[^"\\]|\\.)*)"/);
		if (match && match[1]) {
			errorMessage = match[1].replace(/\\"/g, '"');
		}
		
		const errorElm = parent.createDiv({ text: `Typst error: ${errorMessage}` });
		errorElm.setCssProps({
			color: "red",
			fontStyle: "italic",
		});
		
		console.error("Typst error:", e);
	});
	
	return parent;
}
