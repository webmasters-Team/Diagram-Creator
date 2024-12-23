// Utility functions
function updateUmlText(actors, items) {
	return items
		.map((item) => {
			if (item.type === "message") {
				return `${actors[item.from]}${item.style || "->>"}${actors[item.to]}: ${
					item.text
				}`;
			} else if (item.type === "note") {
				return `Note ${item.position} of ${actors[item.actor]}: ${item.text}`;
			}
			return "";
		})
		.join("\n");
}

function parseUmlText(umlText) {
	const lines = umlText.split("\n");
	const newActors = new Set();
	const newItems = [];

	lines.forEach((line, index) => {
		const messageMatch = line.match(/^(\w+)(->+)(\w+):\s*(.+)$/);
		const noteMatch = line.match(/^Note\s+(right|left)\s+of\s+(\w+):\s*(.+)$/);

		if (messageMatch) {
			const [_, from, style, to, text] = messageMatch;
			newActors.add(from);
			newActors.add(to);
			newItems.push({ id: `m${index}`, type: "message", from, to, text, style });
		} else if (noteMatch) {
			const [_, position, actor, text] = noteMatch;
			newActors.add(actor);
			newItems.push({ id: `n${index}`, type: "note", actor, position, text });
		}
	});

	const actorsArray = Array.from(newActors);

	return {
		newActors: actorsArray,
		newItems: newItems.map((item) => {
			if (item.type === "message") {
				return {
					...item,
					from: actorsArray.indexOf(item.from),
					to: actorsArray.indexOf(item.to)
				};
			} else if (item.type === "note") {
				return {
					...item,
					actor: actorsArray.indexOf(item.actor)
				};
			}
			return item;
		})
	};
}

// Main application
class SequenceDiagramCreator {
	constructor(rootElement) {
		this.rootElement = rootElement;
		this.actors = ["Man 👨🏻‍🦱", "Woman 👩🏼‍🦰"];
		this.items = [
			{ id: "1", type: "message", from: 0, to: 1, text: "Hi, how are you?" },
			{
				id: "2",
				type: "note",
				actor: 1,
				position: "right",
				text: "Woman thinks..."
			},
			{
				id: "3",
				type: "message",
				from: 1,
				to: 0,
				text: "I am fine, How are you?",
				style: "-->"
			},
			{
				id: "4",
				type: "message",
				from: 0,
				to: 1,
				text: "I am good thanks!",
				style: "->>"
			}
		];
		this.draggedItem = null;

		this.render();
		this.attachEventListeners();
	}

	addDownloadSvgButton() {
		const buttonContainer = this.rootElement.querySelector(".buttons");
		const downloadButton = document.createElement("button");
		downloadButton.textContent = "Download SVG";
		downloadButton.className = "bg-purple-500 text-white px-4 py-2 rounded mr-2";
		downloadButton.addEventListener("click", this.downloadSvg.bind(this));
		buttonContainer.appendChild(downloadButton);
	}

	downloadSvg() {
		const svgElement = this.rootElement.querySelector("svg");
		const svgData = new XMLSerializer().serializeToString(svgElement);
		const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
		const svgUrl = URL.createObjectURL(svgBlob);

		const downloadLink = document.createElement("a");
		downloadLink.href = svgUrl;
		downloadLink.download = "sequence_diagram.svg";
		document.body.appendChild(downloadLink);
		downloadLink.click();
		document.body.removeChild(downloadLink);
		URL.revokeObjectURL(svgUrl);
	}

	render() {
		this.rootElement.innerHTML = `
      <div class="container mx-auto p-4">
			
        <h1 class="text-2xl font-bold mb-4">Sequence Diagram Creator</h1>
        <div id="svg" class="mt-4"></div>  
				<br />
        <div class="mb-4 buttons">
          <button id="addActor" class="bg-blue-500 text-white px-4 py-2 rounded mr-2">Add Actor</button>
          <button id="addMessage" class="bg-green-500 text-white px-4 py-2 rounded mr-2">Add Message</button>
          <button id="addNote" class="bg-yellow-500 text-white px-4 py-2 rounded mr-2">Add Note</button>
        </div>
        

				
        <div id="actors" class="flex mb-4"></div>
        
        <div id="items"></div>
        

        <div class="mt-4">
          <h2 class="text-xl font-bold mb-2">UML Editor</h2>
          <textarea id="umlText" class="w-full h-40 p-2 border rounded"></textarea>
          <button id="parseUml" class="mt-2 bg-yellow-500 text-white px-4 py-2 rounded">Update Diagram from UML</button>
        </div>
      </div>
    `;

		this.renderActors();
		this.renderItems();
		this.renderSVG();
		this.updateUmlTextArea();
		this.addDownloadSvgButton();
	}

