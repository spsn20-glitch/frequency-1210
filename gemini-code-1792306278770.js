export const metadata = {
  title: '12.10 MHz • BBI ↔ GreNo',
  description: 'Sarthak & Jaai Private Frequency',
  manifest: '/manifest.json',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0d0818',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700;800&family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Caveat:wght@700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0, background: '#090512', color: '#f3e8ff', fontFamily: "'Plus Jakarta Sans', sans-serif", WebkitTapHighlightColor: 'transparent' }}>
        {children}
      </body>
    </html>
  );
}