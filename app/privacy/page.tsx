import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import logo from "@/img/new-logo.png";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for the FLENVN Translator browser extension.",
  alternates: {
    canonical: "/privacy",
  },
};

const permissions = [
  {
    name: "activeTab",
    purpose: "Access the current tab after you invoke FLENVN from the toolbar.",
  },
  {
    name: "contextMenus",
    purpose: "Provide the “Translate with FLENVN” menu for selected text.",
  },
  {
    name: "scripting",
    purpose: "Load the translation interface into the active webpage when requested.",
  },
  {
    name: "storage",
    purpose: "Store authentication tokens, your selected language, profile summary, and default book.",
  },
  {
    name: "api.flenvn.app",
    purpose: "Send authenticated requests to the FLENVN service.",
  },
  {
    name: "Website access",
    purpose: "Detect selections and show the FLENVN action on regular HTTP and HTTPS webpages.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-page-sm items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="FLENVN home">
            <Image src={logo} alt="FLENVN logo" className="size-12" priority />
            <Text as="span" size="xl" weight="bold">
              FLENVN
            </Text>
          </Link>
          <Button
            render={<Link href="/support" />}
            nativeButton={false}
            variant="outline"
          >
            Support
          </Button>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <Button
          render={<Link href="/" />}
          nativeButton={false}
          variant="ghost"
          className="mb-8 -ml-3"
        >
          <Icon icon={ArrowLeft} />
          Back to home
        </Button>

        <div className="flex items-center gap-3 text-primary">
          <Icon icon={ShieldCheck} className="size-8" weight="duotone" />
          <Text as="span" weight="bold" tone="primary">
            FLENVN Translator
          </Text>
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          Privacy Policy
        </h1>
        <Text className="mt-3" tone="muted">
          Effective September 5, 2026
        </Text>

        <div className="mt-10 space-y-10 text-[15px] leading-7 text-foreground">
          <PolicySection title="Overview">
            <p>
              This policy explains how the FLENVN Translator browser extension
              collects, uses, stores, and shares information. The extension helps
              signed-in users translate selected webpage text, explain a selected
              word in context, and save vocabulary to a FLENVN account.
            </p>
          </PolicySection>

          <PolicySection title="Information we process">
            <ul>
              <li>
                <strong>Selected text and context.</strong> When you request a
                translation, the extension processes the text you selected. For a
                selected word, it also processes the surrounding sentence and the
                word&apos;s position in that sentence so FLENVN can explain the
                correct meaning in context.
              </li>
              <li>
                <strong>Account and authentication data.</strong> Your email and
                password are sent to <code>api.flenvn.app</code> when you sign in.
                The extension does not store your password. It stores an access
                token in Chrome session storage and a refresh token in Chrome local
                storage. It may also store a limited profile summary.
              </li>
              <li>
                <strong>Preferences.</strong> The extension stores your target
                language and the book you last chose for saving vocabulary.
              </li>
              <li>
                <strong>Saved vocabulary.</strong> When you choose Save, FLENVN
                stores the word, definition, translation, example, pronunciation,
                selected image or audio URL, and chosen book in your account.
              </li>
              <li>
                <strong>Service data.</strong> Our servers and infrastructure may
                process standard request information such as timestamps, endpoint,
                response status, IP address, and error details for security,
                reliability, and abuse prevention.
              </li>
            </ul>
            <p>
              Selecting text alone does not send it to FLENVN. The extension sends
              it only after you click the FLENVN translation action or use the
              FLENVN context-menu command. It does not send the webpage URL or title
              with a translation request.
            </p>
          </PolicySection>

          <PolicySection title="How we use information">
            <p>We use the information described above to:</p>
            <ul>
              <li>authenticate your account and keep your session active;</li>
              <li>translate selected text and explain words in context;</li>
              <li>display your books and save vocabulary when you request it;</li>
              <li>remember extension preferences; and</li>
              <li>protect, troubleshoot, and maintain the FLENVN service.</li>
            </ul>
            <p>
              We do not sell extension data, use it for advertising, or use it to
              determine creditworthiness. We use extension data only to provide,
              secure, and maintain the user-facing FLENVN translation and
              vocabulary features.
            </p>
          </PolicySection>

          <PolicySection title="Where information is sent">
            <p>
              Extension API requests are sent over HTTPS to
              <code> https://api.flenvn.app</code>. FLENVN uses service providers
              to perform parts of the requested feature, including Amazon Web
              Services for translation and hosting and Google Vertex AI for
              contextual word explanations. Those providers process request data
              on our behalf under their applicable data-protection terms. Images
              and pronunciation audio returned by FLENVN may be loaded from secure
              third-party media hosts.
            </p>
            <p>
              We may also disclose information when legally required or when
              necessary to protect users, FLENVN, or the public. We do not transfer
              data to unrelated parties for their own advertising or marketing.
            </p>
          </PolicySection>

          <PolicySection title="Storage and retention">
            <ul>
              <li>
                Selected text and its surrounding sentence remain in the webpage
                memory only as needed to show the translation interface. The
                extension does not save this selection to Chrome storage.
              </li>
              <li>
                Translation and contextual-explanation input is retained only as
                needed to complete the request. If temporarily retained in
                operational or security records, it is deleted within 30 days.
              </li>
              <li>
                The access token remains in Chrome session storage for the browser
                session. The refresh token, profile summary, and default book remain
                in Chrome local storage until you sign out, clear extension data,
                or uninstall the extension. Your target-language preference remains
                until you clear extension data or uninstall the extension.
              </li>
              <li>
                Saved vocabulary and account information remain until you delete
                the content or request deletion of your account. Deletion may take
                up to 30 additional days to propagate through protected backups.
              </li>
            </ul>
          </PolicySection>

          <PolicySection title="Your choices and deletion requests">
            <p>
              You can delete individual flashcards and books from your FLENVN
              account. Signing out removes locally stored authentication tokens and
              the profile summary; uninstalling the extension removes its Chrome
              storage. To request access to or deletion of account data, contact
              FLENVN through our public <Link href="/support">Support page</Link>.
              We may need to verify that you own the account before completing a
              request.
            </p>
          </PolicySection>

          <PolicySection title="Extension permissions">
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Permission</th>
                    <th className="px-4 py-3 font-semibold">Why it is needed</th>
                  </tr>
                </thead>
                <tbody>
                  {permissions.map((permission) => (
                    <tr key={permission.name} className="border-t border-border">
                      <td className="px-4 py-3 align-top font-medium">
                        {permission.name}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {permission.purpose}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PolicySection>

          <PolicySection title="Security">
            <p>
              FLENVN uses HTTPS for API requests and restricts extension storage
              containing tokens to trusted extension contexts. No method of
              electronic storage or transmission is completely secure, but we use
              reasonable technical and organizational measures to protect data.
            </p>
          </PolicySection>

          <PolicySection title="Changes to this policy">
            <p>
              We may update this policy when the extension, its data practices, or
              legal requirements change. We will publish the revised policy here
              and update the effective date above.
            </p>
          </PolicySection>

          <PolicySection title="Contact">
            <p>
              FLENVN Support handles privacy questions and data deletion requests.
              Contact us through <Link href="/support">https://flenvn.app/support</Link>.
            </p>
          </PolicySection>
        </div>
      </article>
    </main>
  );
}

function PolicySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 [&_a]:font-semibold [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-2">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}
