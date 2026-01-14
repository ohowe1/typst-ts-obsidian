import { $typst } from "@myriaddreamin/typst.ts";
// @ts-ignore
import typst_ts_web_compiler from "@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm";
// @ts-ignore
import typst_ts_renderer from "@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm";

function htmlToNode(html: string) {
	const template = document.createElement('template');


	const nNodes = template.content.childNodes.length;
	if (nNodes !== 1) {
		throw new Error(
			`html parameter must represent a single node; got ${nNodes}. `
		);
	}
	if (!template.content.firstChild) {
		throw new Error('Failed to create node from html')
	}

	return template.content.firstChild;
}

export function initTypst() {
	$typst.setCompilerInitOptions({
		getModule: () => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return -- these are the binary wasm modules required by typst.ts, kinda a weird way to do it but i don't know a better way
			return typst_ts_web_compiler;
		},
	});

	$typst.setRendererInitOptions({
		getModule: () => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return -- these are the binary wasm modules required by typst.ts, kinda a weird way to do it but i don't know a better way
			return typst_ts_renderer;
		},
	});
}

export async function renderTypst(math: string, block: boolean, elm: HTMLElement) {
	const mainContent = `
#set page(height: auto, width: auto, margin: 0pt)

$${math}$
`;

	const parentElm = block ? elm.createDiv({ cls: "typst-block-parent" }) : elm;

	try {
		const svgString = await $typst.svg({ mainContent });
		// hacky
		const value = svgString.replace(/fill="[^"]*"/g, 'fill="currentColor"');

		const parser = new DOMParser();
		const svgHTML = parser.parseFromString(value, 'text/html');

		parentElm.appendChild(svgHTML.body.firstChild!);
		let svgElementNode = parentElm.lastElementChild;

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
		svgElementNode.toggleClass("typst-block", block);

	} catch (e) {
		const errorElm = parentElm.createDiv({ text: `Typst rendering error: ${e instanceof Error ? e.message : String(e) || "unknown error"}` });
		errorElm.setCssProps({
			color: "red",
			fontStyle: "italic",
		});

		console.error("Typst rendering error:", e);
	}
}
