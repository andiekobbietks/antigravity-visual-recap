import "@code-hike/mdx/dist/index.css";
import "../styles/global.css";

function MyApp({ Component, pageProps }) {
  return (
    <div className="app-container">
      <Component {...pageProps} />
    </div>
  );
}

export default MyApp;
