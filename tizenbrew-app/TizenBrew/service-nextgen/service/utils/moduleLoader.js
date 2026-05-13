const { readConfig } = require("./configuration.js");
const fetch = require("node-fetch");

function loadModules() {
  const config = readConfig();
  const modules = config.modules;

  const modulePromises = modules.map((module) => {
    // Handle GitHub repos specially
    const isGithub = module.startsWith("gh/");
    let fetchUrl;

    if (isGithub) {
      // Format: gh/username/repo -> fetch raw from GitHub
      const parts = module.substring(3).split("/");
      if (parts.length < 2) {
        return Promise.resolve({
          appName: "Invalid Repo",
          name: module,
          fullName: module,
          appPath: "",
          keys: [],
          moduleType: "gh",
          packageType: "app",
          description: `Invalid GitHub format. Use: gh/username/repo (case-sensitive!)`,
        });
      }
      // Use jsDelivr CDN for GitHub: gh/owner/repo -> https://cdn.jsdelivr.net/gh/owner/repo
      fetchUrl = `https://cdn.jsdelivr.net/gh/${parts[0]}/${parts[1]}@latest/package.json?v=${Date.now()}`;
    } else {
      fetchUrl = `https://cdn.jsdelivr.net/${module}/package.json?v=${Date.now()}`;
    }

    return fetch(fetchUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((moduleJson) => {
        const splitData = isGithub
          ? module.substring(3).split("/")
          : [
              module.substring(0, module.indexOf("/")),
              module.substring(module.indexOf("/") + 1),
            ];

        const moduleMetadata = {
          name: splitData[splitData.length - 1], // Get last part (repo name)
          type: splitData[0],
        };

        let moduleData;

        if (moduleJson.packageType === "app") {
          moduleData = {
            fullName: module,
            appName: moduleJson.appName,
            version: moduleJson.version,
            name: moduleMetadata.name,
            appPath: isGithub
              ? `http://127.0.0.1:8081/module/${encodeURIComponent(module)}/${moduleJson.appPath}?v=${Date.now()}`
              : `http://127.0.0.1:8081/module/${encodeURIComponent(module)}/${moduleJson.appPath}?v=${Date.now()}`,
            keys: moduleJson.keys ? moduleJson.keys : [],
            moduleType: moduleMetadata.type,
            packageType: moduleJson.packageType,
            description: moduleJson.description,
            serviceFile: moduleJson.serviceFile,
          };
        } else if (moduleJson.packageType === "mods") {
          moduleData = {
            fullName: module,
            appName: moduleJson.appName,
            version: moduleJson.version,
            name: moduleMetadata.name,
            appPath: moduleJson.websiteURL,
            keys: moduleJson.keys ? moduleJson.keys : [],
            moduleType: moduleMetadata.type,
            packageType: moduleJson.packageType,
            description: moduleJson.description,
            serviceFile: moduleJson.serviceFile,
            tizenAppId: moduleJson.tizenAppId,
            mainFile: moduleJson.main,
            evaluateScriptOnDocumentStart:
              moduleJson.evaluateScriptOnDocumentStart,
          };
        } else
          return {
            appName: "Unknown Module",
            name: moduleMetadata.name,
            fullName: module,
            appPath: "",
            keys: [],
            moduleType: moduleMetadata.type,
            packageType: "app",
            description: `Unknown module type. Check package.json packageType field.`,
          };

        return moduleData;
      })
      .catch((e) => {
        console.error(`Failed to load module ${module}:`, e);

        const splitData = isGithub
          ? module.substring(3).split("/")
          : [
              module.substring(0, module.indexOf("/")),
              module.substring(module.indexOf("/") + 1),
            ];

        const moduleMetadata = {
          name: splitData[splitData.length - 1],
          type: splitData[0],
        };

        return {
          appName: "Failed to Load",
          name: moduleMetadata.name,
          fullName: module,
          appPath: "",
          keys: [],
          moduleType: moduleMetadata.type,
          packageType: "app",
          description: `Failed to load module: ${module}. Ensure repo exists and package.json is at root.`,
        };
      });
  });

  return Promise.all(modulePromises).then((modules) => {
    return modules;
  });
}

module.exports = loadModules;
