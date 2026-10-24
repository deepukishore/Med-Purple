import React from "react";
import { View, Text } from "react-native";
import { styles as s } from "../theme";
import Screen from "../components/Screen";
import policies from "../../../shared/legal.json";
export default function LegalScreen({ privacy = false, route }) {
  const policy = route?.params?.policy || (privacy ? "privacy" : "terms");
  const page =
    policies.pages.find((item) => item.key === policy) || policies.pages[0];
  return (
    <Screen>
      <Text style={s.title}>{page.title}</Text>
      <Text style={s.small}>
        Updated {policies.updated} · {policies.status}
      </Text>
      <View style={s.card}>
        <Text style={s.heading}>Publication details pending</Text>
        <Text style={s.body}>{policies.reviewNote}</Text>
      </View>
      {policies[page.key].map((section) => (
        <View style={s.section} key={section.heading}>
          <Text style={s.heading}>{section.heading}</Text>
          <Text style={s.body}>{section.body}</Text>
        </View>
      ))}
    </Screen>
  );
}
