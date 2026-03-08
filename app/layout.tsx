import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "./components/theme-provider";
import { Sidebar } from "./components/Sidebar";

export const metadata: Metadata = {
  title: "Bag Shop POS",
  description: "Simple POS with sales, returns, and receipt printing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light">
      <body className="antialiased">
        <ThemeProvider>
          <div className="app-layout">
            <Sidebar />
            <div className="main-area">
              <main className="main-content">{children}</main>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
