/*
I know the code is a mess here and I am too lazy to clean it up and refactor properly.
Will come back later maybe with a new version for better code improvements.
*/

import {
	ExtensionContext,
	StatusBarAlignment,
	TextDocumentChangeEvent,
	ThemeColor,
	commands,
	window,
	workspace,
} from "vscode"
import { Handles as hd } from "./handles"
import { RoundsTimer as rt } from "./rounds_timer"

// Have an additional variable here for tracking if the
// extension is enabled, to prevent multiple calling
let isTypeCoderEnabled = false

const WARNING_BACKGROUND = new ThemeColor("statusBarItem.warningBackground")

function disableAll() {
	hd.clear()
	rt.clear()
}

function recordTextChanges(event: TextDocumentChangeEvent) {
	// If it is an undo or redo action
	if (event.reason !== undefined) return

	// Captures the necessary doc text changes
	const changes = event.contentChanges[0]

	// If there was any deleting of characters then
	// it would be registered with a +ve 'rangeLength' value
	if (changes.rangeLength !== 0) return

	// If text changes is more than 1 character then
	// there must have been some copy-paste
	if (changes.text.length > 1) return

	rt.numCharHits += 1
}

function updateStatus() {
	if (hd.statusCpm === null) return
	const now = performance.now()

	// If there are not new character hits and last reading was taken 5 seconds ago
	// then the status should be in 'inactive' state
	if (
		rt.lastCharHitsReading.hits === rt.numCharHits &&
		now - rt.lastCharHitsReading.atTime > 5000
	) {
		// Set the status to 'inactive' once here
		if (rt.statusInactiveAtTime === null) rt.statusInactiveAtTime = now

		// Status inactivity time would be constant here for when it went inactive
		const elapsedMins = rt.computeElapsedMins(rt.statusInactiveAtTime)
		const charsPerMinSpeed = rt.numCharHits / elapsedMins

		hd.statusCpm.text = `$(stop-circle) ${charsPerMinSpeed.toFixed(2)} cpm`
		hd.statusCpm.tooltip = "Paused because of inactivity"
		hd.statusCpm.backgroundColor = WARNING_BACKGROUND

		hd.statusCpm.show()
		return
	}

	// If there are new character hits then register them
	if (rt.lastCharHitsReading.hits !== rt.numCharHits) {
		// If currently status is 'inactive' but there was just an update
		// then activate the status and update the previous rounds store
		if (rt.statusInactiveAtTime !== null) {
			rt.previousActiveRoundsLength += rt.statusInactiveAtTime - rt.startTime
			rt.startTime = now
			rt.statusInactiveAtTime = null
		}

		rt.lastCharHitsReading = {
			hits: rt.numCharHits,
			atTime: now,
		}
	}

	const elapsedMins = rt.computeElapsedMins(now)
	const charsPerMinSpeed = rt.numCharHits / elapsedMins

	hd.statusCpm.text = `$(star-half) ${charsPerMinSpeed.toFixed(2)} cpm`
	hd.statusCpm.tooltip = "Units in 'characters per minute'"
	hd.statusCpm.backgroundColor = charsPerMinSpeed === 0 ? WARNING_BACKGROUND : undefined

	hd.statusCpm.show()
}

export function activate(context: ExtensionContext) {
	context.subscriptions.push(
		commands.registerCommand("type-coder.status.enable", () => {
			if (isTypeCoderEnabled) return
			isTypeCoderEnabled = true

			hd.statusCpm = window.createStatusBarItem(StatusBarAlignment.Left, 1000000)
			context.subscriptions.push(hd.statusCpm)
			hd.statusCpm.command = "type-coder.status.show"

			hd.workspaceTextDoc = workspace.onDidChangeTextDocument(recordTextChanges)
			context.subscriptions.push(hd.workspaceTextDoc)

			hd.statusUpdaterHandle = setInterval(updateStatus, 500)
			rt.startTime = performance.now()
			window.showInformationMessage("Type Coder has been enabled")
		})
	)

	context.subscriptions.push(
		commands.registerCommand("type-coder.status.disable", () => {
			isTypeCoderEnabled = false
			disableAll()
		})
	)

	context.subscriptions.push(
		commands.registerCommand("type-coder.status.show", () => {
			// The status can be 'inactive' currently, otherwise we can query time
			const latestReadingTime = rt.statusInactiveAtTime ?? performance.now()
			const elapsedMins = rt.computeElapsedMins(latestReadingTime)
			const charsPerMinSpeed = rt.numCharHits / elapsedMins

			window.showInformationMessage(
				`${rt.numCharHits} characters typed in ${(elapsedMins * 60).toFixed(4)} seconds`,
				{
					modal: true,
					detail: `Coding at '${charsPerMinSpeed.toFixed(2)} cpm'`,
				}
			)
		})
	)
}

export function deactivate() {
	isTypeCoderEnabled = false
	disableAll()
}

