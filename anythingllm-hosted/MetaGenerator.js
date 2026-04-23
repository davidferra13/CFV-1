/**
 * @typedef MetaTagDefinition
 * @property {('link'|'meta'|'title')} tag
 * @property {{string:string}|null} props
 * @property {string|null} content
 */

class MetaGenerator {
  name = "MetaGenerator";

  /** @type {MetaGenerator|null} */
  static _instance = null;

  /** @type {MetaTagDefinition[]|null} */
  #customConfig = null;

  #defaultManifest = {
    name: "AnythingLLM",
    short_name: "AnythingLLM",
    display: "standalone",
    orientation: "portrait",
    start_url: "/",
    icons: [
      {
        src: "/favicon.png",
        sizes: "any",
      },
    ],
  };

  constructor() {
    if (MetaGenerator._instance) return MetaGenerator._instance;
    MetaGenerator._instance = this;
  }

  #log(text, ...args) {
    console.log(`\x1b[36m[${this.name}]\x1b[0m ${text}`, ...args);
  }

  #defaultMeta() {
    return [
      {
        tag: "link",
        props: { type: "image/svg+xml", href: "/favicon.png" },
        content: null,
      },
      {
        tag: "title",
        props: null,
        content: "AnythingLLM | Your personal LLM trained on anything",
      },
      {
        tag: "meta",
        props: {
          name: "title",
          content: "AnythingLLM | Your personal LLM trained on anything",
        },
      },
      {
        tag: "meta",
        props: {
          name: "description",
          content: "AnythingLLM | Your personal LLM trained on anything",
        },
      },
      { tag: "meta", props: { property: "og:type", content: "website" } },
      {
        tag: "meta",
        props: { property: "og:url", content: "https://anythingllm.com" },
      },
      {
        tag: "meta",
        props: {
          property: "og:title",
          content: "AnythingLLM | Your personal LLM trained on anything",
        },
      },
      {
        tag: "meta",
        props: {
          property: "og:description",
          content: "AnythingLLM | Your personal LLM trained on anything",
        },
      },
      {
        tag: "meta",
        props: {
          property: "og:image",
          content:
            "https://raw.githubusercontent.com/Mintplex-Labs/anything-llm/master/images/promo.png",
        },
      },
      {
        tag: "meta",
        props: { property: "twitter:card", content: "summary_large_image" },
      },
      {
        tag: "meta",
        props: { property: "twitter:url", content: "https://anythingllm.com" },
      },
      {
        tag: "meta",
        props: {
          property: "twitter:title",
          content: "AnythingLLM | Your personal LLM trained on anything",
        },
      },
      {
        tag: "meta",
        props: {
          property: "twitter:description",
          content: "AnythingLLM | Your personal LLM trained on anything",
        },
      },
      {
        tag: "meta",
        props: {
          property: "twitter:image",
          content:
            "https://raw.githubusercontent.com/Mintplex-Labs/anything-llm/master/images/promo.png",
        },
      },
      { tag: "link", props: { rel: "icon", href: "/favicon.png" } },
      { tag: "link", props: { rel: "apple-touch-icon", href: "/favicon.png" } },
      {
        tag: "meta",
        props: { name: "mobile-web-app-capable", content: "yes" },
      },
      {
        tag: "meta",
        props: { name: "apple-mobile-web-app-capable", content: "yes" },
      },
      {
        tag: "meta",
        props: {
          name: "apple-mobile-web-app-status-bar-style",
          content: "black-translucent",
        },
      },
      { tag: "link", props: { rel: "manifest", href: "/manifest.json" } },
    ];
  }

  #assembleMeta() {
    const output = [];
    for (const tag of this.#customConfig) {
      let htmlString = `<${tag.tag} `;

      if (tag.props !== null) {
        for (const [key, value] of Object.entries(tag.props)) {
          htmlString += `${key}="${value}" `;
        }
      }

      if (tag.content) {
        htmlString += `>${tag.content}</${tag.tag}>`;
      } else {
        htmlString += `>`;
      }
      output.push(htmlString);
    }
    return output.join("\n");
  }

  #mobileViewportPatch() {
    return `
      <style>
        :root {
          --hosted-mobile-vh: 100dvh;
          --hosted-mobile-vw: 100vw;
        }

        html,
        body {
          width: 100%;
          min-height: 100%;
          height: 100%;
          overflow: hidden;
        }

        #root {
          min-height: var(--hosted-mobile-vh);
        }

        @media (max-width: 767px) {
          html,
          body,
          #root {
            width: 100%;
            max-width: 100%;
            overflow-x: hidden;
          }

          body {
            padding-top: env(safe-area-inset-top, 0px);
            padding-bottom: env(safe-area-inset-bottom, 0px);
          }

          #root,
          .h-screen,
          .min-h-screen,
          [class*="h-[100vh]"] {
            height: var(--hosted-mobile-vh) !important;
            min-height: var(--hosted-mobile-vh) !important;
          }

          .w-screen,
          [class*="w-[100vw]"] {
            width: 100vw !important;
            max-width: 100vw !important;
          }

          [class*="fixed top-0 left-0 right-0 z-10"] {
            padding-top: calc(env(safe-area-inset-top, 0px) + 0.5rem);
            min-height: calc(4rem + env(safe-area-inset-top, 0px));
          }
        }
      </style>
      <script>
        (function () {
          function setViewportVars() {
            var viewport = window.visualViewport;
            var height = viewport && viewport.height ? viewport.height : window.innerHeight;
            var width = viewport && viewport.width ? viewport.width : window.innerWidth;

            document.documentElement.style.setProperty("--hosted-mobile-vh", height + "px");
            document.documentElement.style.setProperty("--hosted-mobile-vw", width + "px");
          }

          setViewportVars();
          window.addEventListener("resize", setViewportVars, { passive: true });
          window.addEventListener("orientationchange", setViewportVars, {
            passive: true,
          });

          if (window.visualViewport) {
            window.visualViewport.addEventListener("resize", setViewportVars, {
              passive: true,
            });
            window.visualViewport.addEventListener("scroll", setViewportVars, {
              passive: true,
            });
          }

          document.addEventListener("visibilitychange", function () {
            if (!document.hidden) {
              setViewportVars();
            }
          });
        })();
      </script>
    `;
  }

  #validUrl(faviconUrl = null) {
    if (faviconUrl === null) return "/favicon.png";
    try {
      const url = new URL(faviconUrl);
      return url.toString();
    } catch {
      return "/favicon.png";
    }
  }

  async #fetchConfg() {
    this.#log("fetching custom meta tag settings...");
    const { SystemSettings } = require("../../models/systemSettings");
    const customTitle = await SystemSettings.getValueOrFallback(
      { label: "meta_page_title" },
      null
    );
    const faviconURL = await SystemSettings.getValueOrFallback(
      { label: "meta_page_favicon" },
      null
    );

    if (customTitle === null && faviconURL === null) {
      this.#customConfig = this.#defaultMeta();
    } else {
      this.#customConfig = this.#defaultMeta().map((tag) => {
        if (tag.tag === "link" && tag.props?.rel === "icon") {
          return {
            tag: "link",
            props: { rel: "icon", href: this.#validUrl(faviconURL) },
          };
        }

        if (tag.tag === "title") {
          return {
            tag: "title",
            props: null,
            content:
              customTitle ??
              "AnythingLLM | Your personal LLM trained on anything",
          };
        }

        if (tag.tag === "meta" && tag.props?.name === "title") {
          return {
            tag: "meta",
            props: {
              name: "title",
              content:
                customTitle ??
                "AnythingLLM | Your personal LLM trained on anything",
            },
          };
        }

        if (tag.tag === "meta" && tag.props?.property === "og:title") {
          return {
            tag: "meta",
            props: {
              property: "og:title",
              content:
                customTitle ??
                "AnythingLLM | Your personal LLM trained on anything",
            },
          };
        }

        if (tag.tag === "meta" && tag.props?.property === "twitter:title") {
          return {
            tag: "meta",
            props: {
              property: "twitter:title",
              content:
                customTitle ??
                "AnythingLLM | Your personal LLM trained on anything",
            },
          };
        }

        if (
          tag.tag === "link" &&
          tag.props?.rel === "apple-touch-icon" &&
          faviconURL
        ) {
          return {
            tag: "link",
            props: {
              rel: "apple-touch-icon",
              href: this.#validUrl(faviconURL),
            },
          };
        }

        return tag;
      });
    }

    return this.#customConfig;
  }

  clearConfig() {
    this.#customConfig = null;
  }

  async generate(response, code = 200) {
    if (this.#customConfig === null) await this.#fetchConfg();
    response.status(code).send(`
       <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
            ${this.#assembleMeta()}
            ${this.#mobileViewportPatch()}
            <script type="module" crossorigin src="/index.js"></script>
            <link rel="stylesheet" href="/index.css">
          </head>
          <body>
            <div id="root" class="h-screen"></div>
          </body>
        </html>`);
  }

  async generateManifest(response) {
    try {
      const { SystemSettings } = require("../../models/systemSettings");
      const manifestName = await SystemSettings.getValueOrFallback(
        { label: "meta_page_title" },
        "AnythingLLM"
      );
      const faviconURL = await SystemSettings.getValueOrFallback(
        { label: "meta_page_favicon" },
        null
      );

      let iconUrl = "/favicon.png";
      if (faviconURL) {
        try {
          new URL(faviconURL);
          iconUrl = faviconURL;
        } catch {
          iconUrl = "/favicon.png";
        }
      }

      const manifest = {
        name: manifestName,
        short_name: manifestName,
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          {
            src: iconUrl,
            sizes: "any",
          },
        ],
      };

      response.type("application/json").status(200).send(manifest).end();
    } catch (error) {
      this.#log(`error generating manifest: ${error.message}`, error);
      response
        .type("application/json")
        .status(200)
        .send(this.#defaultManifest)
        .end();
    }
  }
}

module.exports.MetaGenerator = MetaGenerator;
