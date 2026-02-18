import { getSettings } from "../services/settingsService.js";
import { ROLES } from "../constants/roles.js";

/**
 * Cutoff middleware factory.
 * Blocks employee/logistics mutations after the configured cutoff time.
 * TL and Admin bypass cutoff.
 *
 * @param {Function} getDate - extracts target date string from req (e.g., req => req.body.date)
 */
export function enforceCutoff(getDate) {
    return function (req, res, next) {
        const user = req.session.user;

        // TL and Admin bypass cutoff
        if (user.role === ROLES.TEAM_LEAD || user.role === ROLES.ADMIN) {
            return next();
        }

        const targetDate = getDate(req);
        if (!targetDate) {
            return next(); // let route-level validation handle missing date
        }

        const settings = getSettings();
        const cutoffTime = settings.cutoffTime || "22:00";

        if (isPastCutoff(targetDate, cutoffTime)) {
            return res.status(403).json({
                error: `Changes for ${targetDate} are locked. Cutoff was ${cutoffTime} the day before.`,
            });
        }

        next();
    };
}

/**
 * Check if the current time is past the cutoff for a target date.
 * Cutoff is at cutoffTime (HH:mm) on the day BEFORE the target date.
 */
function isPastCutoff(targetDate, cutoffTime) {
    const [y, m, d] = targetDate.split("-").map(Number);
    const [hours, minutes] = cutoffTime.split(":").map(Number);

    // Cutoff datetime = day before target date at cutoffTime
    const cutoffDate = new Date(y, m - 1, d - 1, hours, minutes, 0);
    const now = new Date();

    return now > cutoffDate;
}
