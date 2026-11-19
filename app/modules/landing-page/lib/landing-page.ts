import { countDistinct, desc, eq, inArray, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type * as schema from "~/db/schema";
import { courses, CourseStatus, lessons, modules, users } from "~/db/schema";

export type Db = BetterSQLite3Database<typeof schema>;

const FEATURED_COURSE_LIMIT = 3;

export type LandingStats = {
  courses: number;
  lessons: number;
  instructors: number;
  categories: number;
};

export type FeaturedCourse = {
  id: number;
  title: string;
  slug: string;
  description: string;
  coverImageUrl: string | null;
  instructorName: string;
  lessonCount: number;
};

export type LandingPage = {
  stats: LandingStats;
  featuredCourses: FeaturedCourse[];
};

const published = eq(courses.status, CourseStatus.Published);

function getStats(db: Db): LandingStats {
  const catalogue = db
    .select({
      courses: countDistinct(courses.id),
      instructors: countDistinct(courses.instructorId),
      categories: countDistinct(courses.categoryId),
    })
    .from(courses)
    .where(published)
    .get();

  const lessonCount = db
    .select({ lessons: sql<number>`count(${lessons.id})` })
    .from(lessons)
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .innerJoin(courses, eq(modules.courseId, courses.id))
    .where(published)
    .get();

  return {
    courses: catalogue?.courses ?? 0,
    instructors: catalogue?.instructors ?? 0,
    categories: catalogue?.categories ?? 0,
    lessons: lessonCount?.lessons ?? 0,
  };
}

function getFeaturedCourses(db: Db): FeaturedCourse[] {
  const newest = db
    .select({
      id: courses.id,
      title: courses.title,
      slug: courses.slug,
      description: courses.description,
      coverImageUrl: courses.coverImageUrl,
      instructorName: users.name,
    })
    .from(courses)
    .innerJoin(users, eq(courses.instructorId, users.id))
    .where(published)
    .orderBy(desc(courses.createdAt), desc(courses.id))
    .limit(FEATURED_COURSE_LIMIT)
    .all();

  const lessonCounts = db
    .select({
      courseId: modules.courseId,
      lessonCount: sql<number>`count(${lessons.id})`,
    })
    .from(modules)
    .innerJoin(lessons, eq(lessons.moduleId, modules.id))
    .where(
      inArray(
        modules.courseId,
        newest.map((course) => course.id)
      )
    )
    .groupBy(modules.courseId)
    .all();

  const countByCourse = new Map(
    lessonCounts.map((row) => [row.courseId, row.lessonCount])
  );

  return newest.map((course) => ({
    ...course,
    lessonCount: countByCourse.get(course.id) ?? 0,
  }));
}

export function getLandingPage(db: Db): LandingPage {
  return { stats: getStats(db), featuredCourses: getFeaturedCourses(db) };
}