	renderActors() {
		const actorsContainer = this.rootElement.querySelector("#actors");
		actorsContainer.innerHTML = this.actors
			.map(
				(actor, index) => `
      <div class="mr-4 flex items-center">
        <input type="text" value="${actor}" data-index="${index}" class="actor-input border p-2 rounded mr-2">
        <button class="remove-actor bg-red-500 text-white p-2 rounded" data-index="${index}">Remove</button>
      </div>
    `
			)
			.join("");
	}

	renderItems() {
		const itemsContainer = this.rootElement.querySelector("#items");
		itemsContainer.innerHTML = this.items
			.map(
				(item, index) => `
      <div class="flex items-center mb-2 bg-white p-2 rounded shadow" draggable="true" data-index="${index}">
        <div class="mr-2 cursor-move">≡</div>
        ${
									item.type === "message"
										? `
          <select class="item-from border p-2 rounded mr-2">
            ${this.actors
													.map(
														(_, i) =>
															`<option value="${i}" ${i === item.from ? "selected" : ""}>${
																this.actors[i]
															}</option>`
													)
													.join("")}
          </select>
          <select class="item-style border p-2 rounded mr-2">
            <option value="->" ${
													item.style === "->" ? "selected" : ""
												}>-></option>
            <option value="-->" ${
													item.style === "-->" ? "selected" : ""
												}>--></option>
            <option value="->>" ${
													item.style === "->>" ? "selected" : ""
												}>->></option>
          </select>
          <select class="item-to border p-2 rounded mr-2">
            ${this.actors
													.map(
														(_, i) =>
															`<option value="${i}" ${i === item.to ? "selected" : ""}>${
																this.actors[i]
															}</option>`
													)
													.join("")}
          </select>
        `
										: `
          <select class="item-actor border p-2 rounded mr-2">
            ${this.actors
													.map(
														(_, i) =>
															`<option value="${i}" ${i === item.actor ? "selected" : ""}>${
																this.actors[i]
															}</option>`
													)
													.join("")}
          </select>
          <select class="item-position border p-2 rounded mr-2">
            <option value="right" ${
													item.position === "right" ? "selected" : ""
												}>right</option>
            <option value="left" ${
													item.position === "left" ? "selected" : ""
												}>left</option>
          </select>
        `
								}
        <input type="text" value="${
									item.text
								}" class="item-text border p-2 rounded flex-grow mr-2">
        <button class="delete-item bg-red-500 text-white p-2 rounded">Delete</button>
      </div>
    `
			)
			.join("");
	}

