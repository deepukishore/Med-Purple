import React, { useEffect, useState } from "react";
import { View, Text, Alert, Pressable, Image, Modal, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { styles as s, colors } from "../theme";
import { api, mediaUrl, useApp } from "../context/AppContext";
import Screen from "../components/Screen";
import Button from "../components/Button";
import FormField from "../components/FormField";
import StudentDetails from "../components/StudentDetails";
import Chips from "../components/Chips";
import XPLevel from "../components/XPLevel";
import AvatarPicker from "../components/AvatarPicker";
import AvatarPortrait from "../components/AvatarPortrait";
import useData from "../hooks/useData";
import { defaultAvatarId } from "../../../shared/avatar-presets.js";
export default function ProfileScreen({ navigation }) {
  const { user, setUser, notify, changed, initialize } = useApp();
  const { data: featureState, reload: reloadFeatures } = useData("/features");
  const [form, setForm] = useState(null),
    [busy, setBusy] = useState(false),
    [avatarBusy, setAvatarBusy] = useState(false),
    [avatarId, setAvatarId] = useState(defaultAvatarId(user.id)),
    [photoUrl, setPhotoUrl] = useState(null),
    [avatarOpen, setAvatarOpen] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const { id, email, is_guest, ...rest } = user;
    setForm(rest);
  }, [user]);
  useEffect(() => {
    if (featureState) {
      setAvatarId(featureState.preferences?.avatar_id || defaultAvatarId(user.id));
      setPhotoUrl(featureState.preferences?.avatar_photo_url || null);
    }
  }, [featureState, user.id]);
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
  async function saveAvatar() {
    setAvatarBusy(true);
    setError("");
    try {
      const current = await api.get("/features");
      await api.patch("/features", { preferences: { ...(current.preferences || {}), avatar_id: avatarId } });
      if (photoUrl) {
        await api.delete("/profiles/me/avatar");
        setPhotoUrl(null);
      }
      reloadFeatures();
      notify("Your profile avatar is ready.");
      setAvatarOpen(false);
    } catch (e) {
      setError(e.message);
      notify(e.message);
    } finally {
      setAvatarBusy(false);
    }
  }
  async function choosePhoto() {
    setError("");
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        notify("Allow photo access to choose a profile picture.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        base64: true,
        quality: 0.72,
      });
      const asset = result.assets?.[0];
      if (result.canceled || !asset) return;
      if (!asset.base64) throw new Error("This photo could not be prepared. Choose another image.");
      const mime = asset.mimeType || "image/jpeg";
      if (!["image/jpeg", "image/png", "image/webp"].includes(mime))
        throw new Error("Choose a JPEG, PNG, or WebP photo.");
      setAvatarBusy(true);
      const saved = await api.put("/profiles/me/avatar", {
        data_url: `data:${mime};base64,${asset.base64}`,
      });
      setPhotoUrl(saved.avatar_photo_url);
      reloadFeatures();
      notify("Profile photo updated.");
      setAvatarOpen(false);
    } catch (e) {
      setError(e.message);
      notify(e.message);
    } finally {
      setAvatarBusy(false);
    }
  }
  async function removePhoto() {
    setAvatarBusy(true);
    setError("");
    try {
      await api.delete("/profiles/me/avatar");
      setPhotoUrl(null);
      reloadFeatures();
      notify("Profile photo removed.");
      setAvatarOpen(false);
    } catch (e) {
      setError(e.message);
      notify(e.message);
    } finally {
      setAvatarBusy(false);
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
      {!!error && !avatarOpen && (
        <Text accessibilityLiveRegion="polite" style={s.error}>
          {error}
        </Text>
      )}
      <XPLevel navigation={navigation} />
      <View style={[s.row, { padding: 14, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }]}>
        {photoUrl ? (
          <Image
            source={{ uri: `${mediaUrl}${photoUrl}` }}
            accessibilityLabel={`${user.name}'s profile photo`}
            style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: colors.line }}
          />
        ) : (
          <AvatarPortrait avatarId={avatarId} name={user.name} size={64} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={s.heading}>{user.name}</Text>
          <Text style={s.small}>{user.year}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit profile avatar"
          accessibilityHint="Opens photo and avatar choices"
          onPress={() => setAvatarOpen(true)}
          style={{ minHeight: 44, paddingHorizontal: 11, borderRadius: 11, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }}
        >
          <Ionicons name="pencil-outline" size={15} color={colors.purple[700]} />
          <Text style={{ fontFamily: "Manrope_700Bold", fontSize: 11, color: colors.purple[700] }}>Edit avatar</Text>
        </Pressable>
      </View>
      <Modal visible={avatarOpen} transparent animationType="fade" onRequestClose={() => setAvatarOpen(false)}>
        <View style={modalStyles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setAvatarOpen(false)} accessibilityLabel="Close avatar editor" />
          <View accessibilityViewIsModal style={modalStyles.panel}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Edit your avatar</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close avatar editor" onPress={() => setAvatarOpen(false)} style={modalStyles.close}>
                <Ionicons name="close" size={21} color={colors.ink} />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={modalStyles.content}>
              {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
              <View style={modalStyles.photoCard}>
                {photoUrl ? (
                  <Image source={{ uri: `${mediaUrl}${photoUrl}` }} accessibilityLabel="Current profile photo" style={modalStyles.photo} />
                ) : (
                  <AvatarPortrait avatarId={avatarId} name={user.name} size={48} interactive={false} />
                )}
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={modalStyles.photoTitle}>{photoUrl ? "Profile photo" : "Add a profile photo"}</Text>
                  <Text style={modalStyles.photoHint}>{photoUrl ? "Your photo appears on your profile." : "Choose a photo or an illustrated avatar below."}</Text>
                </View>
              </View>
              <View style={modalStyles.photoActions}>
                <Button title={photoUrl ? "Change photo" : "Add photo"} variant="secondary" loading={avatarBusy} onPress={choosePhoto} />
                {photoUrl && <Button title="Remove photo" variant="secondary" disabled={avatarBusy} onPress={removePhoto} />}
              </View>
              <View style={modalStyles.picker}>
                <AvatarPicker
                  value={avatarId}
                  onChange={setAvatarId}
                  saved={photoUrl ? null : featureState?.preferences?.avatar_id || defaultAvatarId(user.id)}
                  onSave={saveAvatar}
                  saving={avatarBusy}
                  compact
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: `${colors.purple[900]}99`,
  },
  panel: {
    width: "100%",
    maxWidth: 460,
    maxHeight: "92%",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
    backgroundColor: colors.surface,
    elevation: 18,
  },
  header: {
    minHeight: 54,
    paddingLeft: 16,
    paddingRight: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  title: { fontFamily: "Manrope_700Bold", color: colors.ink, fontSize: 15 },
  close: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.canvas,
  },
  content: { padding: 12, gap: 10 },
  photoCard: {
    minHeight: 68,
    padding: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  photo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.line,
  },
  photoTitle: { fontFamily: "Manrope_700Bold", fontSize: 11, color: colors.ink },
  photoHint: { fontFamily: "Manrope_400Regular", fontSize: 10, lineHeight: 14, color: colors.muted },
  photoActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  picker: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
});
