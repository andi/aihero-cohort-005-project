import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb, seedBaseData, type TestDb } from "~/test/setup";
import * as schema from "~/db/schema";
import { CourseStatus, UserRole } from "~/db/schema";
import { markdown } from "~/lib/text";
import { createLandingPage } from "../index.server";

let db: TestDb;
let instructorId: number;
let categoryId: number;
let baseCourseId: number;

beforeEach(() => {
  db = createTestDb();
  const base = seedBaseData(db);
  instructorId = base.instructor.id;
  categoryId = base.category.id;
  baseCourseId = base.course.id;
});

function landing() {
  return createLandingPage(db).get();
}

// ─── Fixtures ───
// No module writes courses, modules or lessons yet, so rows go in directly.
// Kept in one place so a schema change touches only this block.

let slugCounter = 0;

function addCourse(
  title: string,
  options: {
    status?: CourseStatus;
    instructorId?: number;
    categoryId?: number;
    createdAt?: string;
  } = {}
) {
  slugCounter += 1;
  return db
    .insert(schema.courses)
    .values({
      title,
      slug: `course-${slugCounter}`,
      description: `About ${title}`,
      salesCopy: markdown(`## ${title}`),
      instructorId: options.instructorId ?? instructorId,
      categoryId: options.categoryId ?? categoryId,
      status: options.status ?? CourseStatus.Published,
      createdAt: options.createdAt,
    })
    .returning()
    .get();
}

function addLessons(courseId: number, count: number) {
  const mod = db
    .insert(schema.modules)
    .values({ courseId, title: "Module", position: 1 })
    .returning()
    .get();
  for (let position = 1; position <= count; position += 1) {
    db.insert(schema.lessons)
      .values({ moduleId: mod.id, title: `Lesson ${position}`, position })
      .run();
  }
}

function addInstructor(name: string) {
  return db
    .insert(schema.users)
    .values({
      name,
      email: `${name.toLowerCase().replaceAll(" ", ".")}@example.com`,
      role: UserRole.Instructor,
    })
    .returning()
    .get();
}

function addCategory(name: string) {
  return db
    .insert(schema.categories)
    .values({ name, slug: name.toLowerCase() })
    .returning()
    .get();
}

// ─── Stats ───

describe("stats", () => {
  it("counts the published catalogue", () => {
    const other = addInstructor("Olive Other");
    const design = addCategory("Design");
    const second = addCourse("Second", {
      instructorId: other.id,
      categoryId: design.id,
    });
    addLessons(baseCourseId, 3);
    addLessons(second.id, 2);

    expect(landing().stats).toEqual({
      courses: 2,
      lessons: 5,
      instructors: 2,
      categories: 2,
    });
  });

  it("leaves out draft and archived courses and everything only they bring", () => {
    const other = addInstructor("Olive Other");
    const design = addCategory("Design");
    const draft = addCourse("Draft", {
      status: CourseStatus.Draft,
      instructorId: other.id,
      categoryId: design.id,
    });
    const archived = addCourse("Archived", {
      status: CourseStatus.Archived,
      instructorId: other.id,
    });
    addLessons(draft.id, 4);
    addLessons(archived.id, 4);
    addLessons(baseCourseId, 1);

    expect(landing().stats).toEqual({
      courses: 1,
      lessons: 1,
      instructors: 1,
      categories: 1,
    });
  });

  it("counts an instructor or category with several courses once", () => {
    addCourse("Second");
    addCourse("Third");

    expect(landing().stats).toMatchObject({
      courses: 3,
      instructors: 1,
      categories: 1,
    });
  });

  it("is all zeros when nothing is published", () => {
    db.update(schema.courses).set({ status: CourseStatus.Draft }).run();

    expect(landing().stats).toEqual({
      courses: 0,
      lessons: 0,
      instructors: 0,
      categories: 0,
    });
  });
});

// ─── Featured courses ───

describe("featuredCourses", () => {
  it("shows the three newest published courses, newest first", () => {
    db.update(schema.courses)
      .set({ createdAt: "2026-01-01T00:00:00.000Z" })
      .run();
    addCourse("February", { createdAt: "2026-02-01T00:00:00.000Z" });
    addCourse("April", { createdAt: "2026-04-01T00:00:00.000Z" });
    addCourse("Draft May", {
      status: CourseStatus.Draft,
      createdAt: "2026-05-01T00:00:00.000Z",
    });
    addCourse("March", { createdAt: "2026-03-01T00:00:00.000Z" });

    expect(landing().featuredCourses.map((c) => c.title)).toEqual([
      "April",
      "March",
      "February",
    ]);
  });

  it("carries the instructor's name and the course's lesson count", () => {
    const other = addInstructor("Olive Other");
    const course = addCourse("Theirs", {
      instructorId: other.id,
      createdAt: "2030-01-01T00:00:00.000Z",
    });
    addLessons(course.id, 2);
    addLessons(course.id, 3);

    const [featured, base] = landing().featuredCourses;

    expect(featured).toEqual({
      id: course.id,
      title: "Theirs",
      slug: course.slug,
      description: "About Theirs",
      coverImageUrl: null,
      instructorName: "Olive Other",
      lessonCount: 5,
    });
    expect(base).toMatchObject({
      id: baseCourseId,
      instructorName: "Test Instructor",
      lessonCount: 0,
    });
  });

  it("is empty when nothing is published", () => {
    db.update(schema.courses).set({ status: CourseStatus.Draft }).run();

    expect(landing().featuredCourses).toEqual([]);
  });
});
