export namespace RoundsTimer {
	export let statusInactiveAtTime: number | null
	export let previousActiveRoundsLength: number
	export let lastCharHitsReading: { hits: number; atTime: number }
	export let startTime: number
	export let numCharHits: number

	// Calling here to clear values for first call
	clear()

	export function clear() {
		statusInactiveAtTime = null
		previousActiveRoundsLength = 0
		lastCharHitsReading = {
			hits: -1,
			atTime: -1,
		}

		startTime = 0
		numCharHits = 0
	}

	export function computeElapsedMins(referenceTime: number) {
		return (referenceTime - startTime + previousActiveRoundsLength) / 1000 / 60
	}
}

