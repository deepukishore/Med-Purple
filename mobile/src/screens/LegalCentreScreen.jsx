import React from "react";
import { View, Text } from "react-native";
import Screen from "../components/Screen";
import Button from "../components/Button";
import { styles as s } from "../theme";
import policies from "../../../shared/legal.json";

export default function LegalCentreScreen({ navigation }) {
  return (
    <Screen>
      <Text style={s.title}>Legal centre</Text>
      <Text style={s.body}>
        Understand how Med Purple works, how your information is used, and the
        choices you have.
      </Text>
      <View style={s.card}>
        <Text style={s.heading}>{policies.status}</Text>
        <Text style={s.body}>{policies.reviewNote}</Text>
      </View>
      {policies.pages.map((page) => (
        <View style={s.card} key={page.key}>
          <Text style={s.heading}>{page.title}</Text>
          <Text style={s.body}>{page.summary}</Text>
          <Button
            title={`Read ${page.title}`}
            variant="secondary"
            onPress={() =>
              navigation.navigate("LegalPolicy", { policy: page.key })
            }
          />
        </View>
      ))}
      <Text style={s.small}>Updated {policies.updated}</Text>
      <Button
        title="About Med Purple"
        variant="secondary"
        onPress={() => navigation.navigate("About")}
      />
    </Screen>
  );
}
