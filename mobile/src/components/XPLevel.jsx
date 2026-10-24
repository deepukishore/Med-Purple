import React from "react";
import { View, Text } from "react-native";
import useData from "../hooks/useData";
import { styles as s } from "../theme";
import Button from "./Button";
import { ErrorState } from "./States";
export default function XPLevel({ navigation }) {
  const { data, error, reload } = useData("/progress");
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <Text style={s.small}>Loading your level…</Text>;
  return (
    <View style={s.card}>
      <Text style={s.pillText}>ONE LEVEL ACROSS THE APP</Text>
      <View style={s.between}>
        <Text style={s.heading}>Level {data.level}</Text>
        <Text style={s.pillText}>{data.xp} XP</Text>
      </View>
      <View style={s.progress}>
        <View style={[s.progressFill, { width: `${data.level_progress}%` }]} />
      </View>
      <Text style={s.small}>
        {100 - data.level_progress} XP to level {data.level + 1}. Study, create,
        plan, and help others to grow.
      </Text>
      <Button
        title="Rewards & activity"
        variant="secondary"
        onPress={() => navigation.navigate("Progress")}
      />
    </View>
  );
}
