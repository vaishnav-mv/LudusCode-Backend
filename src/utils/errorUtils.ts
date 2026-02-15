/**
 * Safely extracts an error message from an unknown type.
 * @param error The error object (unknown).
 * @returns A string representation of the error message.
 */
export const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
        return String((error as { message: unknown }).message); // Safe cast because we checked 'message' exists
    }
    return 'Unknown error occurred';
};
