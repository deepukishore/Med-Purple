import React from "react";
import { Text, View } from "react-native";
import Screen from "../components/Screen";
import Button from "../components/Button";
import { colors, styles as s } from "../theme";
export default function NotFoundScreen({ navigation }) {
  return (
    <Screen>
      <View style={[s.card, { alignItems: "center", paddingVertical: 42 }]}>
        <Text style={[s.pillText, { fontSize: 15 }]}>404 · WRONG TURN</Text>
        <Text style={s.title}>This page isn’t in your study set.</Text>
        <Text style={s.subtitle}>Head back to your desk and keep going.</Text>
        <Button
          title="Back to study desk"
          onPress={() => navigation.navigate("Home")}
        />
      </View>
    </Screen>
  );
}
