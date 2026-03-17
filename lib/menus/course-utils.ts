export function getNextCourseNumber(courseNumbers: Array<number | null | undefined>): number {
  const maxCourseNumber = courseNumbers.reduce<number>((max, courseNumber) => {
    if (typeof courseNumber !== 'number' || !Number.isFinite(courseNumber)) {
      return max
    }

    return Math.max(max, courseNumber)
  }, 0)

  return maxCourseNumber + 1
}

export function hasCourseNumber(
  courseNumbers: Array<number | null | undefined>,
  targetCourseNumber: number
): boolean {
  return courseNumbers.some((courseNumber) => courseNumber === targetCourseNumber)
}

export function getDuplicateCourseError(targetCourseNumber: number): string {
  return `Course ${targetCourseNumber} already exists on this menu. Add components to that course or create a new course instead.`
}