	renderSVG() {
		const svgContainer = this.rootElement.querySelector("#svg");
		const width = 800;
		const height = 100 + this.items.length * 50;
		const actorWidth = width / this.actors.length;

		let svgContent = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        ${this.actors
									.map(
										(actor, index) => `
          <g>
            <rect x="${
													index * actorWidth + 10
												}" y="10" width="80" height="40" fill="white" stroke="black" />
            <text x="${
													index * actorWidth + 50
												}" y="35" text-anchor="middle">${actor}</text>
            <line x1="${index * actorWidth + 50}" y1="50" x2="${
											index * actorWidth + 50
										}" y2="${height}" stroke="black" stroke-dasharray="5,5" />
          </g>
        `
									)
									.join("")}
        
        ${this.items
									.map((item, index) => {
										const y = 75 + index * 50;
										if (item.type === "message") {
											const startX = item.from * actorWidth + 50;
											const endX = item.to * actorWidth + 50;
											return `
              <g>
                <line x1="${startX}" y1="${y}" x2="${endX}" y2="${y}" stroke="black" marker-end="url(#arrow)" />
                <text x="${(startX + endX) / 2}" y="${
												y - 10
											}" text-anchor="middle">${item.text}</text>
              </g>
            `;
										} else if (item.type === "note") {
											const noteX =
												item.actor * actorWidth + (item.position === "right" ? 70 : -70);
											return `
              <g>
                <rect x="${noteX - 40}" y="${
												y - 20
											}" width="80" height="40" fill="yellow" stroke="black" />
                <text x="${noteX}" y="${y}" text-anchor="middle" dominant-baseline="middle">
                  ${item.text
																			.split("\n")
																			.map(
																				(line, i) => `
                    <tspan x="${noteX}" dy="${i ? "1.2em" : 0}">${line}</tspan>
                  `
																			)
																			.join("")}
                </text>
              </g>
            `;
										}
										return "";
									})
									.join("")}
        
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="black" />
          </marker>
        </defs>
      </svg>
    `;

		svgContainer.innerHTML = svgContent;
	}

	updateUmlTextArea() {
		const umlTextArea = this.rootElement.querySelector("#umlText");
		umlTextArea.value = updateUmlText(this.actors, this.items);
	}

	attachEventListeners() {
		this.rootElement.addEventListener("click", (e) => {
			if (e.target.id === "addActor") this.addActor();
			if (e.target.id === "addMessage") this.addMessage();
			if (e.target.id === "addNote") this.addNote();
			if (e.target.classList.contains("remove-actor"))
				this.removeActor(parseInt(e.target.dataset.index));
			if (e.target.classList.contains("delete-item"))
				this.deleteItem(e.target.closest("[data-index]").dataset.index);
			if (e.target.id === "parseUml") this.parseUml();
		});

		this.rootElement.addEventListener("change", (e) => {
			if (e.target.classList.contains("actor-input"))
				this.updateActor(parseInt(e.target.dataset.index), e.target.value);
			if (e.target.classList.contains("item-from"))
				this.updateItem(
					e.target.closest("[data-index]").dataset.index,
					"from",
					parseInt(e.target.value)
				);
			if (e.target.classList.contains("item-to"))
				this.updateItem(
					e.target.closest("[data-index]").dataset.index,
					"to",
					parseInt(e.target.value)
				);
			if (e.target.classList.contains("item-style"))
				this.updateItem(
					e.target.closest("[data-index]").dataset.index,
					"style",
					e.target.value
				);
			if (e.target.classList.contains("item-actor"))
				this.updateItem(
					e.target.closest("[data-index]").dataset.index,
					"actor",
					parseInt(e.target.value)
				);
			if (e.target.classList.contains("item-position"))
				this.updateItem(
					e.target.closest("[data-index]").dataset.index,
					"position",
					e.target.value
				);
			if (e.target.classList.contains("item-text"))
				this.updateItem(
					e.target.closest("[data-index]").dataset.index,
					"text",
					e.target.value
				);
		});

		this.rootElement.addEventListener("dragstart", (e) => {
			if (e.target.hasAttribute("data-index")) {
				this.draggedItem = parseInt(e.target.dataset.index);
				e.dataTransfer.effectAllowed = "move";
				e.dataTransfer.setData("text/html", e.target);
			}
		});

		this.rootElement.addEventListener("dragover", (e) => {
			e.preventDefault();
			const draggedOverItem = e.target.closest("[data-index]");
			if (draggedOverItem && this.draggedItem !== null) {
				const newIndex = parseInt(draggedOverItem.dataset.index);
				if (this.draggedItem !== newIndex) {
					const itemsCopy = [...this.items];
					const [reorderedItem] = itemsCopy.splice(this.draggedItem, 1);
					itemsCopy.splice(newIndex, 0, reorderedItem);
					this.items = itemsCopy;
					this.draggedItem = newIndex;
					this.renderItems();
					this.renderSVG();
					this.updateUmlTextArea();
				}
			}
		});

		this.rootElement.addEventListener("dragend", () => {
			this.draggedItem = null;
		});
	}

	addActor() {
		this.actors.push(`Actor${this.actors.length + 1}`);
		this.renderActors();
		this.renderItems();
		this.renderSVG();
		this.updateUmlTextArea();
	}

	removeActor(index) {
		this.actors = this.actors.filter((_, i) => i !== index);
		this.items = this.items
			.filter(
				(item) =>
					(item.type === "message" && item.from !== index && item.to !== index) ||
					(item.type === "note" && item.actor !== index)
			)
			.map((item) => {
				if (item.type === "message") {
					return {
						...item,
						from: item.from > index ? item.from - 1 : item.from,
						to: item.to > index ? item.to - 1 : item.to
					};
				} else if (item.type === "note") {
					return {
						...item,
						actor: item.actor > index ? item.actor - 1 : item.actor
					};
				}
				return item;
			});
		this.renderActors();
		this.renderItems();
		this.renderSVG();
		this.updateUmlTextArea();
	}

	addMessage() {
		this.items.push({
			id: Date.now().toString(),
			type: "message",
			from: 0,
			to: 1,
			text: "New Message",
			style: "->"
		});
		this.renderItems();
		this.renderSVG();
		this.updateUmlTextArea();
	}

	addNote() {
		this.items.push({
			id: Date.now().toString(),
			type: "note",
			actor: 0,
			position: "right",
			text: "New Note"
		});
		this.renderItems();
		this.renderSVG();
		this.updateUmlTextArea();
	}

	updateActor(index, value) {
		this.actors[index] = value;
		this.renderActors();
		this.renderItems();
		this.renderSVG();
		this.updateUmlTextArea();
	}

	updateItem(index, field, value) {
		this.items[index] = { ...this.items[index], [field]: value };
		this.renderItems();
		this.renderSVG();
		this.updateUmlTextArea();
	}

	deleteItem(index) {
		this.items.splice(index, 1);
		this.renderItems();
		this.renderSVG();
		this.updateUmlTextArea();
	}

	parseUml() {
		const umlTextArea = this.rootElement.querySelector("#umlText");
		const { newActors, newItems } = parseUmlText(umlTextArea.value);
		this.actors = newActors;
		this.items = newItems;
		this.renderActors();
		this.renderItems();
		this.renderSVG();
	}
}

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
	const rootElement = document.getElementById("root");
	new SequenceDiagramCreator(rootElement);
});
