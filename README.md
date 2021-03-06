# Sandbox Fiori Launchpad plugin for UI5 server

This project is a middleware plugin for  [UI5 CLI](https://sap.github.io/ui5-tooling/pages/CLI/)

To use it in your app please perform following actions:

1.  Install the pluing
```
yarn add ui5-fiori-sandbox --dev
```

2. To the end of your ui5.yaml add the following line
```yaml
---
specVersion: "1.0"
kind: extension
type: server-middleware
metadata:
  name: fioriSandbox
middleware:
  path: node_modules/ui5-fiori-sandbox/fioriSandbox.js
```

3. Declare custom middleware in the application yaml section
```yaml
specVersion: "1.0"
metadata:
  name: my/app
type: application
server:
  customMiddleware:
    - name: fioriSandbox
      beforeMiddleware: serveIndex
      configuration:
        version: 1.44.42
        cdn: https://sapui5.eu1.hana.ondemand.com
        homePage:
          # pathname: /test-resources/sap/ushell/shells/sandbox/fioriSandbox.html
          query:
            sap-ui-debug: true
            sap-ui-xx-viewCache: false

```
If cdn and verison are not provided by default it will go to ui5.sap.com (latest)

You can use query section to predefine default URL query parameters for a home page. Also home page itself might be redefined. It's /test-resources/sap/ushell/shells/sandbox/fioriSandbox.html by default.

4. Create a file appconfig/fioriSandboxConfig.json
```json
{
  "services": {
    "LaunchPage": {
      "adapter": {
        "config": {
          "groups": [
            {
              "id": "sample_group",
              "title": "Sample Applications",
              "isPreset": true,
              "isVisible": true,
              "isGroupLocked": false,
              "tiles": [
                {
                  "id": "todefaultapp",
                  "title": "Default Application",
                  "size": "1x1",
                  "tileType": "sap.ushell.ui.tile.StaticTile",
                  "properties": {
                    "chipId": "catalogTile_00",
                    "title": "Test app",
                    "icon": "sap-icon://Fiori2/F0001",
                    "targetURL": "#Test-app"
                  }
                }
              ]
            }
          ]
        }
      }
    },
    "NavTargetResolution": {
      "config": {
        "enableClientSideTargetResolution": true
      }
    },
    "ClientSideTargetResolution": {
      "adapter": {
        "config": {
          "inbounds": {
            "actionTodefaultapp": {
              "semanticObject": "Test",
              "action": "app",
              "title": "Test app",
              "signature": {
                "parameters": {},
                "additionalParameters": "allowed"
              },
              "resolutionResult": {
                "applicationType": "SAPUI5",
                "additionalInformation": "SAPUI5.Component=my.app",
                "url": "/"
              }
            }
          }
        }
      }
    }
  }
}
```

Probably lLater this middleware will be adjusted to generate it automatically.
Please notice that SAPUI5.Component=my.app in your case must have reference to your real component name

Finally running this command you must be able to have a demo launchpad
```
ui5 serve
```



