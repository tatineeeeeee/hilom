export interface Medication {
  id: string;
  prescriptionId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string | null;
}

export interface Prescription {
  id: string;
  appointmentId: string;
  doctorId: string;
  patientId: string;
  notes: string | null;
  createdAt: string;
  doctorName: string;
  patientName: string;
  medications: Medication[];
}

export interface PrescriptionListItem {
  id: string;
  appointmentId: string;
  appointmentDate: string;
  otherPartyName: string;
  medicationCount: number;
  createdAt: string;
}

export interface WritePrescriptionInput {
  notes?: string;
  medications: MedicationInput[];
}

export interface MedicationInput {
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export const emptyMedication = (): MedicationInput => ({
  medicationName: "",
  dosage: "",
  frequency: "",
  duration: "",
  instructions: "",
});
