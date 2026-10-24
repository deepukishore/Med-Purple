import React from "react";
import { View, Text } from "react-native";
import Screen from "../components/Screen";
import Button from "../components/Button";
import { styles as s } from "../theme";
import content from "../../../shared/legal.json";

export default function AboutScreen({ navigation }) {
  return (
    <Screen>
      <Text style={s.small}>ABOUT MED PURPLE</Text>
      <Text style={s.title}>{content.about.title}</Text>
      <Text style={s.body}>{content.about.intro}</Text>
      <View style={s.card}>
        <Text style={s.heading}>Supporting everyday medical study</Text>
        <Text style={s.body}>{content.about.mission}</Text>
      </View>
      {content.about.features.map((feature) => (
        <View style={s.card} key={feature.heading}>
          <Text style={s.heading}>{feature.heading}</Text>
          <Text style={s.body}>{feature.body}</Text>
        </View>
      ))}
      <View style={s.card}>
        <Text style={s.heading}>{content.about.teamHeading}</Text>
        <Text style={s.body}>{content.about.founderNote}</Text>
        {content.about.people.map(({ name, role, bio }) => (
          <View key={name}>
            <Text style={s.heading}>{name}</Text>
            <Text style={s.small}>{role}</Text>
            <Text style={s.body}>{bio}</Text>
          </View>
        ))}
      </View>
      <Text style={s.small}>
        Med Purple supports education and revision. Always verify clinical
        information with current authoritative sources and qualified guidance.
      </Text>
      <Button
        title="Visit our legal centre"
        variant="secondary"
        onPress={() => navigation.navigate("LegalCentre")}
      />
    </Screen>
  );
}
