import { getAllUsers } from "./userService.js";
import { getAvailableMeals, getSpecialDayInfo } from "./availabilityService.js";
import { getEffectiveLocation } from "./workLocationService.js";
import { getRecordsForDate } from "./mealService.js";
import { getTeams } from "./userService.js";
import { LOCATIONS } from "../constants/locations.js";

/**
 * Build headcount report for a date.
 *
 * Dual-default formula:
 *   default-IN meals:  headcount = officeUsers - optedOutOfficeUsers
 *   default-OUT meals: headcount = optedInOfficeUsers
 */
export function getHeadcountReport(date) {
    const availableMeals = getAvailableMeals(date);
    const specialDay = getSpecialDayInfo(date);

    if (availableMeals.length === 0) {
        return {
            date,
            specialDay: specialDay || null,
            totalUsers: 0,
            officeCount: 0,
            wfhCount: 0,
            meals: [],
            byTeam: [],
        };
    }

    const users = getAllUsers();
    const teams = getTeams();
    const mealRecords = getRecordsForDate(date);

    // Classify users by location
    const officeUserIds = new Set();
    const teamStatsMap = new Map();

    // Initialize team stats from teams.json so we include team names
    for (const team of teams) {
        teamStatsMap.set(team.id, { teamId: team.id, name: team.name, officeCount: 0, wfhCount: 0 });
    }

    for (const user of users) {
        const loc = getEffectiveLocation(user.id, date);

        // Count in office set regardless of team assignment (affects meal headcount)
        if (loc !== LOCATIONS.WFH) {
            officeUserIds.add(user.id);
        }

        // Only include in byTeam breakdown if user belongs to a known team
        if (!user.teamId) continue;

        if (!teamStatsMap.has(user.teamId)) {
            teamStatsMap.set(user.teamId, { teamId: user.teamId, name: user.teamId, officeCount: 0, wfhCount: 0 });
        }
        const team = teamStatsMap.get(user.teamId);

        if (loc === LOCATIONS.WFH) {
            team.wfhCount++;
        } else {
            team.officeCount++;
        }
    }

    // Build per-meal headcount using dual-default formula
    const meals = availableMeals.map((meal) => {
        let headcount;

        if (meal.default === "IN") {
            const optedOut = mealRecords.filter(
                (r) => r.mealType === meal.type && r.status === "OUT" && officeUserIds.has(r.userId)
            ).length;
            headcount = officeUserIds.size - optedOut;
        } else {
            const optedIn = mealRecords.filter(
                (r) => r.mealType === meal.type && r.status === "IN" && officeUserIds.has(r.userId)
            ).length;
            headcount = optedIn;
        }

        return { type: meal.type, default: meal.default, headcount };
    });

    // Only include teams that have members
    const byTeam = Array.from(teamStatsMap.values()).filter(
        (t) => t.officeCount > 0 || t.wfhCount > 0
    );

    return {
        date,
        specialDay: specialDay || null,
        totalUsers: users.length,
        officeCount: officeUserIds.size,
        wfhCount: users.length - officeUserIds.size,
        meals,
        byTeam,
    };
}
