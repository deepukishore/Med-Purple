import React from "react";
import { View, Text, Image, Pressable } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "../theme";
import { useApp } from "../context/AppContext";
import { Skeleton, ErrorState } from "../components/States";
import HomeScreen from "../screens/HomeScreen";
import LearnScreen from "../screens/LearnScreen";
import MedBytesScreen from "../screens/MedBytesScreen";
import CommunityScreen from "../screens/CommunityScreen";
import DoubtsScreen from "../screens/DoubtsScreen";
import StudentsScreen from "../screens/StudentsScreen";
import AccountScreen from "../screens/AccountScreen";
import ProfileScreen from "../screens/ProfileScreen";
import MCQScreen from "../screens/MCQScreen";
import AnatomyScreen from "../screens/AnatomyScreen";
import PlannerScreen from "../screens/PlannerScreen";
import TutorScreen from "../screens/TutorScreen";
import ProgressScreen from "../screens/ProgressScreen";
import LecturesScreen from "../screens/LecturesScreen";
import ResourcesScreen from "../screens/ResourcesScreen";
import NotesScreen from "../screens/NotesScreen";
import FlashcardsScreen from "../screens/FlashcardsScreen";
import TermsScreen from "../screens/TermsScreen";
import PrivacyScreen from "../screens/PrivacyScreen";
import AboutScreen from "../screens/AboutScreen";
import LegalCentreScreen from "../screens/LegalCentreScreen";
import LegalScreen from "../screens/LegalScreen";
import ExamPrepScreen from "../screens/ExamPrepScreen";
import ClinicalScreen from "../screens/ClinicalScreen";
import StudyHubScreen from "../screens/StudyHubScreen";
import ToolboxScreen from "../screens/ToolboxScreen";
import PreferencesScreen from "../screens/PreferencesScreen";
import CapturesScreen from "../screens/CapturesScreen";
import NotFoundScreen from "../screens/NotFoundScreen";
const Stack = createNativeStackNavigator(),
  Tab = createBottomTabNavigator();
const screens = [
  ["Home", HomeScreen, "home-outline"],
  ["Learn", LearnScreen, "book-outline"],
  ["MedBytes", MedBytesScreen, "play-circle-outline"],
  ["Community", CommunityScreen, "people-outline"],
  ["Profile", ProfileScreen, "person-circle-outline"],
];
function Tabs() {
  const { user } = useApp();
  return (
    <Tab.Navigator
      screenOptions={({ navigation }) => ({
        headerStyle: { backgroundColor: colors.canvas },
        headerShadowVisible: false,
        headerTitle: () => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Med Purple Home"
            onPress={() => navigation.navigate("Home")}
            style={{ flexDirection: "row", alignItems: "center", gap: 9 }}
          >
            <Image
              source={require("../../assets/icon.png")}
              style={{ width: 31, height: 31, borderRadius: 10 }}
            />
            <Text
              style={{
                fontFamily: fonts.bold,
                fontSize: 19,
                color: colors.ink,
              }}
            >
              med<Text style={{ color: colors.purple[600] }}>purple</Text>
            </Text>
          </Pressable>
        ),
        headerRight: () => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Your profile"
            onPress={() => navigation.navigate("Profile")}
            style={{
              width: 44,
              height: 44,
              marginRight: 13,
              borderRadius: 22,
              backgroundColor: colors.purple[100],
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ fontFamily: fonts.bold, color: colors.purple[700] }}>
              {user?.name?.[0] || "M"}
            </Text>
          </Pressable>
        ),
        tabBarActiveTintColor: colors.purple[700],
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 10 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.purple[100],
          borderTopWidth: 1,
          minHeight: 74,
          paddingTop: 10,
          paddingBottom: 13,
          elevation: 14,
          shadowColor: colors.purple[900],
          shadowOpacity: 0.1,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: -5 },
        },
        animation: "fade",
        tabBarHideOnKeyboard: true,
      })}
    >
      {screens.map(([name, component, icon]) => (
        <Tab.Screen
          key={name}
          name={name}
          component={component}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={icon} color={color} size={size} />
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}
export default function RootNavigator() {
  const { user, loading, error, initialize } = useApp();
  if (loading) return <Skeleton />;
  if (error) return <ErrorState message={error} onRetry={initialize} />;
  return (
    <NavigationContainer
      theme={{
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: colors.canvas,
          card: colors.surface,
          text: colors.ink,
          primary: colors.purple[600],
          border: colors.line,
        },
      }}
    >
      <Stack.Navigator
        initialRouteName={user?.is_guest ? "Login" : "Main"}
        screenOptions={{
          headerStyle: { backgroundColor: colors.canvas },
          headerTintColor: colors.purple[700],
          headerTitleStyle: { fontFamily: fonts.bold },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.canvas },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen
          name="Main"
          component={Tabs}
          options={{ headerShown: false }}
        />
        {[
          ["Login", AccountScreen, "Log in"],
          ["CreateAccount", AccountScreen, "Create account"],
          ["MCQs", MCQScreen, "MCQ bank"],
          ["ExamPrep", ExamPrepScreen, "Exam prep"],
          ["Clinical", ClinicalScreen, "Clinical lab"],
          ["StudyTools", StudyHubScreen, "Study tools"],
          ["Toolbox", ToolboxScreen, "Reference toolbox"],
          ["Preferences", PreferencesScreen, "Personalize my desk"],
          ["Captures", CapturesScreen, "Capture inbox"],
          ["Anatomy", AnatomyScreen, "3D Anatomy"],
          ["Planner", PlannerScreen, "Study Planner"],
          ["Tutor", TutorScreen, "Study Coach"],
          ["Progress", ProgressScreen, "My Progress"],
          ["Doubts", DoubtsScreen, "Doubts"],
          ["Students", StudentsScreen, "Students"],
          ["Lectures", LecturesScreen, "Lectures"],
          ["Resources", ResourcesScreen, "Resources"],
          ["Notes", NotesScreen, "Notes"],
          ["Flashcards", FlashcardsScreen, "Flashcards"],
          ["Terms", TermsScreen, "Terms of Service"],
          ["Privacy", PrivacyScreen, "Privacy Policy"],
          ["About", AboutScreen, "About Med Purple"],
          ["LegalCentre", LegalCentreScreen, "Legal centre"],
          ["LegalPolicy", LegalScreen, "Med Purple policies"],
          ["NotFound", NotFoundScreen, "Page not found"],
        ].map(([name, component, title]) => (
          <Stack.Screen
            key={name}
            name={name}
            component={component}
            options={{ title }}
          />
        ))}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
