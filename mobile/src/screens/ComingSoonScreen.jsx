import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles as s, colors } from "../theme";
import useData from "../hooks/useData";
import Screen from "../components/Screen";
import Button from "../components/Button";
import { Skeleton, ErrorState } from "../components/States";
export default function ComingSoonScreen({ navigation, feature }) {
  const { data, loading, error, reload } = useData(`/${feature}`);
  if (loading) return <Skeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return (
    <Screen>
      <View
        style={[
          s.card,
          { alignItems: "center", paddingVertical: 42, marginTop: 25, gap: 23 },
        ]}
      >
        <Ionicons
          name={feature === "community" ? "people-outline" : "book-outline"}
          size={50}
          color={colors.purple[600]}
        />
        <View style={s.pill}>
          <Text style={s.pillText}>Coming soon</Text>
        </View>
        <Text style={[s.title, { textAlign: "center" }]}>{data.title}</Text>
        <Text style={[s.body, { color: colors.muted, textAlign: "center" }]}>
          {data.description}
        </Text>
        <Button
          title="Practice a few questions"
          onPress={() => navigation.navigate("MCQs")}
        />
      </View>
    </Screen>
  );
}
