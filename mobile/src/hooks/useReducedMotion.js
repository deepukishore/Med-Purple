import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
export default function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduce,
    );
    return () => subscription.remove();
  }, []);
  return reduce;
}
