import { File, Paths } from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { COURSE_TITLE, PART_TITLES } from "@/constants/curriculumParts";
import { STORY } from "@/data/teamStory";
import { apiUrl } from "@/lib/api";
import { Certificate, CertificatesResponse } from "@/types/certificate";

// Digital Certificate: load from the API, turn into a PDF on the phone.
type GetToken = () => Promise<string | null>;

export async function fetchCertificates(getToken: GetToken): Promise<CertificatesResponse> {
  const token = await getToken();
  if (!token) throw new Error("Not signed in");
  const res = await fetch(apiUrl("/api/certificates"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Load failed (${res.status})`);
  return res.json();
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

function formatDates(iso: string) {
  const date = new Date(iso);
  return {
    zh: `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`,
    en: date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
  };
}

/** Landscape A4 certificate; the same bilingual layout for every app language. */
export function certificateHtml(certificate: Certificate): string {
  const part = PART_TITLES[certificate.part];
  const date = formatDates(certificate.completedAt);
  const name = escapeHtml(certificate.studentName);

  return `<!doctype html>
<html><head><meta charset="utf-8" />
<style>
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 297mm; height: 210mm; }
  body { font-family: "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif; color: #1f1f2e; background: #fff; }
  .page { width: 297mm; height: 210mm; padding: 12mm; }
  .frame { height: 100%; border: 2.5mm solid #6c4ef5; border-radius: 6mm; padding: 4mm; }
  .inner { height: 100%; border: 0.6mm solid #c9b8ff; border-radius: 3mm; padding: 14mm 22mm 12mm;
           display: flex; flex-direction: column; align-items: center; text-align: center; }
  .eyebrow { font-size: 11pt; letter-spacing: 3pt; color: #6c4ef5; text-transform: uppercase; }
  h1 { font-size: 30pt; color: #4a32c9; margin-top: 3mm; letter-spacing: 4pt; }
  .h1-en { font-size: 14pt; color: #5b3bf6; margin-top: 1mm; }
  .lead { font-size: 12pt; color: #555; margin-top: 9mm; }
  .name { font-size: 30pt; font-weight: 700; margin-top: 3mm; padding: 0 12mm 2mm; border-bottom: 0.5mm solid #c9b8ff; }
  .course { font-size: 15pt; font-weight: 700; color: #4a32c9; margin-top: 4mm; }
  .course-en { font-size: 11pt; color: #555; margin-top: 1mm; }
  .date { font-size: 11pt; color: #555; margin-top: 6mm; }
  .footer { margin-top: auto; width: 100%; display: flex; justify-content: space-between; align-items: flex-end; }
  .org { width: 44%; text-align: left; font-size: 9.5pt; color: #444; line-height: 1.45; }
  .org.right { text-align: right; }
  .org .label { color: #6c4ef5; font-size: 8.5pt; letter-spacing: 1pt; }
  .no { font-size: 9pt; color: #777; margin-top: 5mm; letter-spacing: 0.5pt; }
</style></head>
<body><div class="page"><div class="frame"><div class="inner">
  <div class="eyebrow">Certificate of Completion</div>
  <h1>結業證書</h1>
  <div class="h1-en">Sertifikat Penyelesaian</div>
  <div class="lead">茲證明 &nbsp;/&nbsp; This certifies that</div>
  <div class="name">${name}</div>
  <div class="lead">已完成 &nbsp;/&nbsp; has successfully completed</div>
  <div class="course">${COURSE_TITLE.zh} · ${part.zh}</div>
  <div class="course-en">${COURSE_TITLE.en} · ${part.en}</div>
  <div class="date">完成日期 ${date.zh} &nbsp;/&nbsp; Completed on ${date.en}</div>
  <div class="footer">
    <div class="org">
      <div class="label">計畫執行單位 · IMPLEMENTED BY</div>
      ${STORY.implementation.zhName}<br />${STORY.implementation.enName}
    </div>
    <div class="org right">
      <div class="label">經費支持單位 · FUNDED BY</div>
      ${STORY.funding.zhName}<br />${STORY.funding.enName}
    </div>
  </div>
  <div class="no">證書編號 Certificate No. ${escapeHtml(certificate.certificateNo)}</div>
</div></div></div></body></html>`;
}

const PAGE = { width: 842, height: 595 }; // A4 landscape in points

/** Writes the PDF to the cache as e.g. "Certificate-BI-A-7K3QX9MP.pdf". */
async function makeCertificatePdf(certificate: Certificate): Promise<string> {
  const { uri } = await Print.printToFileAsync({ html: certificateHtml(certificate), ...PAGE });
  const named = new File(Paths.cache, `Certificate-${certificate.certificateNo}.pdf`);
  if (named.exists) named.delete();
  new File(uri).move(named);
  return named.uri;
}

/** Opens the system print dialog with the finished (landscape) PDF. */
export async function printCertificate(certificate: Certificate) {
  // Printing the PDF file, not the HTML, keeps the page landscape on Android.
  await Print.printAsync({ uri: await makeCertificatePdf(certificate) });
}

/** Makes the PDF file and opens the share sheet (save to Files, LINE, email…). */
export async function shareCertificatePdf(certificate: Certificate) {
  const uri = await makeCertificatePdf(certificate);
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle: certificate.certificateNo,
  });
}
