import { Disposable, StatusBarItem } from "vscode"

export namespace Handles {
	export let statusUpdaterHandle: NodeJS.Timer | null
	export let workspaceTextDoc: Disposable | null
	export let statusCpm: StatusBarItem | null

	// Calling here to clear values for first call
	clear()

	export function clear() {
		if (statusUpdaterHandle !== null) {
			clearInterval(statusUpdaterHandle)
			statusUpdaterHandle = null
		}

		workspaceTextDoc?.dispose()
		workspaceTextDoc = null

		statusCpm?.dispose()
		statusCpm = null
	}
}

