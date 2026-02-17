import { getHeadcount, optOut, optIn, getUserMealStatus, getRecordsForDate } from '../../src/services/mealService.js';
import { writeJson } from '../../src/storage/jsonStore.js';

describe('mealService', () => {
  beforeEach(() => {
    // Reset meals.json before each test
    writeJson('meals.json', []);
  });

  describe('getHeadcount', () => {
    test('returns total users when no opt-outs', () => {
      const result = getHeadcount(['LUNCH'], '2025-01-15');
      expect(result.headcount.LUNCH).toBe(result.totalUsers);
    });

    test('decreases count when user opts out', () => {
      const date = '2025-01-15';
      const result1 = getHeadcount(['LUNCH'], date);
      const initialCount = result1.headcount.LUNCH;

      optOut('u123', 'LUNCH', 'u123', date);

      const result2 = getHeadcount(['LUNCH'], date);
      expect(result2.headcount.LUNCH).toBe(initialCount - 1);
    });
  });

  describe('getUserMealStatus', () => {
    test('returns IN by default when no record exists', () => {
      const status = getUserMealStatus('u999', ['LUNCH'], '2025-01-15');
      expect(status.LUNCH).toBe('IN');
    });

    test('returns OUT when user opted out', () => {
      const date = '2025-01-15';
      optOut('u123', 'LUNCH', 'u123', date);
      
      const status = getUserMealStatus('u123', ['LUNCH'], date);
      expect(status.LUNCH).toBe('OUT');
    });
  });

  describe('optIn', () => {
    test('retains record with status IN for audit trail', () => {
      const date = '2025-01-15';
      optOut('u123', 'LUNCH', 'u123', date);

      let status = getUserMealStatus('u123', ['LUNCH'], date);
      expect(status.LUNCH).toBe('OUT');

      optIn('u123', 'LUNCH', 'u123', date);

      status = getUserMealStatus('u123', ['LUNCH'], date);
      expect(status.LUNCH).toBe('IN');

      // Record should still exist with status IN (not deleted)
      const records = getRecordsForDate(date);
      const record = records.find(r => r.userId === 'u123' && r.mealType === 'LUNCH');
      expect(record).toBeDefined();
      expect(record.status).toBe('IN');
      expect(record.updatedBy).toBe('u123');
    });
  });
});
