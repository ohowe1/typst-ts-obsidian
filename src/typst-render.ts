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

export function renderTypst(math: string, block: boolean, preamble?: string) {
	const mainContent = `
#set page(height: auto, width: auto, margin: 0pt)

${preamble ?? ''}

$${math}$
`;

	const parent = document.createElement("span");

	parent.toggleClass("typst-block-parent", block);

	$typst.svg({ mainContent }).then((svgString) => {
		// hacky replace to make svg use currentColor for fill
		const value = svgString.replace(/fill="[^"]*"/g, 'fill="currentColor"');

		const parser = new DOMParser();
		const svgHTML = parser.parseFromString(value, 'text/html');

		parent.appendChild(svgHTML.body.firstChild!);
		let svgElementNode = parent.lastElementChild;

		if (!svgElementNode) {
			throw new Error("SVG element node undefined")
		}

		// typst's default font size
		const defaultEm = 11;
		const height = parseFloat(svgElementNode.getAttribute('data-height') || 'NaN');
		const width = parseFloat(svgElementNode.getAttribute('data-width') || 'NaN');
		// scale from typst pixels to obsidian font size
		svgElementNode.setAttribute("height", `${height / defaultEm}em`)
		svgElementNode.setAttribute("width", `${width / defaultEm}em`)

	}).catch((e) => {
		let errorMessage = e instanceof Error ? e.message : String(e) || "unknown error";
		const match = errorMessage.match(/message:\s*"((?:[^"\\]|\\.)*)"/);
		if (match && match[1]) {
			errorMessage = match[1].replace(/\\"/g, '"');
		}
		
		const errorElm = parent.createDiv({ text: `Typst rendering error: ${errorMessage}` });
		errorElm.setCssProps({
			color: "red",
			fontStyle: "italic",
		});

		console.error("Typst rendering error:", e);
	});

	return parent;
}
