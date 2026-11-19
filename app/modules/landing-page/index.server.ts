import { db } from "~/db";
import { getLandingPage, type Db } from "./lib/landing-page";

export type {
  FeaturedCourse,
  LandingPage,
  LandingStats,
} from "./lib/landing-page";

/**
 * The landing page's figures bound to a database. The app uses
 * `landingPage`; tests build their own against a test database.
 */
export function createLandingPage(database: Db) {
  return {
    /**
     * The catalogue at a glance and the newest published courses. Counts
     * only published courses, and the lessons, instructors and categories
     * they bring with them.
     */
    get() {
      return getLandingPage(database);
    },
  };
}

// Pure so a route importing this only for its loader doesn't pull the
// database into the client bundle (see `~/db`).
export const landingPage = /* @__PURE__ */ createLandingPage(db);
