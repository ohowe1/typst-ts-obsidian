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

const cache = new Map<string, Element>();
const pending = new Map<string, Promise<Element>>();

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
		parent.appendChild(cache.get(cacheKey)!.cloneNode(true));
		return parent;
	}
	
	let promise = pending.get(cacheKey);
	if (!promise) {
		promise = renderSvg(mainContent).then((svgString) => {
			// hacky replace to make svg use currentColor for fill and stroke
			const value = svgString
			.replaceAll(`fill="${uncommonColor}"`, 'fill="currentColor"')
			.replaceAll(`stroke="${uncommonColor}"`, 'stroke="currentColor"');
			
			const parser = new DOMParser();
			const svgHTML = parser.parseFromString(value, 'text/html');
			const svgElementNode = svgHTML.body.firstChild as Element | null;
			
			if (!svgElementNode) {
				throw new Error("SVG element node undefined");
			}
			
			// typst's default font size
			const defaultEm = 11;
			const height = parseFloat(svgElementNode.getAttribute('data-height') || 'NaN');
			const width = parseFloat(svgElementNode.getAttribute('data-width') || 'NaN');
			// scale from typst pixels to obsidian font size
			svgElementNode.setAttribute("height", `${height / defaultEm}em`);
			svgElementNode.setAttribute("width", `${width / defaultEm}em`);
			
			if (cache.size >= MAX_CACHE_SIZE) {
				const firstKey = cache.keys().next().value as string | undefined;
				if (firstKey !== undefined) {
					cache.delete(firstKey);
				}
			}
			cache.set(cacheKey, svgElementNode);
			return svgElementNode;
		});
		
		pending.set(cacheKey, promise);
		void promise.then(
			() => pending.delete(cacheKey),
			() => pending.delete(cacheKey)
		);
	}
	
	promise.then((svgElementNode) => {
		parent.appendChild(svgElementNode.cloneNode(true));
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
