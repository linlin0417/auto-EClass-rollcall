'use strict';

/**
 * Evaluates the raw API payload to determine the type of attendance task required.
 * Replaces the old `decideRollcall` and `classifyRollcall` logic.
 */
class StrategyEvaluator {
  /**
   * @param {Object} activeTaskPayload 
   * @returns {string|null} - 'PIN', 'GEO', 'SCAN', or null
   */
  static determineTaskType(activeTaskPayload) {
    if (!activeTaskPayload || !activeTaskPayload.rollcall_settings) {
      return null;
    }

    const mode = activeTaskPayload.rollcall_settings.answer_mode;

    switch (mode) {
      case 'number_code':
        return 'PIN';
      case 'radar':
        return 'GEO';
      case 'qrcode':
        return 'SCAN';
      default:
        // Try falling back to analyzing the payload shape if the mode string is missing
        if (activeTaskPayload.rollcall_settings.number_code) return 'PIN';
        if (activeTaskPayload.rollcall_settings.radar) return 'GEO';
        if (activeTaskPayload.rollcall_settings.qrcode) return 'SCAN';
        return null;
    }
  }

  /**
   * Checks if the task is worth attempting based on global attendance rate.
   * @param {Object} activeTaskPayload 
   * @returns {boolean}
   */
  static isGlobalThresholdMet(activeTaskPayload) {
    const studentCount = activeTaskPayload.student_count || 1;
    const answeredCount = activeTaskPayload.answered_count || 0;
    
    // Require at least 15% to avoid fake rollcalls
    return (answeredCount / studentCount) >= 0.15;
  }
}

module.exports = {
  StrategyEvaluator
};
