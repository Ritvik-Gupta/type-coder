import {
	Disposable,
	ExtensionContext,
	StatusBarAlignment,
	StatusBarItem,
	TextDocumentChangeEvent,
	ThemeColor,
	commands,
	window,
	workspace,
} from "vscode"

let disposableTextChanges: Disposable | null = null
let statusCpm: StatusBarItem | null = null
let statusUpdaterHandle: NodeJS.Timer | null = null

let statusInactiveAtTime: number | null = null
let previousActiveRoundsLength = 0
let latestCharHitsReading = {
	hits: -1,
	atTime: -1,
}

let startTime: number | null = null
let numCharHits = 0

export function activate(context: ExtensionContext) {
	context.subscriptions.push(
		commands.registerCommand("type-coder.status.enable", () => {
			console.log("Enabling Type Coder")

			statusCpm = window.createStatusBarItem(StatusBarAlignment.Left, 1000000)
			context.subscriptions.push(statusCpm)

			disposableTextChanges = workspace.onDidChangeTextDocument(recordTextChanges)
			context.subscriptions.push(disposableTextChanges)

			statusUpdaterHandle = setInterval(updateStatus, 500)
			startTime = performance.now()
			recordTextChanges()
			window.showInformationMessage("Type Coder has been enabled")
		})
	)

	context.subscriptions.push(commands.registerCommand("type-coder.status.disable", disableAll))
}

function disableAll() {
	console.log("disableAll called")

	if (statusUpdaterHandle !== null) {
		clearInterval(statusUpdaterHandle)
		statusUpdaterHandle = null
	}

	disposableTextChanges?.dispose()
	statusCpm?.dispose()

	statusInactiveAtTime = null
	previousActiveRoundsLength = 0
	latestCharHitsReading = {
		hits: -1,
		atTime: -1,
	}

	startTime = null
	numCharHits = 0
}

function updateStatus() {
	if (statusCpm === null) return

	const now = performance.now()

	if (latestCharHitsReading.hits !== numCharHits) {
		if (statusInactiveAtTime !== null) {
			previousActiveRoundsLength += statusInactiveAtTime - startTime!
			startTime = now
			statusInactiveAtTime = null
		}

		latestCharHitsReading = {
			hits: numCharHits,
			atTime: now,
		}
	}
	// Otherwise should be in Inactive state
	else if (now - latestCharHitsReading.atTime > 5000) {
		if (statusInactiveAtTime === null) statusInactiveAtTime = now

		statusCpm.text = `Paused $(stop-circle)`
		statusCpm.tooltip = "Paused because of inactivity"
		statusCpm.color = "grey"
		statusCpm.backgroundColor = new ThemeColor("statusBarItem.warningBackground")
		statusCpm.show()
		return
	}

	const elapsedMins = (now - startTime! + previousActiveRoundsLength) / 1000 / 60
	const charsPerMinSpeed = numCharHits / elapsedMins

	statusCpm.text = `${charsPerMinSpeed.toFixed(3)} cpm $(star-half)`
	statusCpm.tooltip = "Units in 'characters per minute'"
	statusCpm.color = "white"
	if (charsPerMinSpeed === 0)
		statusCpm.backgroundColor = new ThemeColor("statusBarItem.warningBackground")
	else statusCpm.backgroundColor = undefined

	statusCpm.show()
}

function recordTextChanges(event?: TextDocumentChangeEvent) {
	console.log("recordTextChanges called")

	// Might be the first call without a change event
	if (event === undefined) return
	// If it is an undo or redo action
	if (event.reason !== undefined) return

	// Captures the necessary doc text changes
	const changes = event.contentChanges[0]

	// If there was any deleting of characters then
	// it would be registered with a +ve 'rangeLength' value
	if (changes.rangeLength !== 0) return

	// If text changes is more than 1 character then
	// there must have been some copy-paste
	if (changes.text.length > 1) {
		console.log("Copy-Pasted")
		return
	}

	console.log(changes)
	numCharHits += 1
}

export function deactivate() {
	disableAll()
}

