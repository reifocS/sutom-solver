import Head from "next/head";
import "../styles/globals.css";

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Sutom and tusmo solver</title>
        <meta
          name="twitter:title"
          content="Sutom, tusmo solver"
        />
        <meta
          property="og:description"
          content="A solver for motus like games"
        />
      </Head>
      <Component {...pageProps} />;
    </>
  );
}

export default MyApp;
