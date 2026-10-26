const male = [
  ["#F3C9A9", "#C58B65", "#3E251E", "#8150B8", "short", true, "You got this!"],
  ["#DDA782", "#A96F4F", "#241B1A", "#51317D", "curl", false, "Hey, study star!"],
  ["#C9865D", "#925D42", "#17191E", "#A878D7", "fade", true, "Keep going!"],
  ["#F1C6A0", "#BF8764", "#9A633B", "#7139AB", "part", false, "Good to see you!"],
  ["#AE704F", "#80513E", "#171616", "#592A8D", "afro", true, "Ready to learn?"],
  ["#E9B894", "#B87D5A", "#D3A45D", "#8C50C5", "wave", false, "Big brain energy!"],
  ["#87543E", "#62402F", "#1F1B1B", "#432166", "crop", true, "One step at a time."],
  ["#F4D1B0", "#C89673", "#5A382A", "#7139AB", "swept", false, "Let's make it click!"],
  ["#D59B73", "#9C684D", "#33221F", "#8C50C5", "curl", true, "You're doing great!"],
  ["#A9694C", "#754934", "#151515", "#592A8D", "fade", false, "Hello, future doc!"],
];

const female = [
  ["#F2C6A5", "#C28A67", "#4B2D24", "#8150B8", "long", false, "You got this!"],
  ["#DDA782", "#A96F4F", "#211819", "#51317D", "braid", false, "Hey, study star!"],
  ["#C9865D", "#925D42", "#17191E", "#A878D7", "curl", false, "Keep going!"],
  ["#F1C6A0", "#BF8764", "#9A633B", "#7139AB", "bob", false, "Good to see you!"],
  ["#AE704F", "#80513E", "#171616", "#592A8D", "afro", false, "Ready to learn?"],
  ["#E9B894", "#B87D5A", "#D3A45D", "#8C50C5", "bun", false, "Big brain energy!"],
  ["#87543E", "#62402F", "#1F1B1B", "#432166", "long", false, "One step at a time."],
  ["#F4D1B0", "#C89673", "#5A382A", "#7139AB", "bob", false, "Let's make it click!"],
  ["#D59B73", "#9C684D", "#33221F", "#8C50C5", "braid", false, "You're doing great!"],
  ["#A9694C", "#754934", "#151515", "#592A8D", "curl", false, "Hello, future doc!"],
];

function makePreset([skin, skinShadow, hair, shirt, hairstyle, beard, greeting], gender, index) {
  return {
    id: `${gender}-${String(index + 1).padStart(2, "0")}`,
    gender,
    skin,
    skinShadow,
    skinLight: "#FFE3C8",
    hair,
    hairLight: "#ffffff",
    shirt,
    hairstyle,
    beard,
    greeting,
  };
}

export const AVATARS = [
  ...male.map((preset, index) => makePreset(preset, "male", index)),
  ...female.map((preset, index) => makePreset(preset, "female", index)),
];

export function getAvatar(id) {
  return AVATARS.find((avatar) => avatar.id === id) || AVATARS[0];
}

export function defaultAvatarId(seed = "") {
  let hash = 0;
  for (const character of String(seed)) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return AVATARS[hash % AVATARS.length].id;
}
