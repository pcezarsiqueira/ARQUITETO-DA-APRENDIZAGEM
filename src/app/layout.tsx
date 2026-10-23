import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Arquiteto da Aprendizagem",
  description: "Transforme objetivos em caminhos de aprendizagem.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
