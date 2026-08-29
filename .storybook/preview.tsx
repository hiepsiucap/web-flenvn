import type { Preview } from "@storybook/nextjs-vite";
import { Geist_Mono, Nunito } from "next/font/google";

import "../app/globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const preview: Preview = {
  decorators: [
    (Story) => (
      <div className={`${nunito.className} ${nunito.variable} ${geistMono.variable}`}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: "app",
      values: [
        { name: "app", value: "var(--background)" },
        { name: "card", value: "var(--card)" },
        { name: "dark", value: "#111322" },
      ],
    },
  },
};

export default preview;
