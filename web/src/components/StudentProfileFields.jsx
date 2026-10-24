import s from "../pages/Library.module.css";
import { studyYears, timezones } from "../utils/studentProfile";
export default function StudentProfileFields({ form, onChange, goals = true }) {
  const input = (key, label, maxLength, placeholder = "") => (
    <label>
      {label}
      <input
        value={form[key] || ""}
        required={key === "exam_name"}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(key, e.target.value)}
      />
    </label>
  );
  return (
    <>
      <div className={s.formRow}>
        <label>
          Course & year
          <select
            value={form.year}
            onChange={(e) => onChange("year", e.target.value)}
          >
            {[...new Set([form.year, ...studyYears])]
              .filter(Boolean)
              .map((x) => (
                <option key={x}>{x}</option>
              ))}
          </select>
        </label>
        <label>
          Expected graduation year (optional)
          <input
            type="number"
            min="1950"
            max="2100"
            placeholder="e.g. 2029"
            value={form.graduation_year ?? ""}
            onChange={(e) =>
              onChange(
                "graduation_year",
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
          />
        </label>
      </div>
      {input(
        "college",
        "Medical college / institution (optional)",
        160,
        "Your college or teaching hospital",
      )}
      {input(
        "university",
        "University (optional)",
        160,
        "Your affiliated university",
      )}
      <div className={s.formRow}>
        {input(
          "specialty",
          "Specialty interests (optional)",
          100,
          "e.g. Internal medicine, surgery",
        )}
        {input("location", "City / country (optional)", 80, "Where you study")}
      </div>
      {goals && (
        <>
          <h2>Your study goals</h2>
          {input(
            "exam_name",
            "Next exam or study milestone",
            100,
            "e.g. University finals",
          )}
          <div className={s.formRow}>
            <label>
              Target date
              <input
                type="date"
                required
                value={form.exam_date}
                onChange={(e) => onChange("exam_date", e.target.value)}
              />
            </label>
            <label>
              Questions per day
              <input
                type="number"
                min="1"
                max="100"
                required
                value={form.daily_target}
                onChange={(e) =>
                  onChange(
                    "daily_target",
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
              />
            </label>
          </div>
          <label>
            Timezone
            <select
              value={form.timezone}
              onChange={(e) => onChange("timezone", e.target.value)}
            >
              {[...new Set([form.timezone, ...timezones])]
                .filter(Boolean)
                .map((x) => (
                  <option key={x}>{x}</option>
                ))}
            </select>
          </label>
        </>
      )}
    </>
  );
}
