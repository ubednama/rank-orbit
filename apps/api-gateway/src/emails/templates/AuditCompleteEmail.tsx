import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface AuditCompleteEmailProps {
  /** Sanitized URL the user audited */
  url: string;
  /** Numeric SEO score from the AI analysis (0–100) */
  seoScore: number | null;
  /** One-line summary from the AI report */
  summary: string;
  /** Public link to the audit detail page */
  reportUrl: string;
}

export function AuditCompleteEmail({ url, seoScore, summary, reportUrl }: AuditCompleteEmailProps) {
  const scoreLabel = seoScore == null ? "—" : `${seoScore}/100`;

  return (
    <Html>
      <Head />
      <Preview>
        Your SEO audit for {url} is ready ({scoreLabel})
      </Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={h1}>Your audit is ready</Heading>
          <Text style={paragraph}>
            We finished analyzing <strong>{url}</strong>.
          </Text>

          <Section style={scoreBlock}>
            <Text style={scoreLabelStyle}>SEO score</Text>
            <Text style={scoreValueStyle}>{scoreLabel}</Text>
          </Section>

          <Text style={paragraph}>{summary}</Text>

          <Section style={{ textAlign: "center", marginTop: 24 }}>
            <Button href={reportUrl} style={button}>
              View full report
            </Button>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            You're receiving this because you ran an audit on Rank Orbit. To stop receiving these,
            sign in and disable email notifications in account settings.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default AuditCompleteEmail;

// ---------- styles ----------
const body: React.CSSProperties = {
  backgroundColor: "#f6f6f7",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};

const container: React.CSSProperties = {
  maxWidth: 560,
  margin: "0 auto",
  padding: "32px 24px",
  backgroundColor: "#ffffff",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
};

const h1: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 700,
  color: "#111827",
  margin: "0 0 16px",
};

const paragraph: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.6,
  color: "#374151",
  margin: "0 0 16px",
};

const scoreBlock: React.CSSProperties = {
  backgroundColor: "#eef2ff",
  borderRadius: 8,
  padding: 24,
  textAlign: "center",
  margin: "16px 0",
};

const scoreLabelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#6366f1",
  textTransform: "uppercase",
  letterSpacing: 1,
  margin: 0,
};

const scoreValueStyle: React.CSSProperties = {
  fontSize: 40,
  fontWeight: 800,
  color: "#4338ca",
  margin: "4px 0 0",
};

const button: React.CSSProperties = {
  backgroundColor: "#4f46e5",
  color: "#ffffff",
  fontWeight: 600,
  fontSize: 15,
  padding: "12px 24px",
  borderRadius: 6,
  textDecoration: "none",
  display: "inline-block",
};

const hr: React.CSSProperties = {
  border: "none",
  borderTop: "1px solid #e5e7eb",
  margin: "32px 0 16px",
};

const footer: React.CSSProperties = {
  fontSize: 12,
  color: "#9ca3af",
  lineHeight: 1.5,
  margin: 0,
};
