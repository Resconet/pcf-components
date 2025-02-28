declare module "painterro" {
	interface PainterroOptions {
		hideByEsc: boolean;
		hiddenTools: string[];
		saveHandler: (image: { asDataURL: (type?, quality?) => string }, done: (close: boolean) => void) => void;
	}

	interface PainterroInstance {
		show: (imageSrc: string) => void;
		hide: () => void;
		destroy: () => void;
		setOptions: (options: PainterroOptions) => void;
	}

	function painterro(options?: PainterroOptions): PainterroInstance;

	export = painterro;
}
