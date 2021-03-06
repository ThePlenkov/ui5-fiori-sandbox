const proxy = require("http-proxy-middleware");
const fetch = require("node-fetch");
const cheerio = require("cheerio");
const noCache = require("nocache");
const static = require("serve-static");
const fs = require("fs").promises;
const ProxyAgent = require("https-proxy-agent");
const express = require("express");
const url = require("url");

let serveUi5 = oConfig => {
  const app = express();

  let oSettings = oConfig || {};
  var oNeoApp = oSettings.neoApp,
    oDestinations = oSettings.destinations,
    oManifest = oSettings.manifest,
    oAgent = oSettings.agent;

  let cdn = oSettings.cdn || "https://ui5.sap.com";
  if (oSettings.version) {
    cdn += "/" + oSettings.version;
  }

  let homePage = Object.assign(
    {
      pathname: "/test-resources/sap/ushell/shells/sandbox/fioriSandbox.html"
    },
    oSettings.homePage
  );

  const homePageURL = url.format(homePage);

  // change URL parameters
  app.get("/", async ({ query }, res, next) => {
    if (!Object.keys(query).length && Object.keys(homePage.query).length) {
      res.redirect(url.format({ query: homePage.query }));
    } else {
      next();
    }
  });

  // support appconfig
  ["appconfig"]
    .concat(oConfig.staticResources)
    .forEach(sPath => sPath && app.use(`/${sPath}`, static(sPath)));
  // redirect to FLP
  app.get("/", async (req, res) => {
    let flp = await fetch(cdn + homePage.pathname, {
      agent: oAgent
    });
    const $ = cheerio.load(await flp.text());
    if ($("#sap-ui-bootstrap").attr()) {
      $("#sap-ui-bootstrap").attr().src = cdn + "/resources/sap-ui-core.js";
    }
    if ($("#sap-ushell-bootstrap").attr()) {
      $("#sap-ushell-bootstrap").attr().src =
        cdn + "/test-resources/sap/ushell/bootstrap/sandbox.js";
    }
    //standalone script
    $('script[src="../../bootstrap/standalone.js"]').each((index, node) => {
      node.attribs.src =
        cdn + "/test-resources/sap/ushell/bootstrap/standalone.js";
    });

    res.send($.html());
  });

  // no odata cache (including metadata)
  app.use("/sap/opu", noCache());

  let oCdnTarget = {
    target: cdn,
    changeOrigin: true,
    secure: false
  };

  if (oNeoApp && oNeoApp.routes) {
    oNeoApp.routes.forEach(function(oRoute) {
      var oTarget = oRoute.target;
      if (oTarget) {
        // proxy options
        var oOptions = {};

        switch (oTarget.name) {
          case "sapui5":
            Object.assign(oOptions, oCdnTarget);
            break;

          default:
            if (oDestinations && oTarget.name) {
              var oDestination = oDestinations[oTarget.name];
              if (oDestination) {
                oOptions.target = oDestination.target;
                oOptions.changeOrigin = true;
                oOptions.secure = false;
                if (oDestination.useProxy) {
                  oOptions.agent = oAgent;
                }
              }
            }
        }

        // search for destination
        if (oRoute.path && oTarget.entryPath) {
          var oRouteNew = {};
          var sPathOld = "^" + oRoute.path;
          oRouteNew[sPathOld] = oTarget.entryPath;
          oOptions.pathRewrite = oRouteNew;
        }

        oOptions.target && app.use(oRoute.path, proxy(oOptions));
      }
    });
  } else {
    // alternative no neo-app.json logic
    app.use("/resources", proxy(oCdnTarget));
    app.use("/test-resources", proxy(oCdnTarget));
  }

  return app;
};

async function readJSON(path) {
  try {
    let file = await fs.readFile(path);
    return JSON.parse(await file.toString());
  } catch (error) {
    //
  }
}

module.exports = async function({ resources, options }) {
  let config = Object.assign(
    {
      manifest: "webapp/manifest.json",
      neoApp: "neo-app.json",
      destinations: "neo-dest.json"
    },
    options && options.configuration
  );

  const HTTP_PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  const agent = HTTP_PROXY && new ProxyAgent(HTTP_PROXY);

  try {
    return serveUi5(
      Object.assign(
        {},
        options && options.configuration,
        {
          neoApp: await readJSON(config.neoApp),
          destinations: await readJSON(config.destinations),
          manifest: await readJSON(config.manifest)
        },
        agent && { agent }
      )
    );
  } catch (error) {
    console.log(error);
  }
};
