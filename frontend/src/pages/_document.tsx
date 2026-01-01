import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" type="image/svg+xml" href="/scorepal-logo-icon-only.svg" />
        <link rel="alternate icon" href="/scorepal-logo-icon-only.svg" />
        <link rel="apple-touch-icon" href="/scorepal-logo-icon-only.svg" />
        <meta name="theme-color" content="#1683B3" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}


