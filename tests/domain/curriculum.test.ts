import { describe, it, expect } from "vitest";
import {
  SIXTEEN_WEEK_CURRICULUM,
  TASK_LESSON_TEMPLATE_45M,
  CONVERSATION_MISSIONS,
  getWeekPlan,
} from "@/lib/domain/curriculum";

describe("16-Week TBLT Curriculum", () => {
  it("defines all 16 weeks with checkpoints on weeks 1, 4, 8, 12 and 16", () => {
    expect(SIXTEEN_WEEK_CURRICULUM).toHaveLength(16);
    const checkpointWeeks = SIXTEEN_WEEK_CURRICULUM.filter((w) => w.isCheckpoint).map(
      (w) => w.week
    );
    expect(checkpointWeeks).toEqual([1, 4, 8, 12, 16]);
  });

  it("provides the 9-stage 45-minute task-based lesson template starting with Cold Attempt and including Second Task", () => {
    expect(TASK_LESSON_TEMPLATE_45M).toHaveLength(9);
    expect(TASK_LESSON_TEMPLATE_45M[0].id).toBe("cold_attempt");
    expect(TASK_LESSON_TEMPLATE_45M.some((s) => s.id === "second_task")).toBe(true);
    const total = TASK_LESSON_TEMPLATE_45M.reduce((acc, s) => acc + s.minutes, 0);
    expect(total).toBe(45);
  });

  it("returns valid week plan clamped to 1..16 and exposes real-world conversation missions", () => {
    expect(getWeekPlan(0).week).toBe(1);
    expect(getWeekPlan(25).week).toBe(16);
    expect(CONVERSATION_MISSIONS.length).toBeGreaterThanOrEqual(4);
  });
});
