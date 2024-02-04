export function extractTime(dateString) {
	const date = new Date(dateString);

    // Extract hours and determine if it's AM or PM
    let hours = date.getHours();
    const amPm = hours >= 12 ? 'PM' : 'AM';

    // Convert to 12-hour format
    hours = hours % 12 || 12;

    // Pad with leading zero if necessary
    hours = padZero(hours);
    const minutes = padZero(date.getMinutes());

    // Combine hours, minutes, and AM/PM into a formatted string "hh:mm AM/PM"
    return `${hours}:${minutes} ${amPm}`;
}

// Helper function to pad single-digit numbers with a leading zero
function padZero(number) {
	return number.toString().padStart(2, "0");
}