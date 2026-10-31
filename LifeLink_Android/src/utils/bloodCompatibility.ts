// src/utils/bloodCompatibility.ts

const COMPATIBLE_DONORS_FOR_RECIPIENT: Record<string, string[]> = {
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'O+': ['O+', 'O-'],
  'O-': ['O-'],
};

export function isDonorCompatible(donorGroup?: string, recipientGroup?: string): boolean {
  if (!donorGroup || !recipientGroup) return false;
  const allowed = COMPATIBLE_DONORS_FOR_RECIPIENT[recipientGroup];
  return allowed ? allowed.includes(donorGroup) : donorGroup === recipientGroup;
}
