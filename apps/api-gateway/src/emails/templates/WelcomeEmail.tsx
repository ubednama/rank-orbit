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

export interface WelcomeEmailProps {
  email: string;
  appUrl: string;
}

export function WelcomeEmail({ email, appUrl }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to Rank Orbit — let's audit your first site</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={h1}>Welcome to Rank Orbit</Heading>
          <Text style={paragraph}>Hi {email.split("@")[0]},</Text>
          <Text style={paragraph}>
            Thanks for signing up. Your free tier includes <strong>3 SEO audits per month</strong>
            with the full Lighthouse report, AI insights, and audit history.
          </Text>

          <Section style={{ textAlign: "center", marginTop: 24 }}>
            <Button href={appUrl} style={button}>
              Run your first audit
            </Button>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            Sent because you created an account at Rank Orbit. If this wasn't you, ignore this email
            and the account will be removed automatically.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default WelcomeEmail;

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
