import React from "react";
import { View, Text, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles as s, colors, fonts } from "../theme";
import Button from "./Button";
export default function QuestionCard({
  q,
  index,
  total,
  selected,
  onSelect,
  result,
  onSubmit,
  onNext,
  onBookmark,
  pending,
  bookmarkPending,
}) {
  return (
    <View style={s.card}>
      <View style={s.between}>
        <View style={s.pill}>
          <Text style={s.pillText}>
            {q.subject} / {q.difficulty}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            q.bookmarked ? "Remove bookmark" : "Bookmark question"
          }
          accessibilityState={{ selected: q.bookmarked }}
          disabled={bookmarkPending}
          hitSlop={8}
          onPress={onBookmark}
          style={{
            minWidth: 44,
            minHeight: 44,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name={q.bookmarked ? "bookmark" : "bookmark-outline"}
            size={24}
            color={colors.purple[600]}
          />
        </Pressable>
      </View>
      <Text style={s.small}>
        Question {index + 1} of {total} / {q.topic}
      </Text>
      <Text
        style={[s.heading, { fontSize: 19, lineHeight: 29, marginVertical: 9 }]}
      >
        {q.stem}
      </Text>
      <View style={{ gap: 12 }}>
        {q.options.map((option, i) => {
          const correct = result && i === result.correct_index,
            incorrect =
              result && i === result.selected_index && !result.correct;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{
                selected: selected === i,
                disabled: !!result || pending,
              }}
              disabled={!!result || pending}
              onPress={() => onSelect(i)}
              style={{
                borderRadius: 12,
                borderWidth: 1,
                padding: 15,
                minHeight: 62,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                borderColor: correct
                  ? colors.success
                  : incorrect
                    ? colors.danger
                    : selected === i
                      ? colors.purple[600]
                      : colors.line,
                backgroundColor: correct
                  ? colors.successTint
                  : incorrect
                    ? colors.dangerTint
                    : selected === i
                      ? colors.purple[50]
                      : colors.surface,
              }}
            >
              <Text
                style={[
                  s.small,
                  { fontFamily: fonts.bold, color: colors.purple[700] },
                ]}
              >
                {String.fromCharCode(65 + i)}
              </Text>
              <Text style={[s.body, { fontSize: 14, lineHeight: 22, flex: 1 }]}>
                {option}
              </Text>
              {correct && (
                <Ionicons
                  name="checkmark-circle"
                  color={colors.success}
                  size={20}
                />
              )}
            </Pressable>
          );
        })}
      </View>
      {result && (
        <View
          accessibilityLiveRegion="polite"
          style={{
            padding: 17,
            gap: 10,
            backgroundColor: colors.purple[50],
            borderRadius: 12,
            marginTop: 6,
          }}
        >
          <Text style={s.heading}>
            {result.correct ? "That’s right." : "A useful one to remember."}
          </Text>
          <Text style={s.pillText}>
            Answer key: {String.fromCharCode(65 + result.correct_index)}.{" "}
            {q.options[result.correct_index]}
          </Text>
          <Text style={s.small}>{result.explanation}</Text>
          <Button
            title="Read the source"
            variant="secondary"
            onPress={() => Linking.openURL(result.source_url)}
          />
        </View>
      )}
      <Button
        title={
          result
            ? index + 1 === total
              ? "Finish session"
              : "Next question"
            : "Check answer"
        }
        loading={pending}
        disabled={!result && selected === null}
        onPress={result ? onNext : onSubmit}
      />
    </View>
  );
}
