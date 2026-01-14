// The patch logic is from https://github.com/RyotaUshio/obsidian-math-in-callout/

import { Decoration } from "@codemirror/view";
import { WidgetType } from "@codemirror/view";
import type TypstTSObsidian from "main";
import { around } from "monkey-around";
import { renderTypst } from "typst-render";

// constructor of Obsidian's built-in math widget
export type BuiltInMathWidgetConstructor = new (
	math: string,
	block: boolean
) => BuiltInMathWidget;

interface BuiltInMathWidget extends WidgetType {
	math: string;
	block: boolean;
	start: number;
	setPos: (start: number, end: number) => void;
}

/**
 * Monkey-patch the built-in math widget to add a better support for multi-line math in blockquotes.
 * But the class itself is not directly accesible, so we first patch Decoration.replace and Decoration.widget,
 * and then access the widget class from the argument passed to them.
 *
 * @param onPatched Callback executed when the built-in math widget is patched.
 */
export const patchDecoration = (
	plugin: TypstTSObsidian,
	onPatched: (builtInMathWidget: BuiltInMathWidgetConstructor) => void
) => {
	const uninstaller = around(Decoration, {
		replace(old) {
			return function (spec: { widget?: WidgetType }) {
				if (!plugin.patchSucceeded && spec.widget) {
					plugin.patchSucceeded = patchMathWidget(
						plugin,
						spec.widget
					);
					if (plugin.patchSucceeded) {
						onPatched(
							spec.widget
								.constructor as BuiltInMathWidgetConstructor
						);
						uninstaller(); // uninstall the patcher for Decoration as soon as possible
					}
				}
				// @ts-ignore
				return old.call(this, spec);
			};
		},
		widget(old) {
			return function (spec: { widget?: WidgetType }) {
				if (!plugin.patchSucceeded && spec.widget) {
					plugin.patchSucceeded = patchMathWidget(
						plugin,
						spec.widget
					);
					if (plugin.patchSucceeded) {
						onPatched(
							spec.widget
								.constructor as BuiltInMathWidgetConstructor
						);
						uninstaller(); // uninstall the patcher for Decoration as soon as possible
					}
				}
				// @ts-ignore
				return old.call(this, spec);
			};
		},
	});
	plugin.register(uninstaller);
};

function patchMathWidget(plugin: TypstTSObsidian, widget: WidgetType): boolean {
	// Check if the given widget is the built-in math widget based on the properties and methods it has.
	// If we make the condition too strict, it may not work with the future version of Obsidian.
	// On the other hand, if we make it too loose, it may misjudge another widget type by another plugin as
	// the built-in math widget.

	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- typescript doesn't know the type here, and we check it ourselves
	const proto = widget.constructor.prototype;
	const isObsidianBuiltinMathWidget =
		Object.hasOwn(widget, "math") &&
		Object.hasOwn(widget, "block") &&
		"initDOM" in proto &&
		"render" in proto &&
		"setPos" in proto &&
		"hookClickHandler" in proto &&
		"addEditButton" in proto &&
		"resizeWidget" in proto;

	if (isObsidianBuiltinMathWidget) {
		plugin.register(
			around(proto, {
				render(old) {
					return function (this: BuiltInMathWidget, elm: HTMLElement) {
						const math: string = this.math;
						const block: boolean = this.block;

						elm.toggleClass("math-block", block);
						elm.toggleClass("cm-embed-block", block);
						let editBlock = elm.find(".edit-block-button");
						elm.empty();

						renderTypst(math, block, elm).catch((err) => {
							console.error(err);
						});

						if (editBlock) {
							elm.appendChild(editBlock)
						}
					};
				},
			})
		);
		return true;
	}

	return false;
}
