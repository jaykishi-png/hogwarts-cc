// ─── Transcript Template Config ────────────────────────────────────────────
// Footer placeholders to add to each template doc's footer:
//   {{COURSE_TITLE}} || {{COURSE_LEVEL}}
//   Module {{MODULE_NUM}} | Lesson {{LESSON_NUM}}
//   {{LESSON_TITLE}}
//
// Body placeholder (styled with your desired font/color/size in the template):
//   {{BODY_COPY}}

export interface TranscriptTemplate {
  key:         string
  label:       string
  courseTitle: string
  templateId:  string
}

export const TRANSCRIPT_TEMPLATES: TranscriptTemplate[] = [
  { key: 'AB1', label: 'AB1',  courseTitle: 'AB1 Course',                    templateId: '1ZqNDcsc6T2lXTaRJc7O3FbJiPyZGUF3AXswNZlDSMz8' },
  { key: 'JM1', label: 'JM1 — Amazon Ads Optimization', courseTitle: 'Amazon Ads Optimization', templateId: '1XTbKQhk_DPkZQlF9Ho-k-hQ5cEyAvBUdmGYTa4g1MMY' },
  { key: 'JM2', label: 'JM2 — Google Ads Optimization', courseTitle: 'Google Ads Optimization', templateId: '1bO4dJpU7ndz8Rg65GhRC2NsZ8TIaDgDWKIF6YfZvvC8' },
  { key: 'KM1', label: 'KM1',  courseTitle: 'KM1 Course',                    templateId: '1e9gJy25dNyccAQXib37oDnwJ2gDJvkErzOV0nwvNdo4' },
  { key: 'KM2', label: 'KM2 — Convert With Reviews',    courseTitle: 'Convert With Reviews',    templateId: '1ISIYJpDgDcG3oxR9b1wiIolrruyNCCj1MJP0x0HcMKA' },
  { key: 'ME1', label: 'ME1 — Direct Mail Marketing',   courseTitle: 'Direct Mail Marketing',   templateId: '1ELBy4Razfkz7fZb5eyzNFm7XR_dsMyEM_YCJARcOs6o' },
  { key: 'ME2', label: 'ME2 — Direct Mail Marketing',   courseTitle: 'Direct Mail Marketing',   templateId: '1ELBy4Razfkz7fZb5eyzNFm7XR_dsMyEM_YCJARcOs6o' },
  { key: 'MG1', label: 'MG1',  courseTitle: 'MG1 Course',                    templateId: '1RLYlS9IPGjbfc1UOAIX01STGSwn2GsDz97_J9FU9ypA' },
  { key: 'MG2', label: 'MG2',  courseTitle: 'MG2 Course',                    templateId: '1RLYlS9IPGjbfc1UOAIX01STGSwn2GsDz97_J9FU9ypA' },
  { key: 'MH1', label: 'MH1 — Customer Service & Retention', courseTitle: 'Customer Service & Retention', templateId: '1cIZk63wLDITq4YAFfQCwY-S7OfbUUbm17pSGnBIIU0E' },
  { key: 'MH2', label: 'MH2 — Customer Retention',      courseTitle: 'Customer Retention',      templateId: '1voLIKcR6rwlXY_z30l-JRU86EpBRTO2it5p3ICtzFao' },
  { key: 'MJ1', label: 'MJ1 — Email Marketing Strategy', courseTitle: 'Email Marketing Strategy', templateId: '1Pueyn3PSoU8lzkl7jBOpSlFtob2qfXFQqJSRTnVksPU' },
  { key: 'MJ2', label: 'MJ2 — Email Marketing Strategy', courseTitle: 'Email Marketing Strategy', templateId: '1Pueyn3PSoU8lzkl7jBOpSlFtob2qfXFQqJSRTnVksPU' },
  { key: 'ZR1', label: 'ZR1 — Launching Email Campaigns', courseTitle: 'Launching Email Campaigns', templateId: '1ahF_6dQ9wzgbpEejECqhr2lAsiSWALxGfgJR-1RhSLc' },
  { key: 'ZR2', label: 'ZR2 — Launching Email Campaigns', courseTitle: 'Launching Email Campaigns', templateId: '1ahF_6dQ9wzgbpEejECqhr2lAsiSWALxGfgJR-1RhSLc' },
]
