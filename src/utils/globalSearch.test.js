import assert from "node:assert/strict";
import test from "node:test";
import { makeGlobalSearchEntry, searchGlobalEntries } from "./globalSearch.js";

const entries = [
  makeGlobalSearchEntry({
    id: "internship-1",
    title: "Software Engineering Intern",
    category: "Internship",
    description: "Veeam Software · Remote",
    searchText: "Veeam Software React JavaScript",
    path: "/internships?search=Software",
  }),
  makeGlobalSearchEntry({
    id: "saved-internship-1",
    title: "Software Engineering Intern",
    category: "Saved internship",
    description: "Veeam Software · Remote",
    searchText: "Veeam Software React JavaScript",
    path: "/internships?view=saved",
    saved: true,
  }),
  makeGlobalSearchEntry({
    id: "hackathon-1",
    title: "SHAASTRA 2027",
    category: "Hackathon",
    description: "IIT Madras",
    searchText: "IIT Madras hackathon",
    path: "/hackathons?search=SHAASTRA",
  }),
  makeGlobalSearchEntry({
    id: "saved-hackathon-1",
    title: "Saved hackathon title",
    category: "Saved hackathon",
    description: "IIT Madras · Organizer One",
    searchText: "SHAASTRA IIT Madras organizer one React",
    path: "/hackathons?search=SHAASTRA",
    saved: true,
  }),
];

test("searches live internship and hackathon titles case-insensitively", () => {
  assert.ok(searchGlobalEntries(entries, "software engineering").some((entry) => entry.category === "Internship"));
  assert.ok(searchGlobalEntries(entries, "shaastra 2027").some((entry) => entry.title === "SHAASTRA 2027"));
});

test("searches skills and associated content through indexed text", () => {
  assert.ok(searchGlobalEntries(entries, "react").some((entry) => entry.category === "Internship"));
});

test("a saved query only returns records explicitly marked as student-saved", () => {
  assert.deepEqual(
    searchGlobalEntries(entries, "saved").map((entry) => entry.category),
    ["Saved hackathon", "Saved internship"]
  );
  assert.deepEqual(searchGlobalEntries(entries, "saved internships").map((entry) => entry.category), ["Saved internship"]);
  assert.deepEqual(searchGlobalEntries(entries, "saved hackathon").map((entry) => entry.category), ["Saved hackathon"]);
});

test("saved searches can also filter by title, organizer, company, and skills", () => {
  assert.deepEqual(
    searchGlobalEntries(entries, "saved react").map((entry) => entry.category),
    ["Saved hackathon", "Saved internship"]
  );
  assert.deepEqual(
    searchGlobalEntries(entries, "saved hackathon organizer").map((entry) => entry.id),
    ["Saved hackathon:saved-hackathon-1"]
  );
  assert.deepEqual(
    searchGlobalEntries(entries, "saved internship veeam").map((entry) => entry.id),
    ["Saved internship:saved-internship-1"]
  );
});

test("empty and unmatched queries return no results", () => {
  assert.deepEqual(searchGlobalEntries(entries, ""), []);
  assert.deepEqual(searchGlobalEntries(entries, "not-present"), []);
});
