import { db } from "../config/db";
import { logger } from "../config/logger";
import { specializations } from "./schema";

const specializationData = [
  {
    name: "General Practice",
    description: "Primary care and general health",
    iconName: "stethoscope",
  },
  {
    name: "Pediatrics",
    description: "Child and adolescent medicine",
    iconName: "baby",
  },
  {
    name: "Cardiology",
    description: "Heart and cardiovascular system",
    iconName: "heart-pulse",
  },
  {
    name: "Dermatology",
    description: "Skin, hair, and nail conditions",
    iconName: "scan-face",
  },
  {
    name: "Orthopedics",
    description: "Bones, joints, and muscles",
    iconName: "bone",
  },
  {
    name: "OB-GYN",
    description: "Women's reproductive health",
    iconName: "baby",
  },
  {
    name: "Neurology",
    description: "Brain and nervous system",
    iconName: "brain",
  },
  {
    name: "Ophthalmology",
    description: "Eye care and vision",
    iconName: "eye",
  },
  { name: "ENT", description: "Ear, nose, and throat", iconName: "ear" },
  {
    name: "Psychiatry",
    description: "Mental health and behavioral disorders",
    iconName: "brain-cog",
  },
];

const seed = async () => {
  logger.info("Seeding specializations...");
  await db
    .insert(specializations)
    .values(specializationData)
    .onConflictDoNothing();
  logger.info("Seeded 10 specializations.");
  process.exit(0);
};

seed().catch((err: unknown) => {
  logger.error({ err }, "Seed failed");
  process.exit(1);
});
