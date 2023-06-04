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
let lastCharHitsReading = {
	hits: -1,
	atTime: -1,
}

let startTime = 0
let numCharHits = 0

export function activate(context: ExtensionContext) {
	context.subscriptions.push(
		commands.registerCommand("type-coder.status.enable", () => {
			console.log("Enabling Type Coder")

			statusCpm = window.createStatusBarItem(StatusBarAlignment.Left, 1000000)
			context.subscriptions.push(statusCpm)
			statusCpm.command = "type-coder.status.show"

			disposableTextChanges = workspace.onDidChangeTextDocument(recordTextChanges)
			context.subscriptions.push(disposableTextChanges)

			statusUpdaterHandle = setInterval(updateStatus, 500)
			startTime = performance.now()
			recordTextChanges()
			window.showInformationMessage("Type Coder has been enabled")
		})
	)

	context.subscriptions.push(commands.registerCommand("type-coder.status.disable", disableAll))

	context.subscriptions.push(
		commands.registerCommand("type-coder.status.show", () => {
			// The status can be 'inactive' currently, otherwise we can query time
			const latestReadingTime = statusInactiveAtTime ?? performance.now()
			const elapsedMins = (latestReadingTime - startTime + previousActiveRoundsLength) / 1000 / 60
			const charsPerMinSpeed = numCharHits / elapsedMins

			window.showInformationMessage(
				`${numCharHits} characters typed in ${(elapsedMins * 60).toFixed(4)} seconds`,
				{
					modal: true,
					detail: `Coding at '${charsPerMinSpeed.toFixed(2)} cpm'`,
				}
			)
		})
	)
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
	lastCharHitsReading = {
		hits: -1,
		atTime: -1,
	}

	startTime = 0
	numCharHits = 0
}

function updateStatus() {
	if (statusCpm === null) return
	const now = performance.now()

	// If there are not new character hits and last reading was taken 5 seconds ago
	// then the status should be in 'inactive' state
	if (lastCharHitsReading.hits === numCharHits && now - lastCharHitsReading.atTime > 5000) {
		// Set the status to 'inactive' once here
		if (statusInactiveAtTime === null) statusInactiveAtTime = now

		// Status inactivity time would be constant here for when it went inactive
		const elapsedMins = (statusInactiveAtTime - startTime + previousActiveRoundsLength) / 1000 / 60
		const charsPerMinSpeed = numCharHits / elapsedMins

		statusCpm.text = `$(stop-circle) ${charsPerMinSpeed.toFixed(2)} cpm`
		statusCpm.tooltip = "Paused because of inactivity"
		statusCpm.backgroundColor = new ThemeColor("statusBarItem.warningBackground")
		statusCpm.show()
		return
	}

	// If there are new character hits then register them
	if (lastCharHitsReading.hits !== numCharHits) {
		// If currently status is 'inactive' but there was just an update
		// then activate the status and update the previous rounds store
		if (statusInactiveAtTime !== null) {
			previousActiveRoundsLength += statusInactiveAtTime - startTime
			startTime = now
			statusInactiveAtTime = null
		}

		lastCharHitsReading = {
			hits: numCharHits,
			atTime: now,
		}
	}

	const elapsedMins = (now - startTime + previousActiveRoundsLength) / 1000 / 60
	const charsPerMinSpeed = numCharHits / elapsedMins

	statusCpm.text = `$(star-half) ${charsPerMinSpeed.toFixed(2)} cpm`
	statusCpm.tooltip = "Units in 'characters per minute'"
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

