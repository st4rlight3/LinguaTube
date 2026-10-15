import { describe, it, expect } from "vitest";
import {
  activeCue,
  reviewWord,
  clock,
  parseTranscript,
  type Segment,
  type Word,
} from "./core";
const cues: Segment[] = [
  { id: "0", start: 1, end: 2, en: "Hello", vi: "Xin chào" },
  { id: "1", start: 2, end: 4, en: "World", vi: "Thế giới" },
];
describe("offline transcript import", () => {
  it("preserves times and strips formatting from SRT", () => {
    expect(
      parseTranscript(
        "1\n00:00:01,000 --> 00:00:03,500\nHello <i>world</i>.",
      )[0],
    ).toEqual({ id: "0", start: 1, end: 3.5, en: "Hello world.", vi: "" });
  });
  it("handles VTT cue settings and BOM", () => {
    expect(
      parseTranscript(
        "\uFEFFWEBVTT\n\n00:01.000 --> 00:03.000 align:start\nGood morning",
      )[0].end,
    ).toBe(3);
  });
  it("rejects reversed and invalid times", () => {
    expect(() => parseTranscript("00:05.000 --> 00:03.000\nhello")).toThrow();
    expect(() => parseTranscript("00:65.000 --> 00:70.000\nhello")).toThrow();
  });
});
describe("transcript clock", () => {
  it("handles boundaries and gaps without inventing captions", () => {
    expect(activeCue(cues, 0)).toBe(-1);
    expect(activeCue(cues, 1)).toBe(0);
    expect(activeCue(cues, 2)).toBe(1);
    expect(activeCue(cues, 4)).toBe(-1);
  });
  it("formats timestamps", () => {
    expect(clock(65.9)).toBe("1:05");
  });
});
describe("spaced repetition", () => {
  const word: Word = {
    word: "hello",
    definition: "a greeting",
    interval: 2,
    reviews: 1,
    due: 0,
  };
  it("schedules a failed recall in ten minutes", () => {
    expect(reviewWord(word, "again", 1000).due).toBe(601000);
  });
  it("lengthens a successful review interval", () => {
    const result = reviewWord(word, "good", 0);
    expect(result.interval).toBe(4);
    expect(result.reviews).toBe(2);
    expect(result.due).toBe(345600000);
  });
  it("keeps easy reviews further apart than hard ones", () => {
    expect(reviewWord(word, "easy", 0).due).toBeGreaterThan(
      reviewWord(word, "hard", 0).due,
    );
  });
});
