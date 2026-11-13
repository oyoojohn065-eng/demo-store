import "./globals.css";
import { CartProvider } from "./cart-context";
import Header from "./components/Header";

export const metadata = {
  title: "Demo Store",
  description: "A local online store built with Next.js and PostgreSQL.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          <Header />
          <main>{children}</main>
          <footer className="site-footer">
            <div className="container">
              Demo Store &middot; Built locally with Next.js + PostgreSQL
            </div>
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}
