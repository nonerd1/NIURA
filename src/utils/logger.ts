// Enable debug mode for development
const DEBUG_MODE = true;

/**
 * Helper function for debug logging
 * @param message The message to log
 * @param data Optional data to log with the message
 */
export const logDebug = (message: string, data?: any) => {
  if (DEBUG_MODE) {
    if (data) {
      console.log(`[DEBUG] ${message}`, data);
    } else {
      console.log(`[DEBUG] ${message}`);
    }
  }
}; 