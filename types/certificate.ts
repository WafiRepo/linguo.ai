import type { CurriculumPart } from "@/constants/curriculumParts";

export interface Certificate {
  certificateNo: string;
  part: CurriculumPart;
  studentName: string;
  courseTitle: string;
  completedAt: string;
  issuedAt: string;
}

export interface PartCertificateStatus {
  part: CurriculumPart;
  /** Topics with both Latihan and Role Play finished. */
  topicsDone: number;
  topicsTotal: number;
  certificate: Certificate | null;
}

/** GET /api/certificates */
export interface CertificatesResponse {
  parts: PartCertificateStatus[];
}
