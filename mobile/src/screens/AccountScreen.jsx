import React, { useState } from "react";
import { View, Text } from "react-native";
import { styles as s } from "../theme";
import { api, useApp } from "../context/AppContext";
import Screen from "../components/Screen";
import FormField from "../components/FormField";
import StudentDetails from "../components/StudentDetails";
import Button from "../components/Button";
export default function AccountScreen({ navigation, route }) {
  const register = route.name === "CreateAccount";
  const { user, setUser, changed, notify } = useApp();
  const [step, setStep] = useState(1),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [show, setShow] = useState(false);
  const [auth, setAuth] = useState({
    name: user.name === "Student" ? "" : user.name,
    email: "",
    password: "",
    confirm: "",
  });
  const [profile, setProfile] = useState(() => {
    const { id, email, is_guest, ...values } = user;
    return values;
  });
  const field = (key, value) => setAuth((old) => ({ ...old, [key]: value }));
  async function submit() {
    if (busy) return;
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(auth.email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (!auth.password || (register && auth.password.length < 10)) {
      setError(
        "Enter your password. New passwords need at least 10 characters.",
      );
      return;
    }
    if (register && (!auth.name.trim() || auth.password !== auth.confirm)) {
      setError(
        !auth.name.trim() ? "Enter your name." : "Your passwords do not match.",
      );
      return;
    }
    if (register && step === 1) {
      setStep(2);
      return;
    }
    const graduation =
      profile.graduation_year === "" || profile.graduation_year == null
        ? null
        : Number(profile.graduation_year);
    if (
      register &&
      graduation !== null &&
      (!Number.isInteger(graduation) || graduation < 1950 || graduation > 2100)
    ) {
      setError(
        "Enter a graduation year between 1950 and 2100, or leave it blank.",
      );
      return;
    }
    setBusy(true);
    try {
      const updated = register
        ? await api.register({
            name: auth.name.trim(),
            email: auth.email.trim(),
            password: auth.password,
            profile: {
              ...profile,
              name: auth.name.trim(),
              graduation_year: graduation,
            },
          })
        : await api.login(auth.email.trim(), auth.password);
      setUser(updated);
      changed();
      notify(
        register
          ? "Account created. Your guest progress came with you."
          : "Welcome back.",
      );
      navigation.reset({
        index: 0,
        routes: [
          { name: "Main", params: { screen: register ? "Profile" : "Home" } },
        ],
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (!user.is_guest)
    return (
      <Screen>
        <Text style={s.title}>You're already signed in.</Text>
        <Button
          title="Open my profile"
          onPress={() => navigation.navigate("Main", { screen: "Profile" })}
        />
      </Screen>
    );
  return (
    <Screen>
      <Text style={s.pillText}>
        {register ? `STEP ${step} OF 2` : "YOUR STUDY SPACE AWAITS"}
      </Text>
      <Text style={s.title}>
        {register
          ? step === 1
            ? "Make yourself at home."
            : "Your student journey."
          : "Good to see you again."}
      </Text>
      <Text style={s.subtitle}>
        {register
          ? "An account for your notes, recall cards, and little wins."
          : "Log in to pick up where you left off."}
      </Text>
      {!!error && (
        <Text style={s.error} accessibilityRole="alert">
          {error}
        </Text>
      )}
      <View style={s.card}>
        {step === 1 ? (
          <>
            {register && (
              <FormField
                label="Full name"
                value={auth.name}
                onChangeText={(v) => field("name", v)}
                autoComplete="name"
                maxLength={80}
                editable={!busy}
              />
            )}
            <FormField
              label="Email address"
              value={auth.email}
              onChangeText={(v) => field("email", v)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              maxLength={254}
              editable={!busy}
            />
            <FormField
              label={
                register ? "Password (at least 10 characters)" : "Password"
              }
              value={auth.password}
              onChangeText={(v) => field("password", v)}
              secureTextEntry={!show}
              autoCapitalize="none"
              autoComplete={register ? "new-password" : "current-password"}
              maxLength={128}
              editable={!busy}
            />
            {register && (
              <FormField
                label="Confirm password"
                value={auth.confirm}
                onChangeText={(v) => field("confirm", v)}
                secureTextEntry={!show}
                autoCapitalize="none"
                autoComplete="new-password"
                maxLength={128}
                editable={!busy}
              />
            )}
            <Button
              title={show ? "Hide password" : "Show password"}
              variant="secondary"
              onPress={() => setShow(!show)}
            />
          </>
        ) : (
          <>
            <Text style={s.small}>
              College and specialty details are optional. Update your exam plans
              and goals in Profile anytime.
            </Text>
            <StudentDetails
              form={profile}
              onChange={(key, value) =>
                setProfile((old) => ({ ...old, [key]: value }))
              }
            />
          </>
        )}
        {register && step === 2 && (
          <Text style={s.small}>
            By creating your account, you agree to the Terms and acknowledge the
            Privacy Policy.
          </Text>
        )}
        <Button
          title={
            register
              ? step === 1
                ? "Continue to student profile"
                : "Create my account"
              : "Log in"
          }
          loading={busy}
          onPress={submit}
        />
        {step === 2 && (
          <Button
            title="Back to account details"
            variant="secondary"
            disabled={busy}
            onPress={() => setStep(1)}
          />
        )}
      </View>
      <Text style={s.small}>
        {register
          ? "Creating an account keeps your current guest progress."
          : "Logging in opens your existing account; guest progress stays separate."}
      </Text>
      <Button
        title={
          register
            ? "Already have an account? Log in"
            : "New here? Create account"
        }
        variant="secondary"
        disabled={busy}
        onPress={() => navigation.replace(register ? "Login" : "CreateAccount")}
      />
      <Button
        title="Continue as a guest"
        variant="secondary"
        disabled={busy}
        onPress={() => navigation.navigate("Main", { screen: "Home" })}
      />
      <View style={[s.row, { flexWrap: "wrap" }]}>
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
          title="Terms"
          variant="secondary"
          onPress={() => navigation.navigate("Terms")}
        />
        <Button
          title="Privacy"
          variant="secondary"
          onPress={() => navigation.navigate("Privacy")}
        />
      </View>
    </Screen>
  );
}
