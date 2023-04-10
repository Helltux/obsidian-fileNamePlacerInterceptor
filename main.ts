import {App, Modal, Notice, Plugin, Setting, TAbstractFile, TextComponent, TFile} from 'obsidian';

export default class FileNamePlacerIntPlugin extends Plugin {

	async onload() {
		this.registerEvent(this.app.vault.on("create", (x) => this.onCreate(x, this.app)));
	}

	onunload() {
		this.app.workspace.iterateCodeMirrors(cm => {
			cm.off('create', (ignore) => {
			});
		});
	}

	onCreate(file: TAbstractFile, app: App) {
		let currentName = file.name;
		// todo add this in a Config?
		if (file.name.endsWith(".png") ||
			file.name.endsWith(".jpg") ||
			file.name.endsWith(".gif") ||
			file.name.endsWith(".pdf") ||
			file.name.endsWith(".svg")) {
			new Notice("Found a new Asset: " + file.name);

			new FileRenameModal(app, file.name, (result) => {

				if (result !== null) {
					const newFilePath = file.parent.path + "/" + result;
					app.vault.rename(file, newFilePath);

					new Notice("File was Successfully rename to: " + newFilePath);

					const unresolvedLinks: Record<string, Record<string, number>> = app.metadataCache.unresolvedLinks;
					for (let unresolvedLinksKey in unresolvedLinks) {
						this.updateLinks(unresolvedLinksKey, currentName, result);
					}
				}

			}).open();

		}
	}


	async updateLinks(filename: string, oldLink: string, newLink: string) {
		const file = this.app.vault.getAbstractFileByPath(filename) as TFile;
		const content = await this.app.vault.read(file);

		const updatedContent = content.replace(oldLink, newLink);

		await this.app.vault.modify(file, updatedContent);
	}


}

export class FileRenameModal extends Modal {
	result: string;
	onSubmit: (result: string) => void;
	filename: string

	constructor(app: App, name: string, onSubmit: (result: string) => void) {
		super(app);
		this.filename = name;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const {contentEl} = this;

		contentEl.createEl("h1", {text: "how should the file be called?"});

		new Setting(contentEl)
			.setName("Name")
			.addText((text) => {
					text.inputEl.id = "XfileName"
					text.setValue(this.filename);
					text.inputEl.setSelectionRange(0, this.filename.lastIndexOf("."), "forward");
					text.onChange((value) => {
						this.result = value
					})
					text.inputEl.addEventListener("keyup", (event) => {
						if (event.key === "Enter") {
							submit();
						}
					});
				}
			);

		let submit = () => {
			const file = this.app.vault.getAbstractFileByPath(this.result) as TFile;
			if (file == null) {
				this.close();
				this.onSubmit(this.result);
			} else {
				new Notice("error, new file name is already in use")
				let xx = contentEl.find("#XfileName") as HTMLInputElement;
				xx.select();
				xx.setSelectionRange(0, xx.value.lastIndexOf("."), "forward");
			}
		};
		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Submit")
					.setCta()
					.onClick(submit)
			);
	}

	onClose() {
		let {contentEl} = this;
		contentEl.empty();
	}

}
