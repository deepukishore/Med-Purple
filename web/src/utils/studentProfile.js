export const studyYears = [
  "MBBS · Year 1",
  "MBBS · Year 2",
  "MBBS · Year 3",
  "MBBS · Final year",
  "Medical intern",
  "Medical student",
  "Postgraduate resident",
  "Nursing student",
  "Allied health student",
  "Independent learner",
];
export const timezones = [
  "Asia/Kolkata",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
  "Asia/Dubai",
  "Etc/UTC",
];
export function profileValues(user) {
  return Object.fromEntries(
    [
      "name",
      "year",
      "college",
      "university",
      "graduation_year",
      "specialty",
      "location",
      "timezone",
      "exam_name",
      "exam_date",
      "daily_target",
    ].map((key) => [key, user[key] ?? (key === "graduation_year" ? null : "")]),
  );
}
