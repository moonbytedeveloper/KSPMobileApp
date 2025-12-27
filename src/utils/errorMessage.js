// Utility to extract a user-friendly error message from various error shapes
export function getErrorMessage(error, fallback = 'An unexpected error occurred. Please try again.') {
    try {
        const resp = error?.response?.data || error?.response || error;
        if (!resp) return fallback;

        // Common API shapes
        if (typeof resp === 'string' && resp.length) return resp;
        if (resp?.Message) return resp.Message;
        if (resp?.message) return resp.message;
        if (resp?.error) return resp.error;
        if (resp?.errors && Array.isArray(resp.errors) && resp.errors.length) return String(resp.errors[0]);

        // Axios-like error with statusText
        if (error?.response?.statusText && error.response.statusText !== 'OK') return error.response.statusText;

        // Network/timeouts
        if (error?.message && typeof error.message === 'string') {
            if (error.message.includes('Network Error')) return 'Network connection error. Please check your internet connection.';
            if (error.message.toLowerCase().includes('timeout')) return 'Request timed out. Please try again.';
            return error.message;
        }

        return fallback;
    } catch (e) {
        return fallback;
    }
}
