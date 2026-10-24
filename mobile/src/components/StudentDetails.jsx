import React from "react";
import { View } from "react-native";
import FormField from "./FormField";
import Chips from "./Chips";
export default function StudentDetails({ form, onChange }) {
  return (
    <View style={{ gap: 16 }}>
      <Chips
        label="Course & year"
        value={form.year}
        onChange={(v) => onChange("year", v)}
        items={[
          "MBBS · Year 1",
          "MBBS · Year 2",
          "MBBS · Year 3",
          "MBBS · Final year",
          "Medical intern",
          "Medical student",
          "Postgraduate resident",
          "Nursing student",
          "Allied health student",
        ]}
      />
      <FormField
        label="Medical college / institution (optional)"
        value={form.college}
        onChangeText={(v) => onChange("college", v)}
        maxLength={160}
      />
      <FormField
        label="University (optional)"
        value={form.university}
        onChangeText={(v) => onChange("university", v)}
        maxLength={160}
      />
      <FormField
        label="Expected graduation year (optional)"
        value={form.graduation_year}
        onChangeText={(v) => onChange("graduation_year", v)}
        keyboardType="number-pad"
        maxLength={4}
        placeholder="e.g. 2029"
      />
      <FormField
        label="Specialty interests (optional)"
        value={form.specialty}
        onChangeText={(v) => onChange("specialty", v)}
        maxLength={100}
        placeholder="e.g. Internal medicine, surgery"
      />
    </View>
  );
}
