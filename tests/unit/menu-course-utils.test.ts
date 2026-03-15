import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getDuplicateCourseError,
  getNextCourseNumber,
  hasCourseNumber,
} from '@/lib/menus/course-utils'

test('getNextCourseNumber starts at one for empty menus', () => {
  assert.equal(getNextCourseNumber([]), 1)
})

test('getNextCourseNumber uses the highest existing course number, not array length', () => {
  assert.equal(getNextCourseNumber([1, 3]), 4)
  assert.equal(getNextCourseNumber([2, 5, 4]), 6)
})

test('hasCourseNumber ignores nullish values and matches exact course numbers', () => {
  assert.equal(hasCourseNumber([null, undefined, 2, 4], 2), true)
  assert.equal(hasCourseNumber([null, undefined, 2, 4], 3), false)
})

test('getDuplicateCourseError explains the corrective action', () => {
  assert.equal(
    getDuplicateCourseError(3),
    'Course 3 already exists on this menu. Add components to that course or create a new course instead.'
  )
})
