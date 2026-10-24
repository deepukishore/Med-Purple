import React from "react";
import StudyToolsScreen from "./StudyToolsScreen";
export default function SavedStudyScreen({ kind, ...props }) {
  return <StudyToolsScreen {...props} feature={kind} />;
}
