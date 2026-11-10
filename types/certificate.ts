import type { CertificateKind } from "@/constants/curriculumParts";

export interface Certificate {
  certificateNo: string;
  part: CertificateKind;
  studentName: string;
  courseTitle: string;
  completedAt: string;
  issuedAt: string;
}

export interface PartCertificateStatus {
  part: CertificateKind;
  /** Topics with both Latihan and Role Play finished. */
  topicsDone: number;
  topicsTotal: number;
  certificate: Certificate | null;
}

/** GET /api/certificates */
export interface CertificatesResponse {
  parts: PartCertificateStatus[];
}
