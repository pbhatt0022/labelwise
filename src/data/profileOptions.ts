import type { AllergyOption, DietOption, HealthOption, SensitivityOption } from "@/lib/types";

export const allergyOptions: { label: AllergyOption }[] = [
  { label: "Milk" },
  { label: "Gluten" },
  { label: "Nuts" },
  { label: "Soy" },
  { label: "Eggs" },
  { label: "Shellfish" },
];

export const healthOptions: { label: HealthOption }[] = [
  { label: "Diabetes" },
  { label: "High BP" },
  { label: "Cholesterol" },
];

export const dietOptions: { label: DietOption }[] = [
  { label: "Vegan" },
  { label: "Vegetarian" },
  { label: "Low Sodium" },
  { label: "Keto" },
];

export const sensitivityOptions: { label: SensitivityOption }[] = [
  { label: "MSG" },
  { label: "Artificial Sweeteners" },
  { label: "Preservatives" },
];
