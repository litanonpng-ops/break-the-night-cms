import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
} from "@react-email/components";
import { emailTheme } from "@/components/email/theme";

export const CollaboratorAddedEmailTemplate = ({
  email,
  repoName,
  repoUrl,
  invitedByName,
  invitedByUrl,
}: {
  email: string;
  repoName: string;
  repoUrl: string;
  invitedByName: string;
  invitedByUrl: string;
}) => {
  return (
    <Html>
      <Head />
      <Preview>
        You were added to &quot;{repoName}&quot; on Presskit Editor
      </Preview>
      <Tailwind>
        <Body
          className="my-auto mx-auto font-sans px-2 antialiased"
          style={{
            backgroundColor: emailTheme.background,
            color: emailTheme.foreground,
          }}
        >
          <Container className="my-[40px] mx-auto p-[20px] max-w-[465px]">
            <Heading
              className="text-[24px] font-semibold p-0 my-[30px] mx-0 text-center tracking-tight"
              style={{ color: emailTheme.foreground }}
            >
              You were added to &quot;{repoName}&quot;
            </Heading>
            <Text
              className="text-[16px] leading-[24px]"
              style={{ color: emailTheme.foreground }}
            >
              <Link
                href={invitedByUrl}
                className="underline rounded-md"
                style={{ color: emailTheme.link }}
              >
                {invitedByName}
              </Link>{" "}
              added you to the &quot;{repoName}&quot; project on Presskit Editor.
              You already have access, so there is nothing to accept.
            </Text>
            <Section className="text-center mt-[24px] mb-[24px]">
              <Button
                className="rounded-lg text-[14px] font-medium no-underline text-center px-5 py-3"
                href={repoUrl}
                style={{
                  backgroundColor: emailTheme.buttonBackground,
                  border: `1px solid ${emailTheme.buttonBorder}`,
                  color: emailTheme.buttonForeground,
                }}
              >
                Open &quot;{repoName}&quot;
              </Button>
            </Section>
            <Text
              className="text-[14px] leading-[24px] mt-[36px]"
              style={{ color: emailTheme.mutedForeground }}
            >
              This email was intended for{" "}
              <Link
                href={`mailto:${email}`}
                className="underline"
                style={{ color: emailTheme.mutedLink }}
              >
                {email}
              </Link>
              .
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};
