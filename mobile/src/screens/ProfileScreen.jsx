import React, { useEffect, useState } from "react";
import { View, Text, Alert, Pressable } from "react-native";
import { styles as s, colors } from "../theme";
import { api, useApp } from "../context/AppContext";
import Screen from "../components/Screen";
import Button from "../components/Button";
import FormField from "../components/FormField";
import StudentDetails from "../components/StudentDetails";
import Chips from "../components/Chips";
import XPLevel from "../components/XPLevel";
export default function ProfileScreen({ navigation }) {
  const { user, setUser, notify, changed, initialize } = useApp();
  const [form, setForm] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const { id, email, is_guest, ...rest } = user;
    setForm(rest);
  }, [user]);
  if (!form) return null;
  const field = (key, value) => setForm((x) => ({ ...x, [key]: value }));
  async function save() {
    setBusy(true);
    setError("");
    try {
      setUser(
        await api.patch("/auth/me", {
          ...form,
          daily_target: Number(form.daily_target),
          graduation_year:
            form.graduation_year === "" || form.graduation_year == null
              ? null
              : Number(form.graduation_year),
        }),
      );
      changed();
      notify("Profile saved.");
    } catch (e) {
      setError(e.message);
      notify(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    try {
      await api.logout();
      await initialize();
      notify("Signed out.");
    } catch (e) {
      notify(e.message);
    } finally {
      setBusy(false);
    }
  }
  function remove() {
    Alert.alert(
      "Delete your account?",
      "Your profile and study records will be permanently deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete permanently",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete("/auth/me");
              await api.clear();
              await initialize();
              notify("Account and study records deleted.");
            } catch (e) {
              notify(e.message);
            }
          },
        },
      ],
    );
  }
  return (
    <Screen>
      <View>
        <Text style={s.title}>A space that’s yours.</Text>
        <Text style={s.subtitle}>
          Your goals, your pace, your next chapter.
        </Text>
      </View>
      {!!error && (
        <Text accessibilityLiveRegion="polite" style={s.error}>
          {error}
        </Text>
      )}
      <XPLevel navigation={navigation} />
      <Button
        title="View your public profile"
        variant="secondary"
        onPress={() => navigation.navigate("Students", { id: user.id })}
      />
      <Button
        title="Meet other students"
        variant="secondary"
        onPress={() => navigation.navigate("Students", { id: null })}
      />
      <View style={s.card}>
        <Text style={s.heading}>Your study profile</Text>
        <FormField
          label="Name"
          value={form.name}
          onChangeText={(v) => field("name", v)}
          maxLength={80}
        />
        <StudentDetails form={form} onChange={field} />
        <FormField
          label="Location"
          value={form.location}
          onChangeText={(v) => field("location", v)}
          maxLength={80}
        />
        <Chips
          label="Timezone"
          value={form.timezone}
          onChange={(v) => field("timezone", v)}
          items={[
            "Asia/Kolkata",
            "Europe/London",
            "America/New_York",
            "America/Los_Angeles",
            "Australia/Sydney",
            "Asia/Dubai",
            "Etc/UTC",
          ]}
        />
        <FormField
          label="Next exam"
          value={form.exam_name}
          onChangeText={(v) => field("exam_name", v)}
          maxLength={100}
        />
        <FormField
          label="Exam date (YYYY-MM-DD)"
          value={form.exam_date}
          onChangeText={(v) => field("exam_date", v)}
          autoCapitalize="none"
          maxLength={10}
        />
        <FormField
          label="Questions per day (1–100)"
          value={form.daily_target}
          onChangeText={(v) => field("daily_target", v)}
          keyboardType="number-pad"
          maxLength={3}
        />
        <Button title="Save my profile" loading={busy} onPress={save} />
      </View>
      {user.is_guest ? (
        <View style={s.card}>
          <Text style={s.heading}>Bring your progress with you.</Text>
          <Text style={s.small}>
            Create an account to continue on any device. Registration keeps your
            guest progress. Signing in opens your existing account instead.
          </Text>
          <Button
            title="Create account"
            onPress={() => navigation.navigate("CreateAccount")}
          />
          <Button
            title="Log in"
            variant="secondary"
            onPress={() => navigation.navigate("Login")}
          />
        </View>
      ) : (
        <View style={s.card}>
          <Text style={s.heading}>Your progress is connected.</Text>
          <Text style={s.body}>{user.email}</Text>
          <Button
            title="Sign out"
            variant="secondary"
            disabled={busy}
            onPress={logout}
          />
        </View>
      )}
      <View style={s.card}>
        <Text style={s.heading}>Data & privacy</Text>
        <Button
          title="About Med Purple"
          variant="secondary"
          onPress={() => navigation.navigate("About")}
        />
        <Button
          title="Legal centre"
          variant="secondary"
          onPress={() => navigation.navigate("LegalCentre")}
        />
        <Button
          title="Privacy Policy"
          variant="secondary"
          onPress={() => navigation.navigate("Privacy")}
        />
        <Button
          title="Terms of Service"
          variant="secondary"
          onPress={() => navigation.navigate("Terms")}
        />
        <Button
          title={user.is_guest ? "Delete guest data" : "Delete my account"}
          variant="danger"
          onPress={remove}
        />
      </View>
      <Text style={[s.small, { textAlign: "center" }]}>
        © {new Date().getFullYear()} Med Purple
      </Text>
    </Screen>
  );
}
